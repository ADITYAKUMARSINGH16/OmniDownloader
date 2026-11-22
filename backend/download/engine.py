import os
import json
import asyncio
import time
import logging
import re
from typing import Optional, Callable, Dict, Any
from datetime import datetime, timezone

import httpx
import yt_dlp
import yt_dlp.utils
import shutil
import glob
from sqlalchemy import select, update

from core.config import settings
from core.database import get_scoped_session, AsyncSessionLocal
from core.security import sanitize_filename
from models.database import Download, DownloadHistory, DownloadStatus, ContentType
from models.schemas import FormatModel
from extractors.base import ExtractorRegistry

logger = logging.getLogger(__name__)


def _cleanup_temp_files(download_id: str, output_path: Optional[str] = None):
    """Clean up lingering chunk directories and transient files on download cancellation."""
    seg_dir = os.path.join(settings.temp_dir, f"segmented_{download_id}")
    if os.path.isdir(seg_dir):
        try:
            shutil.rmtree(seg_dir, ignore_errors=True)
        except Exception:
            pass

    pattern = os.path.join(settings.temp_dir, f"*{download_id}*")
    for f in glob.glob(pattern):
        try:
            if os.path.isfile(f):
                os.remove(f)
            elif os.path.isdir(f):
                shutil.rmtree(f, ignore_errors=True)
        except Exception:
            pass

    if output_path:
        for ext in [".part", ".ytdl", ".tmp"]:
            part_file = f"{output_path}{ext}"
            if os.path.isfile(part_file):
                try:
                    os.remove(part_file)
                except Exception:
                    pass


def _get_ws_manager():
    from api.websocket import manager
    return manager


