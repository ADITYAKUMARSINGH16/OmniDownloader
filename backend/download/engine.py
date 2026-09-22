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
from sqlalchemy import select, update

from core.config import settings
from core.database import AsyncSessionLocal
from core.security import sanitize_filename
from models.database import Download, DownloadHistory, DownloadStatus, ContentType
from models.schemas import FormatModel
from extractors.base import ExtractorRegistry

logger = logging.getLogger(__name__)


def _get_ws_manager():
    from api.websocket import manager
    return manager


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

    async def start_download(
        self,
        download_id: str,
        url: str,
        format_model: Optional[FormatModel] = None,
        output_path: Optional[str] = None,
        callback: Optional[Callable] = None,
    ) -> str:
        self.progress_callbacks[download_id] = ProgressCallback(download_id, callback)
        task = asyncio.create_task(
            self._download_task(download_id, url, format_model, output_path)
        )
        self.active_downloads[download_id] = task
        return download_id

    async def pause_download(self, download_id: str) -> None:
        task = self.active_downloads.pop(download_id, None)
        if task:
            res = task.cancel()
            if asyncio.iscoroutine(res):
                await res
        
        try:
            async with AsyncSessionLocal() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(status=DownloadStatus.PAUSED)
                )
                await session.execute(stmt)
                await session.commit()
        except Exception as e:
            logger.debug(f"DB update in pause_download: {e}")

        try:
            await _get_ws_manager().send_progress(download_id, {
                "type": "progress",
                "download_id": download_id,
                "status": "paused",
            })
        except Exception:
            pass

    async def cancel_download(self, download_id: str) -> None:
        task = self.active_downloads.pop(download_id, None)
        if task:
            res = task.cancel()
            if asyncio.iscoroutine(res):
                await res

        self.progress_callbacks.pop(download_id, None)

        try:
            async with AsyncSessionLocal() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(status=DownloadStatus.CANCELLED)
                )
                await session.execute(stmt)
                await session.commit()
        except Exception as e:
            logger.debug(f"DB update in cancel_download: {e}")

        try:
            await _get_ws_manager().send_progress(download_id, {
                "type": "progress",
                "download_id": download_id,
                "status": "cancelled",
            })
        except Exception:
            pass

    async def resume_or_start(self, download_id: str) -> None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Download).where(Download.id == download_id))
            download = result.scalar_one_or_none()
            if not download:
                return
            url = download.url
            format_model = None
            if download.format_id:
                is_audio = download.content_type == ContentType.AUDIO or (download.extension in ["mp3", "m4a", "wav", "flac", "aac", "opus"])
                is_video = download.content_type == ContentType.VIDEO or not is_audio
                format_model = FormatModel(
                    format_id=download.format_id,
                    quality=download.format or "default",
                    extension=download.extension or ("m4a" if is_audio else "mp4"),
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
        try:
            from core.security import sanitize_folder_path
            target_dir = sanitize_folder_path(raw_target)
        except Exception:
            target_dir = settings.download_dir

        try:
            os.makedirs(target_dir, exist_ok=True)
            os.makedirs(settings.temp_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create target_dir '{target_dir}': {e}")
            raise

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        async with AsyncSessionLocal() as session:
            stmt = (
                update(Download)
                .where(Download.id == download_id)
                .values(status=DownloadStatus.DOWNLOADING, started_at=now)
            )
            await session.execute(stmt)
            await session.commit()


        try:
            extractor = ExtractorRegistry.get_extractor(url)
            is_generic = extractor is not None and extractor.name == "generic"

            # Check if format_id is a direct HTTP/HTTPS URL
            target_download_url = None
            if format_model and format_model.format_id and (
                format_model.format_id.startswith("http://") or format_model.format_id.startswith("https://")
            ):
                target_download_url = format_model.format_id

            if is_generic or target_download_url:
                dl_url = target_download_url or url
                await self._download_generic(download_id, dl_url, target_dir)
            else:
                await self._download_ytdlp(download_id, url, format_model, target_dir)

            # Mark completed
            completed_now = datetime.now(timezone.utc).replace(tzinfo=None)
            async with AsyncSessionLocal() as session:
                res = await session.execute(select(Download).where(Download.id == download_id))
                dl = res.scalar_one_or_none()
                if dl:
                    dl.status = DownloadStatus.COMPLETED
                    dl.progress = 100
                    dl.completed_at = completed_now
                    # Always sync downloaded_size with the actual file_size on completion.
                    # The progress hook may report partial/stream-only sizes during merging.
                    dl.downloaded_size = dl.file_size or dl.downloaded_size or 0

                    # Add history item
                    history = DownloadHistory(
                        id=dl.id,
                        url=dl.url,
                        source=dl.source,
                        title=dl.title,
                        filename=dl.filename,
                        file_size=dl.file_size,
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
                    await session.commit()

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
            raise
        except Exception as e:
            clean_err = re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', str(e)).strip()
            logger.error(f"Download {download_id} failed: {clean_err}")
            async with AsyncSessionLocal() as session:
                stmt = (
                    update(Download)
                    .where(Download.id == download_id)
                    .values(status=DownloadStatus.FAILED, error=clean_err)
                )
                await session.execute(stmt)
                await session.commit()

            await _get_ws_manager().send_progress(download_id, {
                "type": "progress",
                "download_id": download_id,
                "status": "failed",
                "error": clean_err,
            })
        finally:
            self.active_downloads.pop(download_id, None)
            self.progress_callbacks.pop(download_id, None)
            try:
                from queue.manager import queue_manager
                await queue_manager.on_download_finished(download_id)
            except Exception:
                pass

    async def _download_generic(self, download_id: str, url: str, target_dir: str) -> None:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
        }
        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True, headers=headers) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))

                # Determine filename - check if title was saved in DB
                dl_title = None
                dl_ext = None
                async with AsyncSessionLocal() as session:
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
                        f.write(chunk)
                        downloaded += len(chunk)

                        now = time.time()
                        if now - last_update_time >= 0.5 or (total and downloaded >= total):
                            elapsed = now - start_time
                            speed = int(downloaded / elapsed) if elapsed > 0 else 0
                            progress = round((downloaded / total) * 100, 1) if total > 0 else 0.0
                            eta = int((total - downloaded) / speed) if speed > 0 and total else 0

                            last_update_time = now

                            async with AsyncSessionLocal() as session:
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
                async with AsyncSessionLocal() as session:
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

    async def _download_ytdlp(
        self,
        download_id: str,
        url: str,
        format_model: Optional[FormatModel],
        target_dir: str,
    ) -> None:
        loop = asyncio.get_running_loop()

        last_db_time = [0.0]

        def progress_hook(d: dict):
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes") or 0
                speed = int(d.get("speed") or 0)
                eta = int(d.get("eta") or 0)
                progress = round((downloaded / total) * 100, 1) if total > 0 else 0.0

                async def update_db_and_ws():
                    progress_msg = {
                        "type": "progress",
                        "download_id": download_id,
                        "status": "downloading",
                        "progress": progress,
                        "downloaded": downloaded,
                        "total": total,
                        "speed": speed,
                        "eta": eta,
                    }
                    await _get_ws_manager().send_progress(download_id, progress_msg)
                    # Also broadcast to ALL clients so the queue page auto-updates
                    await _get_ws_manager().broadcast(progress_msg)
                    try:
                        async with AsyncSessionLocal() as session:
                            stmt = (
                                update(Download)
                                .where(Download.id == download_id)
                                .values(
                                    downloaded_size=downloaded,
                                    file_size=total or downloaded,
                                    progress=int(progress),
                                    speed=speed,
                                    eta=eta,
                                )
                            )
                            await session.execute(stmt)
                            await session.commit()
                    except Exception as err:
                        logger.debug(f"DB progress update error: {err}")

                now = time.time()
                if now - last_db_time[0] >= 0.5 or (total and downloaded >= total):
                    last_db_time[0] = now
                    asyncio.run_coroutine_threadsafe(update_db_and_ws(), loop)
                else:
                    progress_msg = {
                        "type": "progress",
                        "download_id": download_id,
                        "status": "downloading",
                        "progress": progress,
                        "downloaded": downloaded,
                        "total": total,
                        "speed": speed,
                        "eta": eta,
                    }
                    asyncio.run_coroutine_threadsafe(
                        _get_ws_manager().broadcast(progress_msg),
                        loop,
                    )

        # Include format_id in the filename to prevent different quality
        # selections from colliding on the same output file. Without this,
        # yt-dlp would skip the download if a file with the same name already
        # exists on disk (e.g. a previous low-quality download).
        format_tag = format_model.format_id if format_model and format_model.format_id else "best"
        ydl_opts = {
            "outtmpl": os.path.join(target_dir, f"%(title)s [%(id)s] [{format_tag}].%(ext)s"),
            "progress_hooks": [progress_hook],
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "windowsfilenames": True,
            "no_color": True,
            "overwrites": True,
        }

        def run_ytdlp():
            target_format_id = format_model.format_id if format_model and format_model.format_id else None
            is_audio_requested = bool(format_model and format_model.is_audio and not format_model.is_video)
            logger.info(f"Download {download_id}: format_id={target_format_id}, is_audio={is_audio_requested}, quality={format_model.quality if format_model else 'N/A'}")

            opts = dict(ydl_opts)

            if target_format_id:
                if is_audio_requested:
                    opts["format"] = f"{target_format_id}/bestaudio/best"
                else:
                    try:
                        with yt_dlp.YoutubeDL({
                            "quiet": True,
                            "no_warnings": True,
                            "noplaylist": True,
                            "no_color": True,
                        }) as ydl_meta:
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
                        for ext in [".mp4", ".mkv", ".webm", ".mp3", ".m4a"]:
                            cand = base_name + ext
                            if os.path.exists(cand):
                                actual_filename = cand
                                break
                    if not actual_filename:
                        actual_filename = prep

                return entry, actual_filename

        info, filename = await loop.run_in_executor(None, run_ytdlp)

        file_size = os.path.getsize(filename) if filename and os.path.exists(filename) else 0

        async with AsyncSessionLocal() as session:
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
                )
            )
            await session.execute(stmt)
            await session.commit()


download_engine = DownloadEngine()
