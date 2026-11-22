import os
import io
import csv
import uuid
import json
import logging
import subprocess
import platform
import secrets
import asyncio
from typing import Optional, List, Any
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query, status, Response, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update, delete, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db, AsyncSessionLocal
from core.exceptions import handle_exception, NotFoundError, ValidationError, UnsupportedSourceError
from core.security import validate_url, check_ssrf, async_check_ssrf, sanitize_folder_path, verify_api_key
from core.limiter import limiter
from models.database import Download, DownloadHistory, Settings as DBSettings, DownloadStatus as DBDownloadStatus, ContentType as DBContentType
from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DownloadRequest,
    DownloadResponse,
    BatchDownloadRequest,
    BatchDownloadResponse,
    BatchDownloadResult,
    CookieStatusResponse,
    DownloadInfo,
    QueueStatus,
    HistoryItem,
    SettingsModel,
    SettingsUpdate,
    ApiKeyGenerateResponse,
    FormatModel,
    ContentType,
    DownloadStatus,
    AnalyticsStatsResponse,
    SourceStat,
    FormatStat,
    DailyActivity,
    PlaylistAnalyzeResponse,
)

from extractors.base import ExtractorRegistry
from download.engine import download_engine
from queue.manager import queue_manager

logger = logging.getLogger(__name__)

router = APIRouter()

# Wire queue manager to download engine
queue_manager.set_engine(download_engine)


def db_download_to_info(d: Download) -> DownloadInfo:
    metadata_val = None
    if d.extra_metadata:
        try:
            metadata_val = json.loads(d.extra_metadata)
        except Exception:
            metadata_val = None

    return DownloadInfo(
        id=d.id,
        url=d.url,
        source=d.source,
        title=d.title,
        filename=d.filename,
        file_size=int(round(d.file_size)) if d.file_size is not None else 0,
        downloaded_size=int(round(d.downloaded_size)) if d.downloaded_size is not None else 0,
        format=d.format,
        format_id=d.format_id,
        extension=d.extension,
        content_type=ContentType(d.content_type.value) if d.content_type else ContentType.UNKNOWN,
        status=DownloadStatus(d.status.value) if d.status else DownloadStatus.QUEUED,
        progress=float(d.progress or 0),
        speed=int(round(d.speed)) if d.speed is not None else 0,
        eta=int(round(d.eta)) if d.eta is not None else 0,
        priority=int(round(d.priority)) if d.priority is not None else 0,
        retries=int(round(d.retries)) if d.retries is not None else 0,
        max_retries=int(round(d.max_retries)) if d.max_retries is not None else 3,
        error=d.error,
        output_path=d.output_path,
        thumbnail=d.thumbnail,
        duration=round(d.duration, 2) if d.duration is not None else None,
        metadata=metadata_val,
        created_at=d.created_at or datetime.now(timezone.utc),
        updated_at=d.updated_at,
        started_at=d.started_at,
        completed_at=d.completed_at,
        scheduled_at=d.scheduled_at,
    )


def db_history_to_item(h: DownloadHistory) -> HistoryItem:
    metadata_val = None
    if h.extra_metadata:
        try:
            metadata_val = json.loads(h.extra_metadata)
        except Exception:
            metadata_val = None

    return HistoryItem(
        id=h.id,
        url=h.url,
        source=h.source,
        title=h.title,
        filename=h.filename,
        file_size=int(round(h.file_size)) if h.file_size is not None else 0,
        format=h.format,
        extension=h.extension,
        content_type=ContentType(h.content_type.value) if h.content_type else ContentType.UNKNOWN,
        status=DownloadStatus(h.status.value) if h.status else DownloadStatus.COMPLETED,
        output_path=h.output_path,
        thumbnail=h.thumbnail,
        duration=round(h.duration, 2) if h.duration is not None else None,
        metadata=metadata_val,
        error=h.error,
        created_at=h.created_at or datetime.now(timezone.utc),
        completed_at=h.completed_at,
    )


@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
@limiter.limit("60/minute")
async def analyze_url(req: AnalyzeRequest, request: Request, response: Response, api_key: Optional[str] = Depends(verify_api_key)):
    """Analyze a media URL to fetch video/audio metadata, formats, and thumbnail preview."""
    url_str = str(req.url)
    try:
        validated_url = validate_url(url_str)
        await check_ssrf(validated_url)

        extractor = ExtractorRegistry.get_extractor(validated_url)
        if not extractor:
            raise UnsupportedSourceError(validated_url)

        info = await extractor.analyze(validated_url)
        return AnalyzeResponse(
            success=True,
            source=info.source or extractor.name,
            type=info.content_type,
            title=info.title,
            thumbnail=info.thumbnail,
            duration=info.duration,
            formats=info.formats,
            subtitles=info.subtitles,
            chapters=info.chapters,
            metadata=info.metadata,
        )
    except Exception as e:
        logger.error(f"Error analyzing URL {url_str}: {e}")
        raise handle_exception(e)


@router.post("/analyze-playlist", response_model=PlaylistAnalyzeResponse, tags=["Analysis"])
@limiter.limit("30/minute")
async def analyze_playlist(req: AnalyzeRequest, request: Request, response: Response, api_key: Optional[str] = Depends(verify_api_key)):
    """Analyze a playlist, album, or carousel URL to extract individual entry items."""
    url_str = str(req.url)
    try:
        validated_url = validate_url(url_str)
        await async_check_ssrf(validated_url)

        extractor = ExtractorRegistry.get_extractor(validated_url)
        if not extractor:
            raise UnsupportedSourceError(validated_url)

        return await extractor.extract_playlist(validated_url)
    except Exception as e:
        logger.error(f"Error analyzing playlist {url_str}: {e}")
        raise handle_exception(e)