def parse_time_str(val: Optional[Any]) -> Optional[float]:
    """Parse time representations (seconds, 'MM:SS', 'HH:MM:SS') into float seconds."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val >= 0 else None
    s = str(val).strip()
    if not s:
        return None
    try:
        f = float(s)
        return f if f >= 0 else None
    except ValueError:
        pass
    parts = s.split(":")
    try:
        if len(parts) == 2:
            m, sec = parts
            total = int(m) * 60 + float(sec)
            return total if total >= 0 else None
        elif len(parts) == 3:
            h, m, sec = parts
            total = int(h) * 3600 + int(m) * 60 + float(sec)
            return total if total >= 0 else None
    except ValueError:
        return None
    return None


class ProgressCallback:
    def __init__(self, download_id: str, callback: Optional[Callable] = None):
        self.download_id = download_id
        self.callback = callback

    async def __call__(
        self,
        progress: float,
        downloaded: int,
        total: int,
        speed: int,
        eta: int,
    ) -> None:
        if self.callback:
            if asyncio.iscoroutinefunction(self.callback):
                await self.callback(self.download_id, progress, downloaded, total, speed, eta)
            else:
                self.callback(self.download_id, progress, downloaded, total, speed, eta)


class DownloadEngine:
    def __init__(self):
        self.active_downloads: Dict[str, asyncio.Task] = {}
        self.progress_callbacks: Dict[str, ProgressCallback] = {}
        self._active_processes: Dict[str, Any] = {}

    async def start_download(
        self,
        download_id: str,
        url: str,
        format_model: Optional[FormatModel] = None,
        output_path: Optional[str] = None,
        callback: Optional[Callable] = None,
    ) -> str:
        # Prevent starting a duplicate worker if one is already actively running
        if download_id in self.active_downloads:
            existing = self.active_downloads[download_id]
            if not existing.done():
                logger.warning(f"Download {download_id} is already actively running! Refusing to spawn duplicate worker.")
                return download_id

        self.progress_callbacks[download_id] = ProgressCallback(download_id, callback)
        task = asyncio.create_task(
            self._download_task(download_id, url, format_model, output_path)
        )
        self.active_downloads[download_id] = task
        return download_id

    async def pause_download(self, download_id: str) -> None:
        proc = self._active_processes.pop(download_id, None)
        if proc and proc.returncode is None:
            try:
                proc.terminate()
            except Exception:
                pass

        task = self.active_downloads.pop(download_id, None)
        if task:
            try:
                res = task.cancel()
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                pass
        
        try:
            async with get_scoped_session() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(status=DownloadStatus.PAUSED)
                )
                await session.execute(stmt)
        except Exception as e:
            logger.debug(f"DB update in pause_download: {e}")

        pause_msg = {
            "type": "progress",
            "download_id": download_id,
            "status": "paused",
        }
        try:
            await _get_ws_manager().send_progress(download_id, pause_msg)
            await _get_ws_manager().broadcast(pause_msg)
        except Exception:
            pass

    async def cancel_download(self, download_id: str) -> None:
        proc = self._active_processes.pop(download_id, None)
        if proc and proc.returncode is None:
            try:
                proc.terminate()
            except Exception:
                pass

        task = self.active_downloads.pop(download_id, None)
        if task:
            try:
                res = task.cancel()
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                pass

        self.progress_callbacks.pop(download_id, None)

        output_path = None
        try:
            async with get_scoped_session() as session:
                res = await session.execute(select(Download).where(Download.id == download_id))
                dl = res.scalar_one_or_none()
                if dl:
                    output_path = dl.output_path
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(status=DownloadStatus.CANCELLED)
                )
                await session.execute(stmt)
        except Exception as e:
            logger.debug(f"DB update in cancel_download: {e}")

        # Clean up partial chunks and temporary files
        _cleanup_temp_files(download_id, output_path)

        cancel_msg = {
            "type": "progress",
            "download_id": download_id,
            "status": "cancelled",
        }
        try:
            await _get_ws_manager().send_progress(download_id, cancel_msg)
            await _get_ws_manager().broadcast(cancel_msg)
        except Exception:
            pass

    async def resume_or_start(self, download_id: str) -> None:
        async with get_scoped_session() as session:
            result = await session.execute(select(Download).where(Download.id == download_id))
            download = result.scalar_one_or_none()
            if not download:
                raise ValueError(f"Download record '{download_id}' not found in database")
            url = download.url
            format_model = None
            if download.format_id:
                is_image = download.content_type == ContentType.IMAGE or (download.extension in ["jpg", "jpeg", "png", "webp", "gif"])
                is_audio = (download.content_type == ContentType.AUDIO or (download.extension in ["mp3", "m4a", "wav", "flac", "aac", "opus"])) and not is_image
                is_video = download.content_type == ContentType.VIDEO or (not is_audio and not is_image)
                default_ext = "jpg" if is_image else ("m4a" if is_audio else "mp4")
                format_model = FormatModel(
                    format_id=download.format_id,
                    quality=download.format or "default",
                    extension=download.extension or default_ext,
                    filesize=download.file_size or None,
                    is_video=is_video,
                    is_audio=is_audio,
                )
            output_path = download.output_path

        await self.start_download(download_id, url, format_model, output_path)

    async def _download_task(
        self,
        download_id: str,
        url: str,
        format_model: Optional[FormatModel] = None,
        output_path: Optional[str] = None,
    ) -> None:
        raw_target = output_path if output_path else settings.download_dir
        if raw_target and (os.path.isfile(raw_target) or any(raw_target.lower().endswith(f".{e}") for e in ["mp4", "mkv", "mp3", "m4a", "webm", "jpg", "png", "jpeg", "webp", "zip", "tar", "gz"])):
            raw_target = os.path.dirname(raw_target)

        try:
            from core.security import sanitize_folder_path
            target_dir = sanitize_folder_path(raw_target)
        except Exception:
            target_dir = settings.download_dir

        extra_meta = {}
        try:
            async with get_scoped_session() as session:
                res = await session.execute(select(Download).where(Download.id == download_id))
                dl_record = res.scalar_one_or_none()
                if dl_record and dl_record.extra_metadata:
                    try:
                        extra_meta = json.loads(dl_record.extra_metadata)
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"DB load extra_meta notice: {e}")

        subfolder = extra_meta.get("subfolder")
        if subfolder:
            from core.security import sanitize_filename
            safe_sub = sanitize_filename(str(subfolder).strip())
            if safe_sub:
                target_dir = os.path.join(target_dir, safe_sub)

        try:
            os.makedirs(target_dir, exist_ok=True)
            os.makedirs(settings.temp_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create target_dir '{target_dir}': {e}")
            raise

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        try:
            async with get_scoped_session() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(
                        status=DownloadStatus.DOWNLOADING,
                        started_at=now,
                        progress=0,
                        downloaded_size=0,
                    )
                )
                await session.execute(stmt)
        except Exception as err:
            logger.debug(f"DB downloading status error: {err}")

        start_msg = {
            "type": "progress",
            "download_id": download_id,
            "status": "downloading",
            "progress": 0.0,
            "downloaded": 0,
            "downloaded_size": 0,
            "speed": 0,
            "eta": 0,
        }
        try:
            await _get_ws_manager().send_progress(download_id, start_msg)
            await _get_ws_manager().broadcast(start_msg)
        except Exception:
            pass

        try:

            speed_limit_kbps = extra_meta.get("speed_limit_kbps")
            if not speed_limit_kbps:
                try:
                    from models.database import Settings as DBSettings
                    async with get_scoped_session() as session:
                        setting_res = await session.execute(
                            select(DBSettings).where(DBSettings.key == "max_download_speed")
                        )
                        s_row = setting_res.scalar_one_or_none()
                        if s_row and s_row.value:
                            speed_limit_kbps = json.loads(s_row.value)
                except Exception:
                    pass

            extractor = ExtractorRegistry.get_extractor(url)
            is_generic = extractor is not None and extractor.name == "generic"
            is_hls = (
                (extractor is not None and extractor.name == "hls")
                or (format_model and format_model.protocol == "m3u8")
                or (".m3u8" in url.lower().split("?")[0])
            )

            # Check if format_id or the URL itself is a direct HTTP/HTTPS media/image URL
            target_download_url = None
            if format_model and format_model.format_id and (
                format_model.format_id.startswith("http://") or format_model.format_id.startswith("https://")
            ):
                from core.security import validate_url, check_ssrf
                valid_fmt = validate_url(format_model.format_id)
                await check_ssrf(valid_fmt)
                target_download_url = valid_fmt

            clean_url_path = (target_download_url or url).lower().split("?")[0].rstrip("/")
            is_direct_media = (
                any(clean_url_path.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".exe", ".dmg", ".apk", ".iso", ".mp4", ".mp3", ".wav", ".m4a"])
                or ("i.redd.it" in url.lower() or "preview.redd.it" in url.lower() or "i.pinimg.com" in (target_download_url or url).lower())
            )

            is_torrent = (
                url.lower().startswith("magnet:?")
                or (extractor is not None and extractor.name == "torrent")
                or bool(extra_meta.get("is_torrent"))
                or bool(extra_meta.get("torrent_bytes"))
                or url.lower().split("?")[0].endswith(".torrent")
            )

            if is_torrent:
                await self._download_torrent(
                    download_id, url, target_dir, extra_meta=extra_meta
                )
            elif is_hls or (target_download_url and ".m3u8" in target_download_url.lower().split("?")[0]):
                dl_url = target_download_url or url
                await self._download_hls(
                    download_id, dl_url, target_dir, format_model=format_model, extra_meta=extra_meta
                )
            elif is_generic or target_download_url or is_direct_media:
                dl_url = target_download_url or url
                await self._download_generic(download_id, dl_url, target_dir, speed_limit_kbps=speed_limit_kbps, extra_meta=extra_meta)
            else:
                effective_ytdl_url = url
                if extractor and extractor.name == "spotify":
                    matched = extra_meta.get("matched_url")
                    if not matched:
                        try:
                            s_info = await extractor.analyze(url)
                            matched = s_info.metadata.get("matched_url")
                            if s_info.metadata.get("cover_art"):
                                extra_meta["cover_art"] = s_info.metadata["cover_art"]
                            if s_info.metadata.get("artist"):
                                extra_meta["artist"] = s_info.metadata["artist"]
                            if s_info.metadata.get("album"):
                                extra_meta["album"] = s_info.metadata["album"]
                        except Exception as s_err:
                            logger.warning(f"Spotify live stream match notice: {s_err}")
                    if matched:
                        effective_ytdl_url = matched
                    extra_meta["audio_only"] = True
                    extra_meta.setdefault("audio_format", "mp3")
                    extra_meta.setdefault("audio_bitrate", "320k")

                await self._download_ytdlp(
                    download_id,
                    effective_ytdl_url,
                    format_model,
                    target_dir,
                    extra_meta=extra_meta,
                    speed_limit_kbps=speed_limit_kbps,
                )

            # Mark completed
            completed_now = datetime.now(timezone.utc).replace(tzinfo=None)
            async with get_scoped_session() as session:
                res = await session.execute(select(Download).where(Download.id == download_id))
                dl = res.scalar_one_or_none()
                if dl:
                    dl.status = DownloadStatus.COMPLETED
                    dl.progress = 100
                    dl.completed_at = completed_now
                    # Always sync downloaded_size with the actual file_size on completion.
                    # The progress hook may report partial/stream-only sizes during merging.
                    final_size = int(round(dl.file_size or dl.downloaded_size or 0))
                    dl.downloaded_size = final_size
                    dl.file_size = final_size

                    # Add history item
                    history = DownloadHistory(
                        id=dl.id,
                        url=dl.url,
                        source=dl.source,
                        title=dl.title,
                        filename=dl.filename,
                        file_size=final_size,
                        format=dl.format,
                        extension=dl.extension,
                        content_type=dl.content_type,
                        status=DownloadStatus.COMPLETED,
                        output_path=dl.output_path,
                        thumbnail=dl.thumbnail,
                        duration=dl.duration,
                        extra_metadata=dl.extra_metadata,
                        completed_at=completed_now,
                    )
                    session.add(history)

            progress_msg = {
                "type": "progress",
                "download_id": download_id,
                "status": "completed",
                "progress": 100.0,
            }
            await _get_ws_manager().send_progress(download_id, progress_msg)
            await _get_ws_manager().broadcast(progress_msg)

        except asyncio.CancelledError:
            logger.info(f"Download {download_id} was cancelled/paused")
            _cleanup_temp_files(download_id)
            raise
        except Exception as e:
            clean_err = re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', str(e)).strip()
            logger.error(f"Download {download_id} failed: {clean_err}")
            try:
                async with get_scoped_session() as session:
                    stmt = (
                        update(Download)
                        .where(Download.id == download_id)
                        .values(status=DownloadStatus.FAILED, error=clean_err)
                    )
                    await session.execute(stmt)
            except Exception as dberr:
                logger.debug(f"DB failed status update error: {dberr}")

            fail_msg = {
                "type": "progress",
                "download_id": download_id,
                "status": "failed",
                "error": clean_err,
            }
            try:
                await _get_ws_manager().send_progress(download_id, fail_msg)
                await _get_ws_manager().broadcast(fail_msg)
            except Exception:
                pass
        finally:
            self.active_downloads.pop(download_id, None)
            self.progress_callbacks.pop(download_id, None)
            try:
                from queue.manager import queue_manager
                await queue_manager.on_download_finished(download_id)
            except Exception as qerr:
                logger.error(f"Error notifying queue_manager on finished: {qerr}")

    async def _download_hls(
        self,
        download_id: str,
        stream_url: str,
        target_dir: str,
        format_model: Optional[FormatModel] = None,
        extra_meta: Optional[dict] = None,
    ) -> None:
        """Capture and assemble HLS (.m3u8) chunks using FFmpeg into a complete MP4 or audio file."""
        dl_title = None
        try:
            async with get_scoped_session() as session:
                res = await session.execute(select(Download).where(Download.id == download_id))
                dl_record = res.scalar_one_or_none()
                if dl_record and dl_record.title:
                    dl_title = dl_record.title
        except Exception as e:
            logger.debug(f"DB load dl_title in _download_hls error: {e}")

        is_audio_only = extra_meta and extra_meta.get("audio_only")
        audio_fmt = (extra_meta and extra_meta.get("audio_format")) or "mp3"

        ext = audio_fmt if is_audio_only else "mp4"
        clean_title = sanitize_filename(dl_title or f"HLS_Stream_{download_id}")[:120]
        final_filename = f"{clean_title} [{download_id}].{ext}"
        final_path = os.path.join(target_dir, final_filename)

        try:
            async with get_scoped_session() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(
                        status=DownloadStatus.DOWNLOADING,
                        output_path=final_path,
                        filename=final_filename,
                        extension=ext,
                    )
                )
                await session.execute(stmt)
        except Exception as e:
            logger.debug(f"DB update output_path in _download_hls error: {e}")

        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-nostats",
            "-progress", "pipe:1",
            "-reconnect", "1",
            "-reconnect_streamed", "1",
            "-reconnect_delay_max", "5",
        ]

        # Attach custom headers (User-Agent, Referer) from browser stream sniffer
        extra_headers = (extra_meta and (extra_meta.get("headers") or extra_meta.get("http_headers"))) or {}
        if extra_headers:
            header_str = "".join(f"{k}: {v}\r\n" for k, v in extra_headers.items() if v)
            if header_str:
                cmd.extend(["-headers", header_str])

        cmd.extend(["-i", stream_url])

        if is_audio_only:
            if audio_fmt == "mp3":
                cmd.extend(["-vn", "-c:a", "libmp3lame", "-q:a", "2"])
            else:
                cmd.extend(["-vn", "-c:a", "copy"])
        else:
            cmd.extend(["-c", "copy", "-bsf:a", "aac_adtstoasc"])

        cmd.append(final_path)

        logger.info(f"Starting HLS FFmpeg capture for {download_id}: {' '.join(cmd)}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._active_processes[download_id] = process

        last_update_time = time.time()
        last_progress_pct = 5.0
        total_size_bytes = 0
        stderr_lines = []

        async def read_progress():
            nonlocal last_update_time, last_progress_pct, total_size_bytes
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="ignore").strip()
                if decoded.startswith("total_size="):
                    try:
                        total_size_bytes = int(decoded.split("=")[-1].strip())
                    except ValueError:
                        pass
                elif decoded.startswith("out_time="):
                    now = time.time()
                    if now - last_update_time >= 0.5:
                        last_update_time = now
                        last_progress_pct = min(last_progress_pct + 2.5, 95.0)

                        try:
                            async with get_scoped_session() as session:
                                stmt = (
                                    update(Download)
                                    .where(Download.id == download_id)
                                    .values(
                                        progress=last_progress_pct,
                                        downloaded_size=total_size_bytes,
                                        speed=2_500_000,
                                    )
                                )
                                await session.execute(stmt)
                        except Exception as dberr:
                            logger.debug(f"DB read_progress update error: {dberr}")

                        msg = {
                            "type": "progress",
                            "download_id": download_id,
                            "status": "downloading",
                            "progress": round(last_progress_pct, 1),
                            "downloaded": total_size_bytes,
                            "total": 0,
                            "speed": 2_500_000,
                            "eta": 0,
                        }
                        await _get_ws_manager().send_progress(download_id, msg)
                        await _get_ws_manager().broadcast(msg)

        async def read_stderr():
            if not process.stderr:
                return
            while True:
                try:
                    line = await process.stderr.readline()
                    if not line:
                        break
                    # If mocked in unit tests without explicit bytes return value
                    if not isinstance(line, (bytes, str)):
                        break
                    decoded = line.decode("utf-8", errors="ignore") if isinstance(line, bytes) else str(line)
                    stderr_lines.append(decoded)
                    if len(stderr_lines) > 50:
                        stderr_lines.pop(0)
                except Exception:
                    break

        try:
            await asyncio.gather(read_progress(), read_stderr(), process.wait())
        except asyncio.CancelledError:
            try:
                process.terminate()
                await asyncio.wait_for(process.wait(), timeout=2.0)
            except Exception:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass
            raise
        finally:
            self._active_processes.pop(download_id, None)
            if process.returncode is None:
                try:
                    process.terminate()
                    await asyncio.wait_for(process.wait(), timeout=2.0)
                except Exception:
                    try:
                        process.kill()
                        await process.wait()
                    except Exception:
                        pass

        if process.returncode != 0:
            err_text = "".join(stderr_lines).strip()
            logger.error(f"FFmpeg HLS capture failed with code {process.returncode}: {err_text}")
            raise Exception(f"FFmpeg stream assembly failed: {err_text[-300:] if err_text else 'Unknown error'}")

        actual_size = os.path.getsize(final_path) if os.path.exists(final_path) else total_size_bytes

        if is_audio_only and final_path and os.path.isfile(final_path):
            try:
                auto_tag = True
                embed_art = True
                from models.database import Settings as DBSettings
                async with get_scoped_session() as session:
                    tag_res = await session.execute(
                        select(DBSettings).where(DBSettings.key == "auto_tag_audio")
                    )
                    t_row = tag_res.scalar_one_or_none()
                    if t_row and t_row.value:
                        auto_tag = json.loads(t_row.value)

                    art_res = await session.execute(
                        select(DBSettings).where(DBSettings.key == "embed_album_art")
                    )
                    a_row = art_res.scalar_one_or_none()
                    if a_row and a_row.value:
                        embed_art = json.loads(a_row.value)

                if auto_tag:
                    from services.tagger import audio_tagger
                    await audio_tagger.tag_audio_file(
                        file_path=final_path,
                        metadata={"title": dl_title or clean_title},
                        thumbnail_url=extra_meta.get("thumbnail") if extra_meta else None,
                        embed_art=embed_art,
                    )
                    if os.path.exists(final_path):
                        actual_size = os.path.getsize(final_path)
            except Exception as tag_err:
                logger.debug(f"HLS audio tagging notice: {tag_err}")

        try:
            async with get_scoped_session() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(
                        file_size=actual_size,
                        downloaded_size=actual_size,
                    )
                )
                await session.execute(stmt)
        except Exception as err:
            logger.debug(f"DB update file_size in _download_hls error: {err}")

    async def _download_torrent(
        self,
        download_id: str,
        url: str,
        target_dir: str,
        extra_meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        from services.aria2 import aria2_service
        from core.exceptions import ExtractionError

        is_ready = await aria2_service.ensure_daemon(target_dir)
        if not is_ready:
            raise ExtractionError(
                "BitTorrent engine (aria2c) is not detected on your system. "
                "Please install aria2 via 'winget install aria2.aria2' or 'scoop install aria2' and restart OmniDownloader."
            )

        torrent_bytes = (extra_meta or {}).get("torrent_bytes")
        gid = None
        if torrent_bytes:
            import base64
            raw_bytes = base64.b64decode(torrent_bytes)
            gid = await aria2_service.add_torrent(raw_bytes, target_dir)
        else:
            gid = await aria2_service.add_magnet(url, target_dir)

        logger.info(f"Enqueued torrent in aria2: download_id={download_id}, gid={gid}")

        try:
            while True:
                if download_id not in self.active_downloads:
                    logger.info(f"Download {download_id} cancelled or paused during torrent download.")
                    try:
                        await aria2_service.pause(gid)
                    except Exception:
                        pass
                    raise asyncio.CancelledError()

                await asyncio.sleep(0.5)
                try:
                    status_info = await aria2_service.get_status(gid)
                except Exception as e:
                    logger.debug(f"Aria2 tellStatus error for {gid}: {e}")
                    break

                state = status_info.get("status")
                total = int(status_info.get("totalLength", 0))
                completed = int(status_info.get("completedLength", 0))
                download_speed = int(status_info.get("downloadSpeed", 0))
                num_seeders = int(status_info.get("numSeeders", 0))
                files = status_info.get("files", [])
                primary_file = files[0].get("path", "") if files else ""
                filename = os.path.basename(primary_file) if primary_file else f"{download_id}.torrent_data"

                progress = round((completed / total) * 100, 1) if total > 0 else 0.0
                eta = (
                    int((total - completed) / download_speed)
                    if download_speed > 0 and total > completed
                    else 0
                )

                # Broadcast progress
                progress_msg = {
                    "type": "progress",
                    "download_id": download_id,
                    "status": "downloading" if state == "active" else state,
                    "progress": progress,
                    "downloaded": completed,
                    "total": total,
                    "speed": download_speed,
                    "eta": eta,
                    "seeders": num_seeders,
                }
                await _get_ws_manager().send_progress(download_id, progress_msg)
                await _get_ws_manager().broadcast(progress_msg)

                # Update DB
                try:
                    async with get_scoped_session() as session:
                        stmt = (
                            update(Download)
                            .where(Download.id == download_id)
                            .values(
                                downloaded_size=completed,
                                file_size=total,
                                progress=int(progress),
                                speed=download_speed,
                                eta=eta,
                                filename=filename,
                                output_path=primary_file or os.path.join(target_dir, filename),
                            )
                        )
                        await session.execute(stmt)
                        await session.commit()
                except Exception as err:
                    logger.debug(f"DB torrent progress update error: {err}")

                cb = self.progress_callbacks.get(download_id)
                if cb:
                    if asyncio.iscoroutinefunction(cb):
                        await cb(progress, completed, total, download_speed, eta)
                    else:
                        cb(progress, completed, total, download_speed, eta)

                if state == "complete":
                    logger.info(f"Torrent completed: {download_id}")
                    break
                elif state in ["error", "removed"]:
                    error_msg = status_info.get("errorMessage", f"Aria2 download ended with status '{state}'")
                    raise ExtractionError(error_msg)
        except asyncio.CancelledError:
            try:
                await aria2_service.pause(gid)
            except Exception:
                pass
            raise

    async def _download_generic(
        self,
        download_id: str,
        url: str,
        target_dir: str,
        speed_limit_kbps: Optional[int] = None,
        extra_meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        custom_headers = (extra_meta and (extra_meta.get("headers") or extra_meta.get("http_headers"))) or {}
        # Check if segmented turbo download is enabled
        enable_segmented = True
        num_connections = 8
        try:
            from models.database import Settings as DBSettings
            async with get_scoped_session() as session:
                seg_res = await session.execute(
                    select(DBSettings).where(DBSettings.key == "enable_segmented_download")
                )
                seg_row = seg_res.scalar_one_or_none()
                if seg_row and seg_row.value:
                    enable_segmented = json.loads(seg_row.value)

                conn_res = await session.execute(
                    select(DBSettings).where(DBSettings.key == "segmented_connections")
                )
                conn_row = conn_res.scalar_one_or_none()
                if conn_row and conn_row.value:
                    num_connections = int(json.loads(conn_row.value))
        except Exception:
            pass

        req_headers = {
            "User-Agent": settings.user_agent,
            "Accept": "*/*",
            **custom_headers,
        }

        if enable_segmented:
            try:
                from download.segmented import SegmentedDownloader
                cb = self.progress_callbacks.get(download_id)
                seg_dl = SegmentedDownloader(connections=num_connections)

                dl_title = None
                dl_ext = None
                async with get_scoped_session() as session:
                    res = await session.execute(select(Download).where(Download.id == download_id))
                    dl_record = res.scalar_one_or_none()
                    if dl_record:
                        dl_title = dl_record.title
                        dl_ext = dl_record.extension or dl_record.format

                pref_filename = None
                if dl_title:
                    clean_title = sanitize_filename(dl_title)[:120]
                    ext = dl_ext.lstrip(".") if dl_ext else "bin"
                    pref_filename = f"{clean_title} [{download_id}].{ext}"

                await seg_dl.download(
                    download_id=download_id,
                    url=url,
                    target_dir=target_dir,
                    filename=pref_filename,
                    connections=num_connections,
                    speed_limit_kbps=speed_limit_kbps,
                    progress_callback=cb,
                    headers=req_headers,
                )
                return
            except Exception as e:
                logger.warning(f"Segmented turbo download failed ({e}), falling back to single stream")

        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True, headers=req_headers) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))

                # Determine filename - check if title was saved in DB
                dl_title = None
                dl_ext = None
                async with get_scoped_session() as session:
                    res = await session.execute(select(Download).where(Download.id == download_id))
                    dl_record = res.scalar_one_or_none()
                    if dl_record:
                        dl_title = dl_record.title
                        dl_ext = dl_record.extension or dl_record.format

                content_type_header = response.headers.get("content-type", "").lower()
                detected_ext = None
                if "video/mp4" in content_type_header:
                    detected_ext = "mp4"
                elif "image/gif" in content_type_header:
                    detected_ext = "gif"
                elif "image/png" in content_type_header:
                    detected_ext = "png"
                elif "image/jpeg" in content_type_header:
                    detected_ext = "jpg"
                elif "image/webp" in content_type_header:
                    detected_ext = "webp"
                elif dl_ext and dl_ext.isalnum():
                    detected_ext = dl_ext.lower()

                if dl_title:
                    clean_title = sanitize_filename(dl_title)[:120]
                    ext = detected_ext or (dl_ext.lstrip(".") if dl_ext else "bin")
                    filename = f"{clean_title} [{download_id}].{ext}"
                else:
                    filename = f"{download_id}.bin"
                    cd = response.headers.get("content-disposition", "")
                    if "filename=" in cd:
                        filename = sanitize_filename(cd.split("filename=")[-1].strip('"\''))
                    else:
                        url_path = url.split("?")[0].rstrip("/")
                        base = os.path.basename(url_path)
                        if base and "." in base:
                            filename = sanitize_filename(base)
                        elif detected_ext:
                            filename = f"{download_id}.{detected_ext}"

                file_path = os.path.join(target_dir, filename)
                downloaded = 0
                start_time = time.time()
                last_update_time = start_time

                with open(file_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        if download_id not in self.active_downloads:
                            logger.info(f"Download {download_id} cancelled or paused during generic stream.")
                            raise asyncio.CancelledError()

                        f.write(chunk)
                        downloaded += len(chunk)

                        if speed_limit_kbps and speed_limit_kbps > 0:
                            max_bytes_per_sec = speed_limit_kbps * 1024
                            expected_elapsed = downloaded / max_bytes_per_sec
                            actual_elapsed = time.time() - start_time
                            if expected_elapsed > actual_elapsed:
                                await asyncio.sleep(expected_elapsed - actual_elapsed)

                        now = time.time()
                        if now - last_update_time >= 0.5 or (total and downloaded >= total):
                            elapsed = now - start_time
                            speed = int(downloaded / elapsed) if elapsed > 0 else 0
                            progress = round((downloaded / total) * 100, 1) if total > 0 else 0.0
                            eta = int((total - downloaded) / speed) if speed > 0 and total else 0

                            last_update_time = now

                            try:
                                async with get_scoped_session() as session:
                                    stmt = (
                                        update(Download)
                                        .where(Download.id == download_id)
                                        .values(
                                            downloaded_size=downloaded,
                                            file_size=total or downloaded,
                                            progress=int(progress),
                                            speed=speed,
                                            eta=eta,
                                            filename=filename,
                                            output_path=file_path,
                                        )
                                    )
                                    await session.execute(stmt)
                                    await session.commit()
                            except Exception as err:
                                logger.debug(f"DB generic stream progress error: {err}")

                            progress_msg = {
                                "type": "progress",
                                "download_id": download_id,
                                "status": "downloading",
                                "progress": progress,
                                "downloaded": downloaded,
                                "total": total or downloaded,
                                "speed": speed,
                                "eta": eta,
                            }
                            await _get_ws_manager().send_progress(download_id, progress_msg)
                            await _get_ws_manager().broadcast(progress_msg)

                            cb = self.progress_callbacks.get(download_id)
                            if cb:
                                await cb(progress, downloaded, total, speed, eta)

                # Final update on completion of writing file
                try:
                    async with get_scoped_session() as session:
                        stmt = (
                            update(Download)
                            .where(Download.id == download_id)
                            .values(
                                downloaded_size=downloaded,
                                file_size=total or downloaded,
                                progress=100,
                                speed=0,
                                eta=0,
                                filename=filename,
                                output_path=file_path,
                            )
                        )
                        await session.execute(stmt)
                        await session.commit()
                except Exception as err:
                    logger.debug(f"DB generic stream completion error: {err}")

    async def _update_db_progress(
        self,
        download_id: str,
        progress: float,
        downloaded_size: int,
        file_size: int,
        speed: int,
        eta: int,
    ) -> None:
        downloaded_size_int = int(round(downloaded_size or 0))
        file_size_int = int(round(file_size or 0))
        speed_int = int(round(speed or 0))
        eta_int = int(round(eta or 0))
        progress_val = float(progress or 0.0)

        try:
            async with get_scoped_session() as session:
                res = await session.execute(
                    select(Download).where(Download.id == download_id)
                )
                dl = res.scalar_one_or_none()
                if dl:
                    dl.downloaded_size = max(int(round(dl.downloaded_size or 0)), downloaded_size_int)
                    if file_size_int > 0:
                        dl.file_size = max(int(round(dl.file_size or 0)), file_size_int, dl.downloaded_size)
                    dl.progress = int(round(progress_val))
                    dl.speed = speed_int
                    dl.eta = eta_int
                    await session.commit()
        except Exception as err:
            logger.debug(f"DB progress update error: {err}")

        try:
            cb = self.progress_callbacks.get(download_id)
            if cb:
                await cb(progress_val, downloaded_size_int, file_size_int, speed_int, eta_int)
        except Exception as cberr:
            logger.debug(f"Progress callback notice: {cberr}")

    async def _download_ytdlp(
        self,
        download_id: str,
        url: str,
        format_model: Optional[FormatModel],
        target_dir: str,
        extra_meta: Optional[Dict[str, Any]] = None,
        speed_limit_kbps: Optional[int] = None,
    ) -> None:
        loop = asyncio.get_running_loop()
        extra = extra_meta or {}
        audio_only = extra.get("audio_only", False)
        audio_format = extra.get("audio_format", "mp3")
        audio_bitrate = str(extra.get("audio_bitrate", "320k")).rstrip("k")

        initial_file_size = (
            format_model.filesize
            if (format_model and format_model.filesize and format_model.filesize > 0)
            else 0
        )
        is_multistream = bool(
            not audio_only
            and not (format_model and format_model.is_audio and not format_model.is_video)
            and (
                (format_model and "+" in (format_model.format_id or ""))
                or (format_model and format_model.is_video)
                or (not format_model)
            )
        )

        # Track multi-stream (DASH video + audio) state per stream
        seen_streams: list[str] = []
        stream_totals: dict[str, int] = {}
        stream_downloaded: dict[str, int] = {}
        last_progress: float = 0.0
        last_total_downloaded: int = 0
        last_db_update: float = 0.0

        def progress_hook(d: dict):
            nonlocal last_progress, last_total_downloaded, last_db_update

            if (
                download_id not in self.active_downloads
                or getattr(self, "_cancel_flags", {}).get(download_id)
                or getattr(self, "_pause_flags", {}).get(download_id)
            ):
                from yt_dlp.utils import DownloadCancelled
                raise DownloadCancelled("Download interrupted by user")

            status = d.get("status")
            info_dict = d.get("info_dict") or {}
            # Uniquely identify each stream pass (video vs audio)
            stream_id = (
                str(info_dict.get("format_id") or "")
                or d.get("tmpfilename")
                or d.get("filename")
                or "default"
            )

            if stream_id not in seen_streams:
                seen_streams.append(stream_id)
            stream_idx = seen_streams.index(stream_id)  # 0 = Video (Stream 1), 1 = Audio (Stream 2)

            raw_downloaded = int(round(d.get("downloaded_bytes") or 0))
            raw_total = int(round(d.get("total_bytes") or d.get("total_bytes_estimate") or 0))

            frag_index = d.get("fragment_index")
            frag_count = d.get("fragment_count")

            # Ignore Fragment 0 initialization header total estimate spike (~712 bytes)
            if frag_count and frag_count > 1 and (frag_index is None or frag_index <= 0):
                raw_total = 0

            # Track known total PER STREAM (prevents 2.9 GB video total from breaking 40 MB audio progress)
            prev_stream_total = stream_totals.get(stream_id, 0)
            if raw_total > prev_stream_total:
                stream_totals[stream_id] = raw_total
            current_stream_total = max(stream_totals.get(stream_id, 0), raw_downloaded)
            stream_totals[stream_id] = current_stream_total

            # Track downloaded bytes per stream and sum across all streams
            stream_downloaded[stream_id] = max(stream_downloaded.get(stream_id, 0), raw_downloaded)
            cumulative_downloaded = sum(stream_downloaded.values())
            last_total_downloaded = max(last_total_downloaded, cumulative_downloaded)

            # Calculate true combined file size across all discovered streams
            combined_total = int(round(max(
                sum(stream_totals.values()),
                last_total_downloaded,
                initial_file_size or 0,
            )))

            if status == "downloading":
                # Calculate raw 0-100% progress for the CURRENT stream only
                if frag_count and frag_count > 0:
                    if frag_index is None or frag_index <= 0:
                        raw_progress = 0.0
                    else:
                        raw_progress = (frag_index / frag_count) * 100.0
                        # Estimate full stream size from fragments if total_bytes wasn't provided
                        if frag_index > 1 and raw_downloaded > 0:
                            est_stream_total = int(raw_downloaded * (frag_count / frag_index))
                            if est_stream_total > stream_totals.get(stream_id, 0):
                                stream_totals[stream_id] = est_stream_total
                                combined_total = max(sum(stream_totals.values()), combined_total)
                elif current_stream_total > 0:
                    raw_progress = (raw_downloaded / current_stream_total) * 100.0
                else:
                    raw_progress = 0.0

                raw_progress = max(0.0, min(100.0, raw_progress))

                # Scale across streams: Stream 1 (Video) -> 0..85%, Stream 2 (Audio) -> 85..97%
                if is_multistream:
                    if stream_idx == 0:
                        scaled_progress = raw_progress * 0.85
                    else:
                        scaled_progress = 85.0 + (raw_progress * 0.12)
                else:
                    scaled_progress = raw_progress

                progress = round(min(98.0, max(last_progress, scaled_progress)), 1)
                last_progress = progress

                speed = int(d.get("speed") or 0)
                eta = int(d.get("eta") or 0)

                now = time.time()
                # Broadcast live WebSocket tick (including updated file_size and backwards-compatible keys)
                ws_msg = {
                    "type": "progress",
                    "download_id": download_id,
                    "status": DownloadStatus.DOWNLOADING.value,
                    "progress": progress,
                    "downloaded": last_total_downloaded,
                    "downloaded_size": last_total_downloaded,
                    "total": combined_total,
                    "file_size": combined_total,
                    "speed": speed,
                    "eta": eta,
                }
                ws_mgr = _get_ws_manager()
                if not loop.is_closed():
                    asyncio.run_coroutine_threadsafe(
                        ws_mgr.send_progress(download_id, ws_msg),
                        loop,
                    )
                    asyncio.run_coroutine_threadsafe(
                        ws_mgr.broadcast(ws_msg),
                        loop,
                    )

                # Throttle SQLite writes to 500ms
                if now - last_db_update >= 0.5:
                    last_db_update = now
                    if not loop.is_closed():
                        asyncio.run_coroutine_threadsafe(
                            self._update_db_progress(
                                download_id,
                                progress=progress,
                                downloaded_size=last_total_downloaded,
                                file_size=combined_total,
                                speed=speed,
                                eta=eta,
                            ),
                            loop,
                        )

            elif status == "finished":
                # Lock completed stream size
                stream_downloaded[stream_id] = max(
                    stream_downloaded.get(stream_id, 0),
                    raw_downloaded,
                    stream_totals.get(stream_id, 0),
                )
                stream_totals[stream_id] = stream_downloaded[stream_id]
                last_total_downloaded = max(last_total_downloaded, sum(stream_downloaded.values()))
                if is_multistream:
                    if stream_idx == 0:
                        last_progress = max(last_progress, 85.0)
                    else:
                        last_progress = max(last_progress, 97.0)
                else:
                    last_progress = max(last_progress, 98.0)

        def postprocessor_hook(d: dict):
            nonlocal last_progress
            if (
                download_id not in self.active_downloads
                or getattr(self, "_cancel_flags", {}).get(download_id)
                or getattr(self, "_pause_flags", {}).get(download_id)
            ):
                from yt_dlp.utils import DownloadCancelled
                raise DownloadCancelled("Download interrupted by user")

            pp_status = d.get("status")
            if pp_status in ("started", "processing"):
                last_progress = max(last_progress, 99.0)
                combined_total = int(round(max(sum(stream_totals.values()), last_total_downloaded, initial_file_size or 0)))
                post_msg = {
                    "type": "progress",
                    "download_id": download_id,
                    "status": DownloadStatus.DOWNLOADING.value,
                    "progress": 99.0,
                    "downloaded": last_total_downloaded,
                    "downloaded_size": last_total_downloaded,
                    "total": combined_total,
                    "file_size": combined_total,
                    "speed": 0,
                    "eta": 0,
                }
                ws_mgr = _get_ws_manager()
                if not loop.is_closed():
                    asyncio.run_coroutine_threadsafe(
                        ws_mgr.send_progress(download_id, post_msg),
                        loop,
                    )
                    asyncio.run_coroutine_threadsafe(
                        ws_mgr.broadcast(post_msg),
                        loop,
                    )
                    asyncio.run_coroutine_threadsafe(
                        self._update_db_progress(
                            download_id,
                            progress=99.0,
                            downloaded_size=last_total_downloaded,
                            file_size=combined_total,
                            speed=0,
                            eta=0,
                        ),
                        loop,
                    )

        # Include format_id in the filename to prevent different quality
        # selections from colliding on the same output file. Without this,
        # yt-dlp would skip the download if a file with the same name already
        # exists on disk (e.g. a previous low-quality download).
        format_tag = f"audio_{audio_format}_{audio_bitrate}" if audio_only else (
            format_model.format_id if format_model and format_model.format_id else "best"
        )

        # Video Time-Range Clipping (Phase 1)
        start_sec = parse_time_str(extra.get("start_time"))
        end_sec = parse_time_str(extra.get("end_time"))
        download_ranges = None
        if start_sec is not None or end_sec is not None:
            s = start_sec if start_sec is not None else 0.0
            if (end_sec is None or end_sec > s) and s >= 0:
                download_ranges = yt_dlp.utils.download_range_func(None, [(s, end_sec)])
                end_label = int(end_sec) if end_sec is not None else "end"
                format_tag = f"{format_tag}_clip_{int(s)}-{end_label}"

        ydl_opts = {
            "outtmpl": os.path.join(target_dir, f"%(title)s [%(id)s] [{format_tag}].%(ext)s"),
            "progress_hooks": [progress_hook],
            "postprocessor_hooks": [postprocessor_hook],
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "windowsfilenames": True,
            "no_color": True,
            "overwrites": False,
            "continuedl": True,
            "socket_timeout": settings.request_timeout,
            "retries": 5,
            "user_agent": settings.user_agent,
            "js_runtimes": {"node": {}},
            "remote_components": ["ejs:github"],
        }

        ff_bin = shutil.which("ffmpeg") or settings.ffmpeg_path
        if ff_bin and os.path.exists(ff_bin):
            ydl_opts["ffmpeg_location"] = os.path.dirname(ff_bin) if os.path.isfile(ff_bin) else ff_bin

        if download_ranges:
            ydl_opts["download_ranges"] = download_ranges
            ydl_opts["force_keyframes_at_cuts"] = True

        # Subtitles (Phase 1)
        sub_langs = extra.get("subtitle_langs")
        if sub_langs and isinstance(sub_langs, list) and len(sub_langs) > 0:
            ydl_opts["writesubtitles"] = True
            ydl_opts["writeautomaticsub"] = True
            ydl_opts["subtitleslangs"] = sub_langs
            if extra.get("embed_subtitles") and not audio_only:
                ydl_opts.setdefault("postprocessors", [])
                if not any(pp.get("key") == "FFmpegEmbedSubtitle" for pp in ydl_opts["postprocessors"]):
                    ydl_opts["postprocessors"].append({"key": "FFmpegEmbedSubtitle"})

        # Chapters (Phase 1)
        if extra.get("embed_chapters"):
            ydl_opts["add_chapters"] = True

        # SponsorBlock removal (Phase 1)
        if extra.get("sponsorblock_remove"):
            ydl_opts["sponsorblock_remove"] = ["sponsor", "selfpromo", "interaction"]

        # Cookie file support
        cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")
        if os.path.exists(cookies_path) and os.path.getsize(cookies_path) > 0:
            ydl_opts["cookiefile"] = cookies_path

        # Speed limit support
        if speed_limit_kbps and speed_limit_kbps > 0:
            ydl_opts["ratelimit"] = speed_limit_kbps * 1024

        # Custom request headers support (e.g. from stream sniffer)
        custom_headers = (extra_meta and (extra_meta.get("headers") or extra_meta.get("http_headers"))) or {}
        if custom_headers:
            ydl_opts["http_headers"] = custom_headers

        def run_ytdlp():
            target_format_id = format_model.format_id if format_model and format_model.format_id else None
            is_audio_requested = audio_only or bool(format_model and format_model.is_audio and not format_model.is_video)
            logger.info(f"Download {download_id}: format_id={target_format_id}, is_audio={is_audio_requested}, audio_only={audio_only}")

            opts = dict(ydl_opts)

            if audio_only:
                opts["format"] = "bestaudio/best"
                existing_pps = list(ydl_opts.get("postprocessors", []))
                audio_pp = {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": audio_format,
                    "preferredquality": audio_bitrate,
                }
                opts["postprocessors"] = [audio_pp] + [pp for pp in existing_pps if pp.get("key") != "FFmpegExtractAudio"]
            elif target_format_id:
                if is_audio_requested:
                    opts["format"] = f"{target_format_id}/bestaudio/best"
                else:
                    try:
                        meta_opts = {
                            "quiet": True,
                            "no_warnings": True,
                            "noplaylist": True,
                            "no_color": True,
                            "user_agent": settings.user_agent,
                            "js_runtimes": {"node": {}},
                            "remote_components": ["ejs:github"],
                        }
                        if ff_bin:
                            meta_opts["ffmpeg_location"] = os.path.dirname(ff_bin)
                        with yt_dlp.YoutubeDL(meta_opts) as ydl_meta:
                            meta = ydl_meta.extract_info(url, download=False)
                            if meta and "entries" in meta:
                                entries = list(meta["entries"])
                                meta = entries[0] if entries else meta
                            
                            formats = meta.get("formats", []) if meta else []
                            target_fmt = next((f for f in formats if str(f.get("format_id")) == str(target_format_id)), None)
                            
                            if target_fmt:
                                has_v = target_fmt.get("vcodec") not in (None, "none")
                                has_a = target_fmt.get("acodec") not in (None, "none")
                                if has_v and not has_a:
                                    opts["format"] = f"{target_format_id}+bestaudio/best"
                                    opts["merge_output_format"] = "mp4"
                                else:
                                    opts["format"] = target_format_id
                            else:
                                opts["format"] = f"{target_format_id}+bestaudio/best"
                                opts["merge_output_format"] = "mp4"
                    except Exception as err:
                        logger.warning(f"Could not pre-inspect formats: {err}, using fallback merged format")
                        opts["format"] = f"{target_format_id}+bestaudio/best"
                        opts["merge_output_format"] = "mp4"
            else:
                opts["format"] = "bestvideo+bestaudio/best"
                opts["merge_output_format"] = "mp4"

            logger.info(f"Download {download_id}: final yt-dlp format={opts.get('format')}, merge={opts.get('merge_output_format', 'none')}, outtmpl={opts.get('outtmpl')}")

            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if not info:
                        raise Exception("Failed to extract or download media")

                    if "entries" in info:
                        entries = list(info["entries"])
                        entry = entries[0] if entries else info
                    else:
                        entry = info

                    actual_filename = None
                    if "_filename" in entry and os.path.exists(entry["_filename"]):
                        actual_filename = entry["_filename"]
                    elif "requested_downloads" in entry:
                        for req in entry["requested_downloads"]:
                            if "_filename" in req and os.path.exists(req["_filename"]):
                                actual_filename = req["_filename"]
                                break
                            if "filepath" in req and os.path.exists(req["filepath"]):
                                actual_filename = req["filepath"]
                                break

                    if not actual_filename:
                        prep = ydl.prepare_filename(entry)
                        if os.path.exists(prep):
                            actual_filename = prep
                        else:
                            base_name, _ = os.path.splitext(prep)
                            for ext in [".mp4", ".mkv", ".webm", ".mp3", ".m4a", ".flac", ".wav", ".opus"]:
                                cand = base_name + ext
                                if os.path.exists(cand):
                                    actual_filename = cand
                                    break
                        if not actual_filename:
                            actual_filename = prep

                    return entry, actual_filename
            except Exception as err:
                from yt_dlp.utils import DownloadCancelled
                if isinstance(err, DownloadCancelled) or "Download was cancelled" in str(err):
                    raise asyncio.CancelledError() from err
                raise err

        info, filename = await loop.run_in_executor(None, run_ytdlp)

        file_size = os.path.getsize(filename) if filename and os.path.exists(filename) else 0
        detected_ext = os.path.splitext(filename)[1].lstrip(".").lower() if filename else None
        is_audio = audio_only or detected_ext in ["mp3", "m4a", "flac", "wav", "aac", "opus"]
        ctype = ContentType.AUDIO if is_audio else ContentType.VIDEO

        # Automatic Audio Tagging & Artwork Embedding
        if is_audio and filename and os.path.isfile(filename):
            try:
                auto_tag = True
                embed_art = True
                from models.database import Settings as DBSettings
                async with get_scoped_session() as session:
                    tag_res = await session.execute(
                        select(DBSettings).where(DBSettings.key == "auto_tag_audio")
                    )
                    t_row = tag_res.scalar_one_or_none()
                    if t_row and t_row.value:
                        auto_tag = json.loads(t_row.value)

                    art_res = await session.execute(
                        select(DBSettings).where(DBSettings.key == "embed_album_art")
                    )
                    a_row = art_res.scalar_one_or_none()
                    if a_row and a_row.value:
                        embed_art = json.loads(a_row.value)

                if auto_tag:
                    from services.tagger import audio_tagger
                    tag_meta = dict(info)
                    if extra_meta.get("artist"):
                        tag_meta["artist"] = extra_meta["artist"]
                        tag_meta["uploader"] = extra_meta["artist"]
                    if extra_meta.get("album"):
                        tag_meta["album"] = extra_meta["album"]
                    tag_thumbnail = extra_meta.get("cover_art") or info.get("thumbnail")

                    await audio_tagger.tag_audio_file(
                        file_path=filename,
                        metadata=tag_meta,
                        thumbnail_url=tag_thumbnail,
                        embed_art=embed_art,
                    )
                    if os.path.exists(filename):
                        file_size = os.path.getsize(filename)
            except Exception as tag_err:
                logger.debug(f"Audio tagging notice: {tag_err}")

        try:
            async with get_scoped_session() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(
                        title=info.get("title"),
                        filename=os.path.basename(filename) if filename else None,
                        output_path=filename,
                        file_size=file_size,
                        thumbnail=info.get("thumbnail"),
                        duration=info.get("duration"),
                        extension=detected_ext,
                        content_type=ctype,
                    )
                )
                await session.execute(stmt)
                await session.commit()
        except Exception as dberr:
            logger.debug(f"DB update ytdlp completion error: {dberr}")


download_engine = DownloadEngine()
