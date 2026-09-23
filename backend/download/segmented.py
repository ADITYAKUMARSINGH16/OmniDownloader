import os
import shutil
import asyncio
import time
import logging
from typing import Optional, Callable, Dict, Any, List, Tuple
from urllib.parse import urlparse
import httpx
from sqlalchemy import update, select

from core.config import settings
from core.database import AsyncSessionLocal
from core.security import sanitize_filename
from models.database import Download, DownloadStatus

logger = logging.getLogger(__name__)

DEFAULT_SEGMENTS = 8
MIN_SEGMENTED_SIZE = 5 * 1024 * 1024  # 5MB minimum to engage multi-part


def _get_ws_manager():
    from api.websocket import manager
    return manager


class SegmentedDownloader:
    """High-speed multi-connection segmented HTTP/HTTPS download engine."""

    def __init__(self, connections: int = DEFAULT_SEGMENTS):
        self.connections = max(1, min(connections, 16))

    async def probe(
        self, url: str, headers: Optional[Dict[str, str]] = None
    ) -> Tuple[bool, int, Dict[str, str], Optional[str]]:
        """Probe URL to check range request support, content length, and headers."""
        req_headers = {
            "User-Agent": settings.user_agent,
            "Accept": "*/*",
            **(headers or {}),
        }

        async with httpx.AsyncClient(
            timeout=15.0, follow_redirects=True, headers=req_headers
        ) as client:
            # 1. Try HEAD request first
            try:
                head_resp = await client.head(url)
                if head_resp.status_code < 400:
                    content_length = int(head_resp.headers.get("content-length", 0))
                    accept_ranges = head_resp.headers.get("accept-ranges", "").lower()
                    cd = head_resp.headers.get("content-disposition", "")
                    filename = None
                    if "filename=" in cd:
                        filename = cd.split("filename=")[-1].strip("\"' ")

                    if accept_ranges == "bytes" and content_length > 0:
                        return True, content_length, dict(head_resp.headers), filename
            except Exception as e:
                logger.debug(f"HEAD probe failed for {url}: {e}")

            # 2. Try partial GET with Range: bytes=0-0
            try:
                range_headers = {**req_headers, "Range": "bytes=0-0"}
                range_resp = await client.get(url, headers=range_headers)
                if range_resp.status_code == 206:
                    # Content-Range: bytes 0-0/1234567
                    content_range = range_resp.headers.get("content-range", "")
                    content_length = 0
                    if "/" in content_range:
                        try:
                            content_length = int(content_range.split("/")[-1])
                        except ValueError:
                            content_length = 0

                    cd = range_resp.headers.get("content-disposition", "")
                    filename = None
                    if "filename=" in cd:
                        filename = cd.split("filename=")[-1].strip("\"' ")

                    if content_length > 0:
                        return True, content_length, dict(range_resp.headers), filename

                elif range_resp.status_code == 200:
                    # Server doesn't support ranges, returned full content
                    length = int(range_resp.headers.get("content-length", 0))
                    cd = range_resp.headers.get("content-disposition", "")
                    filename = None
                    if "filename=" in cd:
                        filename = cd.split("filename=")[-1].strip("\"' ")
                    return False, length, dict(range_resp.headers), filename
            except Exception as e:
                logger.debug(f"Range GET probe failed for {url}: {e}")

        return False, 0, {}, None

    async def download(
        self,
        download_id: str,
        url: str,
        target_dir: str,
        filename: Optional[str] = None,
        connections: Optional[int] = None,
        speed_limit_kbps: Optional[int] = None,
        progress_callback: Optional[Callable] = None,
        cancel_event: Optional[asyncio.Event] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> str:
        """Download file using multi-connection segmented acceleration or single-stream fallback."""
        num_connections = connections or self.connections
        merged_headers = {
            "User-Agent": settings.user_agent,
            "Accept": "*/*",
            **(headers or {}),
        }

        supports_range, total_size, resp_headers, probe_filename = await self.probe(url, merged_headers)

        # Resolve filename
        if not filename:
            if probe_filename:
                filename = sanitize_filename(probe_filename)
            else:
                url_path = url.split("?")[0].rstrip("/")
                base = os.path.basename(url_path)
                if base and "." in base:
                    filename = sanitize_filename(base)
                else:
                    ext = "bin"
                    ct = resp_headers.get("content-type", "").lower()
                    if "video/mp4" in ct:
                        ext = "mp4"
                    elif "image/jpeg" in ct:
                        ext = "jpg"
                    elif "image/png" in ct:
                        ext = "png"
                    elif "application/zip" in ct:
                        ext = "zip"
                    elif "application/pdf" in ct:
                        ext = "pdf"
                    filename = f"{download_id}.{ext}"

        final_path = os.path.join(target_dir, filename)

        # Decide whether to use segmented acceleration
        if supports_range and total_size >= MIN_SEGMENTED_SIZE and num_connections > 1:
            logger.info(
                f"[Turbo Engine] Starting {num_connections}-part segmented download for {download_id} "
                f"({total_size} bytes)"
            )
            return await self._download_segmented(
                download_id=download_id,
                url=url,
                final_path=final_path,
                filename=filename,
                total_size=total_size,
                num_connections=num_connections,
                headers=merged_headers,
                speed_limit_kbps=speed_limit_kbps,
                progress_callback=progress_callback,
                cancel_event=cancel_event,
            )
        else:
            logger.info(
                f"[Single Stream] Server does not support ranges or file is small. Falling back for {download_id}"
            )
            return await self._download_single_stream(
                download_id=download_id,
                url=url,
                final_path=final_path,
                filename=filename,
                total_size=total_size,
                headers=merged_headers,
                speed_limit_kbps=speed_limit_kbps,
                progress_callback=progress_callback,
                cancel_event=cancel_event,
            )

    async def _download_segmented(
        self,
        download_id: str,
        url: str,
        final_path: str,
        filename: str,
        total_size: int,
        num_connections: int,
        headers: Dict[str, str],
        speed_limit_kbps: Optional[int],
        progress_callback: Optional[Callable],
        cancel_event: Optional[asyncio.Event],
    ) -> str:
        temp_dir = os.path.join(settings.temp_dir, f"segmented_{download_id}")
        os.makedirs(temp_dir, exist_ok=True)

        # Partition ranges
        chunk_size = total_size // num_connections
        ranges: List[Tuple[int, int, str]] = []
        for i in range(num_connections):
            start = i * chunk_size
            end = (i + 1) * chunk_size - 1 if i < num_connections - 1 else total_size - 1
            part_path = os.path.join(temp_dir, f"part_{i}.part")
            ranges.append((start, end, part_path))

        part_progress = [0] * num_connections

        # Initial check for already downloaded bytes in case of resume
        for i, (start, end, part_path) in enumerate(ranges):
            if os.path.exists(part_path):
                part_progress[i] = os.path.getsize(part_path)

        stop_telemetry = asyncio.Event()

        # Telemetry broadcaster loop
        async def telemetry_loop():
            start_time = time.time()
            last_downloaded = sum(part_progress)
            last_time = start_time

            while not stop_telemetry.is_set():
                await asyncio.sleep(0.4)
                now = time.time()
                current_downloaded = sum(part_progress)
                time_delta = now - last_time
                if time_delta <= 0:
                    continue

                speed = int((current_downloaded - last_downloaded) / time_delta)
                last_downloaded = current_downloaded
                last_time = now

                progress = (
                    round((current_downloaded / total_size) * 100, 1) if total_size > 0 else 0.0
                )
                eta = (
                    int((total_size - current_downloaded) / speed)
                    if speed > 0 and total_size > current_downloaded
                    else 0
                )

                # Update database
                try:
                    async with AsyncSessionLocal() as session:
                        stmt = (
                            update(Download)
                            .where(Download.id == download_id)
                            .values(
                                downloaded_size=current_downloaded,
                                file_size=total_size,
                                progress=int(progress),
                                speed=speed,
                                eta=eta,
                                filename=filename,
                                output_path=final_path,
                            )
                        )
                        await session.execute(stmt)
                        await session.commit()
                except Exception as e:
                    logger.debug(f"DB update error in telemetry: {e}")

                # Push WebSocket
                progress_msg = {
                    "type": "progress",
                    "download_id": download_id,
                    "status": "downloading",
                    "progress": progress,
                    "downloaded": current_downloaded,
                    "total": total_size,
                    "speed": speed,
                    "eta": eta,
                    "segments": num_connections,
                }
                try:
                    await _get_ws_manager().send_progress(download_id, progress_msg)
                    await _get_ws_manager().broadcast(progress_msg)
                except Exception:
                    pass

                if progress_callback:
                    try:
                        if asyncio.iscoroutinefunction(progress_callback):
                            await progress_callback(progress, current_downloaded, total_size, speed, eta)
                        else:
                            progress_callback(progress, current_downloaded, total_size, speed, eta)
                    except Exception:
                        pass

        # Individual worker for each segment
        async def download_part(index: int, start: int, end: int, part_path: str):
            existing_size = 0
            if os.path.exists(part_path):
                existing_size = os.path.getsize(part_path)

            target_part_size = end - start + 1
            if existing_size >= target_part_size:
                part_progress[index] = target_part_size
                return

            req_start = start + existing_size
            part_headers = {**headers, "Range": f"bytes={req_start}-{end}"}

            async with httpx.AsyncClient(
                timeout=settings.request_timeout, follow_redirects=True, headers=part_headers
            ) as client:
                async with client.stream("GET", url) as resp:
                    resp.raise_for_status()
                    mode = "ab" if existing_size > 0 else "wb"
                    with open(part_path, mode) as f:
                        async for chunk in resp.aiter_bytes(chunk_size=65536):
                            if cancel_event and cancel_event.is_set():
                                return
                            f.write(chunk)
                            part_progress[index] += len(chunk)

                            # Speed limit throttling per worker
                            if speed_limit_kbps and speed_limit_kbps > 0:
                                worker_quota_bps = (speed_limit_kbps * 1024) / num_connections
                                if worker_quota_bps > 0:
                                    sleep_time = len(chunk) / worker_quota_bps
                                    if sleep_time > 0.001:
                                        await asyncio.sleep(min(sleep_time, 0.5))

        telemetry_task = asyncio.create_task(telemetry_loop())

        try:
            worker_tasks = [
                download_part(i, start, end, part_path)
                for i, (start, end, part_path) in enumerate(ranges)
            ]
            await asyncio.gather(*worker_tasks)
        finally:
            stop_telemetry.set()
            await telemetry_task

        if cancel_event and cancel_event.is_set():
            return final_path

        # Stitch all part files sequentially into the final file
        logger.info(f"[Turbo Engine] Stitching {num_connections} parts into {final_path}...")
        with open(final_path, "wb") as outfile:
            for _, _, part_path in ranges:
                if os.path.exists(part_path):
                    with open(part_path, "rb") as infile:
                        shutil.copyfileobj(infile, outfile, length=1024 * 1024)

        # Cleanup parts
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception as e:
            logger.debug(f"Failed to clean up temp dir {temp_dir}: {e}")

        # Final DB and WebSocket update
        async with AsyncSessionLocal() as session:
            stmt = (
                update(Download)
                .where(Download.id == download_id)
                .values(
                    downloaded_size=total_size,
                    file_size=total_size,
                    progress=100,
                    speed=0,
                    eta=0,
                    filename=filename,
                    output_path=final_path,
                )
            )
            await session.execute(stmt)
            await session.commit()

        final_msg = {
            "type": "progress",
            "download_id": download_id,
            "status": "downloading",
            "progress": 100,
            "downloaded": total_size,
            "total": total_size,
            "speed": 0,
            "eta": 0,
        }
        await _get_ws_manager().send_progress(download_id, final_msg)
        await _get_ws_manager().broadcast(final_msg)

        logger.info(f"[Turbo Engine] Completed segmented download: {final_path}")
        return final_path

    async def _download_single_stream(
        self,
        download_id: str,
        url: str,
        final_path: str,
        filename: str,
        total_size: int,
        headers: Dict[str, str],
        speed_limit_kbps: Optional[int],
        progress_callback: Optional[Callable],
        cancel_event: Optional[asyncio.Event],
    ) -> str:
        async with httpx.AsyncClient(
            timeout=settings.request_timeout, follow_redirects=True, headers=headers
        ) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", total_size or 0))

                downloaded = 0
                start_time = time.time()
                last_update_time = start_time

                with open(final_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        if cancel_event and cancel_event.is_set():
                            return final_path
                        f.write(chunk)
                        downloaded += len(chunk)

                        if speed_limit_kbps and speed_limit_kbps > 0:
                            max_bytes_per_sec = speed_limit_kbps * 1024
                            expected_elapsed = downloaded / max_bytes_per_sec
                            actual_elapsed = time.time() - start_time
                            if expected_elapsed > actual_elapsed:
                                await asyncio.sleep(expected_elapsed - actual_elapsed)

                        now = time.time()
                        if now - last_update_time >= 0.4 or (total and downloaded >= total):
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
                                        output_path=final_path,
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

                            if progress_callback:
                                if asyncio.iscoroutinefunction(progress_callback):
                                    await progress_callback(progress, downloaded, total, speed, eta)
                                else:
                                    progress_callback(progress, downloaded, total, speed, eta)

        return final_path