@router.post("/download", response_model=DownloadResponse, tags=["Downloads"])
@limiter.limit("60/minute")
async def create_download(req: DownloadRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db), api_key: Optional[str] = Depends(verify_api_key)):
    """Queue a media download or schedule it for future automated execution."""
    url_str = str(req.url)
    try:
        validated_url = validate_url(url_str)
        await check_ssrf(validated_url)

        # Validate format_id against SSRF if passed as an HTTP/HTTPS stream URL
        if req.format_id and (req.format_id.startswith("http://") or req.format_id.startswith("https://")):
            validated_format_url = validate_url(req.format_id)
            await check_ssrf(validated_format_url)

        extractor = ExtractorRegistry.get_extractor(validated_url)
        source = extractor.name if extractor else "generic"

        download_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        extra_meta = dict(req.metadata) if req.metadata else {}
        if req.audio_only:
            extra_meta["audio_only"] = True
            extra_meta["audio_format"] = req.audio_format or "mp3"
            extra_meta["audio_bitrate"] = req.audio_bitrate or "320k"
            content_type = DBContentType.AUDIO
        elif source == "torrent" or validated_url.lower().startswith("magnet:?") or extra_meta.get("is_torrent"):
            content_type = DBContentType.TORRENT
        elif req.is_video:
            content_type = DBContentType.VIDEO
        elif req.is_audio:
            content_type = DBContentType.AUDIO
        elif (req.format and "image" in req.format.lower()) or (req.format_id and any(ext in req.format_id.lower() for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"])) or (source == "pinterest" and not req.is_video):
            content_type = DBContentType.IMAGE
        else:
            content_type = DBContentType.UNKNOWN

        ext = None
        if req.audio_only:
            ext = req.audio_format or "mp3"
        elif content_type == DBContentType.IMAGE:
            ext = "jpg"
            if req.format_id:
                for img_ext in ["png", "webp", "gif", "jpeg", "jpg"]:
                    if f".{img_ext}" in req.format_id.lower():
                        ext = img_ext
                        break
        elif req.is_video:
            ext = "mp4"

        if req.speed_limit_kbps:
            extra_meta["speed_limit_kbps"] = req.speed_limit_kbps
        if req.start_time is not None:
            extra_meta["start_time"] = req.start_time
        if req.end_time is not None:
            extra_meta["end_time"] = req.end_time
        if req.subtitle_langs:
            extra_meta["subtitle_langs"] = req.subtitle_langs
        if req.embed_subtitles:
            extra_meta["embed_subtitles"] = req.embed_subtitles
        if req.embed_chapters:
            extra_meta["embed_chapters"] = req.embed_chapters
        if req.sponsorblock_remove:
            extra_meta["sponsorblock_remove"] = req.sponsorblock_remove
        if req.subfolder:
            extra_meta["subfolder"] = req.subfolder

        format_label = req.format or (f"Audio {req.audio_format.upper() if req.audio_format else 'MP3'}" if req.audio_only else None)

        scheduled_at_clean = None
        is_scheduled = False
        if req.scheduled_at:
            sched = req.scheduled_at
            if sched.tzinfo is not None:
                sched = sched.astimezone(timezone.utc).replace(tzinfo=None)
            if sched > now:
                is_scheduled = True
                scheduled_at_clean = sched

        # Deduplicate: if this exact URL and format is already queued or downloading, return existing record
        existing_res = await db.execute(
            select(Download).where(
                Download.url == validated_url,
                Download.status.in_([DBDownloadStatus.DOWNLOADING, DBDownloadStatus.QUEUED]),
                Download.format_id == req.format_id,
            )
        )
        existing_dl = existing_res.scalar_one_or_none()
        if existing_dl:
            logger.info(f"URL {validated_url} (format {req.format_id}) is already active in queue ({existing_dl.id})")
            return DownloadResponse(
                id=existing_dl.id,
                status=DownloadStatus(existing_dl.status.value.lower()),
            )

        initial_status = DBDownloadStatus.SCHEDULED if is_scheduled else DBDownloadStatus.QUEUED

        # Create database record
        download = Download(
            id=download_id,
            url=validated_url,
            source=source,
            title=req.title,
            thumbnail=req.thumbnail,
            duration=req.duration,
            format=format_label,
            extension=ext,
            content_type=content_type,
            file_size=req.file_size or 0,
            status=initial_status,
            priority=req.priority,
            format_id=req.format_id,
            output_path=req.output_path,
            scheduled_at=scheduled_at_clean,
            extra_metadata=json.dumps(extra_meta) if extra_meta else None,
            created_at=now,
        )
        db.add(download)
        await db.commit()

        # Add to download queue if not scheduled
        if not is_scheduled:
            await queue_manager.add(download_id, priority=req.priority)

        return DownloadResponse(
            id=download_id,
            status=DownloadStatus.SCHEDULED if is_scheduled else DownloadStatus.QUEUED,
        )
    except Exception as e:
        logger.error(f"Error creating download for {url_str}: {e}")
        raise handle_exception(e)


@router.post("/batch-download", response_model=BatchDownloadResponse, tags=["Downloads"])
@limiter.limit("30/minute")
async def batch_download(req: BatchDownloadRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db), api_key: Optional[str] = Depends(verify_api_key)):
    """Queue multiple media URLs for download at once or schedule batch processing."""
    results: list[BatchDownloadResult] = []
    queued = 0
    failed = 0

    batch_meta = {}
    if req.audio_only:
        batch_meta["audio_only"] = True
        batch_meta["audio_format"] = req.audio_format or "mp3"
        batch_meta["audio_bitrate"] = req.audio_bitrate or "320k"
    if req.speed_limit_kbps:
        batch_meta["speed_limit_kbps"] = req.speed_limit_kbps
    if req.subfolder:
        batch_meta["subfolder"] = req.subfolder
    if req.subtitle_langs:
        batch_meta["subtitle_langs"] = req.subtitle_langs
    if req.embed_subtitles:
        batch_meta["embed_subtitles"] = req.embed_subtitles
    if req.embed_chapters:
        batch_meta["embed_chapters"] = req.embed_chapters
    if req.sponsorblock_remove:
        batch_meta["sponsorblock_remove"] = req.sponsorblock_remove

    scheduled_at_clean = None
    is_scheduled = False
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if req.scheduled_at:
        sched = req.scheduled_at
        if sched.tzinfo is not None:
            sched = sched.astimezone(timezone.utc).replace(tzinfo=None)
        if sched > now:
            is_scheduled = True
            scheduled_at_clean = sched

    initial_status = DBDownloadStatus.SCHEDULED if is_scheduled else DBDownloadStatus.QUEUED

    async def _validate_single_url(u: str) -> str:
        cleaned = u.strip()
        val = await asyncio.to_thread(validate_url, cleaned)
        await async_check_ssrf(val)
        return val

    # Validate URLs concurrently off the main thread to prevent event-loop starvation
    validation_results = await asyncio.gather(
        *(_validate_single_url(u) for u in req.urls),
        return_exceptions=True
    )

    downloads_to_enqueue: List[tuple[str, int]] = []
    item_meta_map = {im.url.strip(): im for im in req.items} if req.items else {}

    for raw_url, val_res in zip(req.urls, validation_results):
        if isinstance(val_res, Exception):
            logger.error(f"Batch download validation failed for {raw_url}: {val_res}")
            results.append(BatchDownloadResult(
                url=raw_url,
                status="failed",
                error=str(val_res),
            ))
            failed += 1
            continue

        try:
            validated_url = val_res

            extractor = ExtractorRegistry.get_extractor(validated_url)
            source = extractor.name if extractor else "generic"

            # Quick analyze to get title + thumbnail + format details
            title = None
            thumbnail = None
            duration = None
            detected_format = f"Audio {req.audio_format.upper() if req.audio_format else 'MP3'}" if req.audio_only else None
            detected_format_id = req.format_id
            detected_file_size = 0

            # 1. Use client-provided item metadata if available (instant queueing)
            if raw_url in item_meta_map:
                im = item_meta_map[raw_url]
                title = im.title
                thumbnail = im.thumbnail
                duration = im.duration
            # 2. For small ad-hoc batches (<= 5), perform quick live extraction if metadata wasn't provided
            elif extractor and len(req.urls) <= 5:
                try:
                    info = await asyncio.wait_for(extractor.analyze(validated_url), timeout=5.0)
                    title = info.title
                    thumbnail = info.thumbnail
                    duration = info.duration
                    if info.formats:
                        first_fmt = info.formats[0]
                        detected_format_id = detected_format_id or first_fmt.format_id
                        detected_format = detected_format or first_fmt.quality
                        detected_file_size = first_fmt.filesize or 0
                except Exception as analyze_err:
                    logger.warning(f"Batch analyze failed for {raw_url}: {analyze_err}")

            download_id = uuid.uuid4().hex[:12]

            if req.audio_only:
                content_type = DBContentType.AUDIO
            else:
                content_type = (
                    DBContentType.VIDEO if req.is_video
                    else (DBContentType.AUDIO if req.is_audio else DBContentType.UNKNOWN)
                )

            download = Download(
                id=download_id,
                url=validated_url,
                source=source,
                title=title,
                thumbnail=thumbnail,
                duration=duration,
                format=detected_format,
                content_type=content_type,
                file_size=detected_file_size,
                status=initial_status,
                priority=req.priority,
                format_id=detected_format_id,
                scheduled_at=scheduled_at_clean,
                extra_metadata=json.dumps(batch_meta) if batch_meta else None,
                created_at=now,
            )
            db.add(download)
            downloads_to_enqueue.append((download_id, req.priority))

            results.append(BatchDownloadResult(
                url=raw_url,
                id=download_id,
                status="scheduled" if is_scheduled else "queued",
                title=title,
            ))
            queued += 1

        except Exception as e:
            logger.error(f"Batch download failed for {raw_url}: {e}")
            results.append(BatchDownloadResult(
                url=raw_url,
                status="failed",
                error=str(e),
            ))
            failed += 1

    if downloads_to_enqueue:
        await db.commit()
        if not is_scheduled:
            for dl_id, prio in downloads_to_enqueue:
                await queue_manager.add(dl_id, priority=prio)

    return BatchDownloadResponse(
        total=len(req.urls),
        queued=queued,
        failed=failed,
        results=results,
    )


@router.get("/download/{download_id}", response_model=DownloadInfo, tags=["Downloads"])
async def get_download(download_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch status, speed, progress, and metadata for a specific download."""
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise HTTPException(status_code=404, detail="Download not found")
    return db_download_to_info(download)


@router.get("/download/{download_id}/stream", tags=["Downloads"])
async def stream_media_file(download_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Stream a downloaded media file supporting HTTP Range requests for seeking."""
    res = await db.execute(select(Download).where(Download.id == download_id))
    dl = res.scalar_one_or_none()
    file_path = None
    if dl and dl.output_path and os.path.exists(dl.output_path):
        file_path = dl.output_path
    else:
        h_res = await db.execute(select(DownloadHistory).where(DownloadHistory.id == download_id))
        hist = h_res.scalar_one_or_none()
        if hist and hist.output_path and os.path.exists(hist.output_path):
            file_path = hist.output_path

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Media file not found on disk")

    file_size = os.path.getsize(file_path)
    ext = os.path.splitext(file_path)[1].lower()
    mime_map = {
        ".mp4": "video/mp4",
        ".mkv": "video/mp4",
        ".webm": "video/webm",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".opus": "audio/opus",
        ".aac": "audio/aac",
    }
    media_type = mime_map.get(ext, "application/octet-stream")

    range_header = request.headers.get("Range")
    if not range_header:
        def full_file_gen():
            with open(file_path, "rb") as f:
                while chunk := f.read(65536):
                    yield chunk
        return StreamingResponse(
            full_file_gen(),
            media_type=media_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        )

    # Parse Range: bytes=start-end
    try:
        range_val = range_header.strip().replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        if start >= file_size or end >= file_size or start > end:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{file_size}"},
            )
    except Exception:
        return Response(status_code=400, content="Invalid Range header")

    chunk_size = (end - start) + 1

    def range_file_gen(offset: int, length: int):
        with open(file_path, "rb") as f:
            f.seek(offset)
            bytes_remaining = length
            while bytes_remaining > 0:
                read_size = min(bytes_remaining, 65536)
                data = f.read(read_size)
                if not data:
                    break
                bytes_remaining -= len(data)
                yield data

    return StreamingResponse(
        range_file_gen(start, chunk_size),
        status_code=206,
        media_type=media_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
        },
    )


@router.get("/download/{download_id}/probe", tags=["Downloads"])
async def probe_media_file(download_id: str, db: AsyncSession = Depends(get_db)):
    """Probe media container, codecs, resolution, and bitrates via ffprobe."""
    res = await db.execute(select(Download).where(Download.id == download_id))
    dl = res.scalar_one_or_none()
    output_path = dl.output_path if dl else None
    if not output_path or not os.path.exists(output_path):
        h_res = await db.execute(select(DownloadHistory).where(DownloadHistory.id == download_id))
        hist = h_res.scalar_one_or_none()
        if hist and hist.output_path and os.path.exists(hist.output_path):
            output_path = hist.output_path

    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Media file not found on disk")

    from services.ffmpeg import ffmpeg_service
    probe_data = await ffmpeg_service.probe(output_path)
    return probe_data


@router.post("/download/{download_id}/pause", tags=["Downloads"])
async def pause_download(download_id: str):
    """Pause an active download."""
    await download_engine.pause_download(download_id)
    await queue_manager.remove(download_id)
    return {"success": True}


@router.post("/download/{download_id}/resume", tags=["Downloads"])
async def resume_download(download_id: str, db: AsyncSession = Depends(get_db)):
    """Resume a paused download."""
    res = await db.execute(select(Download).where(Download.id == download_id))
    dl = res.scalar_one_or_none()
    if not dl:
        raise HTTPException(status_code=404, detail="Download not found")

    dl.status = DBDownloadStatus.QUEUED
    await db.commit()
    await queue_manager.add(download_id, priority=dl.priority or 0)
    return {"success": True}


@router.post("/download/{download_id}/cancel", tags=["Downloads"])
async def cancel_download(download_id: str):
    """Cancel a pending or active download."""
    await download_engine.cancel_download(download_id)
    await queue_manager.remove(download_id)
    return {"success": True}


@router.delete("/download/{download_id}", tags=["Downloads"])
async def delete_download(download_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a download record from active queue and history."""
    await download_engine.cancel_download(download_id)
    await queue_manager.remove(download_id)

    # Delete from downloads table
    await db.execute(delete(Download).where(Download.id == download_id))
    # Also delete from history table if present
    await db.execute(delete(DownloadHistory).where(DownloadHistory.id == download_id))
    await db.commit()
    return {"success": True}


@router.post("/download/{download_id}/retry", tags=["Downloads"])
async def retry_download(download_id: str, db: AsyncSession = Depends(get_db)):
    """Retry a failed or cancelled download."""
    res = await db.execute(select(Download).where(Download.id == download_id))
    dl = res.scalar_one_or_none()
    if not dl:
        raise HTTPException(status_code=404, detail="Download not found")

    dl.status = DBDownloadStatus.QUEUED
    dl.progress = 0
    dl.downloaded_size = 0
    dl.error = None
    dl.retries = (dl.retries or 0) + 1
    await db.commit()

    await queue_manager.add(download_id, priority=dl.priority or 0)
    return {"success": True}


@router.post("/queue/retry-failed", tags=["Queue"])
async def retry_all_failed_downloads(db: AsyncSession = Depends(get_db)):
    """Retry all currently failed downloads in bulk."""
    res = await db.execute(select(Download).where(Download.status == DBDownloadStatus.FAILED))
    failed_items = res.scalars().all()
    retried_count = 0
    for dl in failed_items:
        dl.status = DBDownloadStatus.QUEUED
        dl.progress = 0
        dl.downloaded_size = 0
        dl.error = None
        dl.retries = (dl.retries or 0) + 1
        retried_count += 1
    
    if retried_count > 0:
        await db.commit()
        for dl in failed_items:
            await queue_manager.add(dl.id, priority=dl.priority or 0)
            
    return {"success": True, "retried": retried_count}


@router.post("/queue/clear-failed", tags=["Queue"])
async def clear_all_failed_downloads(db: AsyncSession = Depends(get_db)):
    """Remove all failed downloads from queue in bulk."""
    res = await db.execute(select(Download).where(Download.status == DBDownloadStatus.FAILED))
    failed_items = res.scalars().all()
    cleared_count = len(failed_items)
    for dl in failed_items:
        await queue_manager.remove(dl.id)
        await db.delete(dl)
    
    if cleared_count > 0:
        await db.commit()
        
    return {"success": True, "cleared": cleared_count}


@router.delete("/queue", tags=["Queue"])
async def clear_entire_queue(db: AsyncSession = Depends(get_db)):
    """Clear all pending, active, and failed downloads from the queue."""
    for dl_id in list(queue_manager.active_downloads):
        try:
            await download_engine.cancel_download(dl_id)
        except Exception:
            pass
    queue_manager.queue.clear()
    queue_manager.active_downloads.clear()
    await db.execute(delete(Download))
    await db.commit()
    return {"success": True}


@router.post("/system/reset-data", tags=["System"])
async def reset_all_application_data(db: AsyncSession = Depends(get_db)):
    """Permanently wipe all download queue items and history records."""
    for dl_id in list(queue_manager.active_downloads):
        try:
            await download_engine.cancel_download(dl_id)
        except Exception:
            pass
    queue_manager.queue.clear()
    queue_manager.active_downloads.clear()
    await db.execute(delete(Download))
    await db.execute(delete(DownloadHistory))
    await db.commit()
    return {"success": True}


@router.get("/queue", response_model=QueueStatus, tags=["Queue"])
async def get_queue(db: AsyncSession = Depends(get_db)):
    """Get overall status of active downloads, queue size, and scheduler jobs."""
    result = await db.execute(
        select(Download).order_by(desc(Download.priority), desc(Download.created_at))
    )
    downloads = result.scalars().all()

    active_count = sum(1 for d in downloads if d.status == DBDownloadStatus.DOWNLOADING)
    queued_count = sum(1 for d in downloads if d.status == DBDownloadStatus.QUEUED)
    completed_count = sum(1 for d in downloads if d.status == DBDownloadStatus.COMPLETED)
    failed_count = sum(1 for d in downloads if d.status == DBDownloadStatus.FAILED)
    scheduled_count = sum(1 for d in downloads if d.status == DBDownloadStatus.SCHEDULED)

    return QueueStatus(
        downloads=[db_download_to_info(d) for d in downloads],
        active_count=active_count,
        queued_count=queued_count,
        completed_count=completed_count,
        failed_count=failed_count,
        scheduled_count=scheduled_count,
        max_concurrent=queue_manager.max_concurrent,
    )


@router.get("/history", response_model=List[HistoryItem], tags=["History"])
async def get_history(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical download entries with full-text search, filtering, and sorting."""
    query = select(DownloadHistory)

    if search:
        search_fmt = f"%{search}%"
        query = query.where(
            (DownloadHistory.title.ilike(search_fmt))
            | (DownloadHistory.filename.ilike(search_fmt))
            | (DownloadHistory.url.ilike(search_fmt))
        )

    if source:
        query = query.where(DownloadHistory.source == source)

    if status:
        query = query.where(DownloadHistory.status == status)

    sort_by_str = sort_by if isinstance(sort_by, str) else "created_at"
    order_col = getattr(DownloadHistory, sort_by_str, DownloadHistory.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(order_col))
    else:
        query = query.order_by(desc(order_col))

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()

    return [db_history_to_item(h) for h in items]


@router.delete("/history", tags=["History"])
async def clear_history(db: AsyncSession = Depends(get_db)):
    """Delete all records from the download history."""
    await db.execute(delete(DownloadHistory))
    await db.commit()
    return {"success": True}


@router.get("/history/export", tags=["History"])
async def export_history(
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Export download history as JSON or CSV."""
    result = await db.execute(select(DownloadHistory).order_by(desc(DownloadHistory.created_at)))
    items = result.scalars().all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "url", "source", "title", "filename", "file_size", "format", "status", "created_at", "completed_at"])
        for item in items:
            writer.writerow([
                item.id,
                item.url,
                item.source,
                item.title or "",
                item.filename or "",
                item.file_size or 0,
                item.format or "",
                item.status.value if hasattr(item.status, "value") else str(item.status),
                item.created_at.isoformat() if item.created_at else "",
                item.completed_at.isoformat() if item.completed_at else "",
            ])
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=omnidownload_history.csv"},
        )
    else:
        data = [
            {
                "id": item.id,
                "url": item.url,
                "source": item.source,
                "title": item.title,
                "filename": item.filename,
                "file_size": item.file_size,
                "format": item.format,
                "status": item.status.value if hasattr(item.status, "value") else str(item.status),
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            }
            for item in items
        ]
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=omnidownload_history.json"},
        )


@router.post("/history/import", tags=["History"])
async def import_history(
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Import download history records from a JSON or CSV file."""
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8", errors="ignore")
    records = []

    try:
        if file.filename and file.filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content))
            records = list(reader)
        else:
            records = json.loads(content)
            if not isinstance(records, list):
                records = [records]
    except Exception as parse_err:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(parse_err)}")

    imported_count = 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for r in records:
        hid = r.get("id") or uuid.uuid4().hex[:12]
        existing = await db.execute(select(DownloadHistory).where(DownloadHistory.id == hid))
        if existing.scalar_one_or_none():
            continue

        hist = DownloadHistory(
            id=hid,
            url=r.get("url", ""),
            source=r.get("source", "generic"),
            title=r.get("title"),
            filename=r.get("filename"),
            file_size=int(r.get("file_size") or 0),
            format=r.get("format"),
            status=DBDownloadStatus.COMPLETED,
            created_at=now,
            completed_at=now,
        )
        db.add(hist)
        imported_count += 1

    await db.commit()
    return {"success": True, "imported_count": imported_count}


@router.get("/analytics/stats", response_model=AnalyticsStatsResponse, tags=["Analytics"])
async def get_analytics_stats(db: AsyncSession = Depends(get_db)):
    """Get aggregated bandwidth, platform distribution, success metrics, and 7-day timeline."""
    from datetime import timedelta

    hist_result = await db.execute(select(DownloadHistory))
    history_items = hist_result.scalars().all()

    dl_result = await db.execute(select(Download))
    active_dls = dl_result.scalars().all()

    total_downloads = len(history_items) + len(active_dls)
    completed_downloads = sum(1 for h in history_items if h.status == DBDownloadStatus.COMPLETED) + sum(1 for d in active_dls if d.status == DBDownloadStatus.COMPLETED)
    failed_downloads = sum(1 for h in history_items if h.status == DBDownloadStatus.FAILED) + sum(1 for d in active_dls if d.status == DBDownloadStatus.FAILED)

    active_statuses = {DBDownloadStatus.DOWNLOADING, DBDownloadStatus.QUEUED}
    active_downloads = sum(1 for d in active_dls if d.status in active_statuses)
    scheduled_downloads = sum(1 for d in active_dls if d.status == DBDownloadStatus.SCHEDULED)

    total_bytes = sum(h.file_size or 0 for h in history_items if h.status == DBDownloadStatus.COMPLETED) + sum(d.downloaded_size or 0 for d in active_dls)

    resolved_count = completed_downloads + failed_downloads
    success_rate = round((completed_downloads / resolved_count * 100.0), 1) if resolved_count > 0 else 100.0

    # Source platforms
    source_counts: dict[str, int] = {}
    for item in history_items:
        src = (item.source or "generic").capitalize()
        source_counts[src] = source_counts.get(src, 0) + 1
    for d in active_dls:
        src = (d.source or "generic").capitalize()
        source_counts[src] = source_counts.get(src, 0) + 1

    source_total = sum(source_counts.values()) or 1
    sorted_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    sources = [
        SourceStat(source=s_name, count=cnt, percentage=round((cnt / source_total) * 100.0, 1))
        for s_name, cnt in sorted_sources
    ]

    # Format distribution
    format_counts: dict[str, int] = {}
    for item in history_items:
        fmt = (item.extension or item.format or "unknown").lower()
        if fmt.startswith("."):
            fmt = fmt[1:]
        if len(fmt) > 10 or not fmt.isalnum():
            fmt = "other"
        format_counts[fmt] = format_counts.get(fmt, 0) + 1
    for d in active_dls:
        fmt = (d.extension or d.format or "unknown").lower()
        if fmt.startswith("."):
            fmt = fmt[1:]
        if len(fmt) > 10 or not fmt.isalnum():
            fmt = "other"
        format_counts[fmt] = format_counts.get(fmt, 0) + 1

    formats = [
        FormatStat(format=fmt.upper(), count=cnt)
        for fmt, cnt in sorted(format_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    # Daily activity for last 7 days
    today = datetime.now(timezone.utc).date()
    daily_map = {(today - timedelta(days=i)).isoformat(): {"count": 0, "bytes": 0} for i in range(6, -1, -1)}

    for item in history_items:
        if item.created_at:
            d_str = item.created_at.date().isoformat()
            if d_str in daily_map:
                daily_map[d_str]["count"] += 1
                daily_map[d_str]["bytes"] += (item.file_size or 0)
    for d in active_dls:
        if d.created_at:
            d_str = d.created_at.date().isoformat()
            if d_str in daily_map:
                daily_map[d_str]["count"] += 1
                daily_map[d_str]["bytes"] += (d.downloaded_size or 0)

    daily_activity = [
        DailyActivity(date=d_key, count=vals["count"], bytes=vals["bytes"])
        for d_key, vals in sorted(daily_map.items())
    ]

    return AnalyticsStatsResponse(
        total_downloads=total_downloads,
        completed_downloads=completed_downloads,
        failed_downloads=failed_downloads,
        active_downloads=active_downloads,
        scheduled_downloads=scheduled_downloads,
        total_bytes=total_bytes,
        success_rate=success_rate,
        sources=sources,
        formats=formats,
        daily_activity=daily_activity,
    )



@router.get("/settings", response_model=SettingsModel, tags=["Settings"])
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Fetch current system configuration including download directories and concurrency limits."""
    result = await db.execute(select(DBSettings))
    rows = result.scalars().all()
    db_dict = {}
    for row in rows:
        try:
            db_dict[row.key] = json.loads(row.value)
        except Exception:
            pass

    raw_dir = db_dict.get("download_dir", settings.download_dir)
    try:
        clean_dir = sanitize_folder_path(raw_dir)
        settings.download_dir = clean_dir
    except Exception:
        clean_dir = settings.download_dir

    return SettingsModel(
        download_dir=clean_dir,
        max_concurrent_downloads=db_dict.get(
            "max_concurrent_downloads", queue_manager.max_concurrent
        ),
        max_download_speed=db_dict.get("max_download_speed"),
        retry_count=db_dict.get("retry_count", settings.default_retries),
        preferred_video_format=db_dict.get("preferred_video_format", "mp4"),
        preferred_audio_format=db_dict.get("preferred_audio_format", "mp3"),
        default_quality=db_dict.get("default_quality", "best"),
        auto_merge_audio_video=db_dict.get("auto_merge_audio_video", True),
        delete_temp_files=db_dict.get("delete_temp_files", True),
        theme=db_dict.get("theme", "system"),
        api_key=db_dict.get("api_key"),
        require_api_key=db_dict.get("require_api_key", False),
        rate_limit_per_minute=db_dict.get("rate_limit_per_minute", 60),
        enable_segmented_download=db_dict.get("enable_segmented_download", True),
        segmented_connections=db_dict.get("segmented_connections", 8),
        aria2_enabled=db_dict.get("aria2_enabled", True),
        aria2_path=db_dict.get("aria2_path"),
        aria2_rpc_url=db_dict.get("aria2_rpc_url", "http://127.0.0.1:6800/jsonrpc"),
        aria2_rpc_secret=db_dict.get("aria2_rpc_secret"),
        auto_tag_audio=db_dict.get("auto_tag_audio", True),
        embed_album_art=db_dict.get("embed_album_art", True),
    )


@router.put("/settings", response_model=SettingsModel, tags=["Settings"])
async def update_settings(
    update_data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Update system preferences and runtime engine parameters."""
    update_dict = update_data.model_dump(exclude_unset=True)

    if "download_dir" in update_dict and update_dict["download_dir"]:
        try:
            clean_dir = sanitize_folder_path(update_dict["download_dir"])
            os.makedirs(clean_dir, exist_ok=True)
            update_dict["download_dir"] = clean_dir
            settings.download_dir = clean_dir
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid download directory path: {str(e)}")

    for key, value in update_dict.items():
        val_json = json.dumps(value)
        existing = await db.execute(select(DBSettings).where(DBSettings.key == key))
        row = existing.scalar_one_or_none()
        if row:
            row.value = val_json
        else:
            db.add(DBSettings(key=key, value=val_json))

    await db.commit()

    if update_data.max_concurrent_downloads is not None:
        queue_manager.max_concurrent = update_data.max_concurrent_downloads

    return await get_settings(db)


@router.post("/settings/api-key/generate", response_model=ApiKeyGenerateResponse, tags=["Settings"])
async def generate_api_key(
    db: AsyncSession = Depends(get_db),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Generate a new secure API key for external apps and CLI/extensions."""
    raw_key = f"omni_live_{secrets.token_hex(20)}"
    val_json = json.dumps(raw_key)

    existing = await db.execute(select(DBSettings).where(DBSettings.key == "api_key"))
    row = existing.scalar_one_or_none()
    if row:
        row.value = val_json
    else:
        db.add(DBSettings(key="api_key", value=val_json))
    await db.commit()

    return ApiKeyGenerateResponse(
        api_key=raw_key,
        created_at=datetime.now(timezone.utc),
        message="API Key generated successfully. Save this key in a secure location.",
    )


@router.delete("/settings/api-key", tags=["Settings"])
async def delete_api_key(
    db: AsyncSession = Depends(get_db),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Revoke active API key and disable required authentication."""
    await db.execute(delete(DBSettings).where(DBSettings.key.in_(["api_key", "require_api_key"])))
    await db.commit()
    return {"success": True, "message": "API Key revoked successfully."}


@router.get("/settings/cookies", response_model=CookieStatusResponse, tags=["Settings"])
async def get_cookie_status():
    """Check whether Netscape cookies.txt is currently loaded and active."""
    cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")
    if not os.path.exists(cookies_path):
        return CookieStatusResponse(exists=False, size=0, line_count=0, updated_at=None)

    stat = os.stat(cookies_path)
    line_count = 0
    try:
        with open(cookies_path, "r", encoding="utf-8", errors="ignore") as f:
            line_count = sum(1 for line in f if line.strip() and not line.strip().startswith("#"))
    except Exception:
        pass

    updated_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
    return CookieStatusResponse(
        exists=True,
        size=stat.st_size,
        line_count=line_count,
        updated_at=updated_at,
    )


@router.post("/settings/cookies", tags=["Settings"])
async def upload_cookies(
    request: Request,
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Upload or paste Netscape-format cookies.txt for authenticated media downloads."""
    os.makedirs(os.path.join(os.getcwd(), "data"), exist_ok=True)
    cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")

    content = ""
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        try:
            body = await request.json()
            content = body.get("raw_content", "") or body.get("content", "")
        except Exception:
            pass
    elif file:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
    elif raw_content:
        content = raw_content

    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="No cookie data or text provided")

    with open(cookies_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {"success": True, "message": "Cookies saved successfully"}


@router.delete("/settings/cookies", tags=["Settings"])
async def delete_cookies(
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Remove loaded cookies."""
    cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")
    if os.path.exists(cookies_path):
        os.remove(cookies_path)
    return {"success": True, "message": "Cookies deleted successfully"}



@router.get("/extractors", tags=["Extractors"])
async def get_extractors():
    """List all registered media extractors and their recognized web domains."""
    exts = ExtractorRegistry.get_all_extractors()
    return {
        "extractors": [{"name": e.name, "domains": e.domains} for e in exts]
    }


@router.get("/download/{download_id}/file", tags=["Downloads"])
async def get_download_file(download_id: str, db: AsyncSession = Depends(get_db)):
    """Stream or download the completed local file."""
    result = await db.execute(select(Download).where(Download.id == download_id))
    dl = result.scalar_one_or_none()
    if not dl or not dl.output_path or not os.path.exists(dl.output_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=dl.output_path,
        filename=dl.filename or os.path.basename(dl.output_path),
        media_type="application/octet-stream",
    )


class OpenFolderRequest(BaseModel):
    download_id: Optional[str] = None
    path: Optional[str] = None


@router.post("/open-folder", tags=["System"])
async def open_folder(
    req: OpenFolderRequest,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Reveal a downloaded file or open target directory in the OS file explorer."""
    target_path = None
    if req.download_id:
        result = await db.execute(select(Download).where(Download.id == req.download_id))
        dl = result.scalar_one_or_none()
        if dl:
            if dl.output_path:
                target_path = dl.output_path
            else:
                raise HTTPException(status_code=404, detail="Download has no output file yet")
        else:
            res_h = await db.execute(select(DownloadHistory).where(DownloadHistory.id == req.download_id))
            hist = res_h.scalar_one_or_none()
            if hist:
                if hist.output_path:
                    target_path = hist.output_path
                else:
                    raise HTTPException(status_code=404, detail="Download has no output file yet")
            else:
                raise HTTPException(status_code=404, detail="Download not found")

    if not target_path and req.path:
        target_path = req.path

    if not target_path:
        target_path = settings.download_dir

    try:
        target_path = sanitize_folder_path(target_path)
    except Exception:
        target_path = settings.download_dir

    norm_path = os.path.normpath(os.path.abspath(target_path))

    # Security check: if path was provided directly (not from verified download_id),
    # ensure it is restricted to download_dir or temp_dir to prevent arbitrary host probes.
    if not req.download_id:
        allowed_dirs = [
            os.path.normpath(os.path.abspath(settings.download_dir)),
            os.path.normpath(os.path.abspath(settings.temp_dir)),
        ]
        is_allowed = False
        for allowed_dir in allowed_dirs:
            try:
                if os.path.commonpath([norm_path, allowed_dir]) == allowed_dir:
                    is_allowed = True
                    break
            except ValueError:
                continue
        if not is_allowed:
            raise HTTPException(
                status_code=403,
                detail="Access restricted: folder path must be within the downloads directory",
            )

    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="Target file or directory does not exist on disk")

    try:
        cur_os = platform.system()
        is_file = os.path.isfile(norm_path)
        folder_path = os.path.dirname(norm_path) if is_file else norm_path

        if cur_os == "Windows" or os.name == "nt":
            if is_file:
                subprocess.Popen(["explorer.exe", f"/select,{norm_path}"], shell=False)
            else:
                subprocess.Popen(["explorer.exe", norm_path], shell=False)
        elif cur_os == "Darwin":
            if is_file:
                subprocess.Popen(["open", "-R", norm_path], shell=False)
            else:
                subprocess.Popen(["open", folder_path], shell=False)
        else:
            subprocess.Popen(["xdg-open", folder_path], shell=False)

        return {"success": True, "path": norm_path, "folder": folder_path}
    except Exception as e:
        logger.error(f"Error opening folder for {norm_path}: {e}")
        return {"success": False, "error": str(e), "path": norm_path}


@router.post("/download/{download_id}/open-folder", tags=["System"])
async def open_download_folder(
    download_id: str,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Reveal a specific download in the OS file explorer."""
    return await open_folder(OpenFolderRequest(download_id=download_id), db, api_key)


@router.get("/system/aria2-status", tags=["System"])
async def get_aria2_status():
    """Returns detected status, path, and version of aria2 engine."""
    from services.aria2 import aria2_service
    return await aria2_service.get_system_status()


@router.post("/torrent/upload", response_model=AnalyzeResponse, tags=["Downloads"])
async def upload_torrent_file(
    file: UploadFile = File(...),
    api_key: Optional[str] = Depends(verify_api_key),
):
    """Upload a .torrent file to analyze and extract metadata."""
    if not file.filename or not file.filename.lower().endswith(".torrent"):
        raise HTTPException(status_code=400, detail="Only .torrent files are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Torrent file exceeds 10MB limit.")

    import base64
    b64_content = base64.b64encode(content).decode("utf-8")
    title = file.filename[:-8] if file.filename.lower().endswith(".torrent") else file.filename
    clean_title = sanitize_filename(title)

    formats = [
        FormatModel(
            format_id="torrent_file",
            quality="BitTorrent P2P",
            extension="bin",
            filesize=len(content),
            protocol="bittorrent",
            is_video=False,
            is_audio=False,
        )
    ]

    return AnalyzeResponse(
        success=True,
        source="torrent",
        type=ContentType.TORRENT,
        title=clean_title,
        thumbnail=None,
        duration=None,
        formats=formats,
        metadata={
            "torrent_bytes": b64_content,
            "filename": file.filename,
            "is_torrent": True,
        },
    )


