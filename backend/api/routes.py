import os
import io
import csv
import uuid
import json
import logging
import subprocess
import platform
import secrets
from typing import Optional, List, Any
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query, status, Response, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, update, delete, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db, AsyncSessionLocal
from core.exceptions import handle_exception, NotFoundError, ValidationError, UnsupportedSourceError
from core.security import validate_url, check_ssrf, sanitize_folder_path, verify_api_key
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
        file_size=d.file_size or 0,
        downloaded_size=d.downloaded_size or 0,
        format=d.format,
        format_id=d.format_id,
        extension=d.extension,
        content_type=ContentType(d.content_type.value) if d.content_type else ContentType.UNKNOWN,
        status=DownloadStatus(d.status.value) if d.status else DownloadStatus.QUEUED,
        progress=float(d.progress or 0),
        speed=d.speed or 0,
        eta=d.eta or 0,
        priority=d.priority or 0,
        retries=d.retries or 0,
        max_retries=d.max_retries or 3,
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
        file_size=h.file_size or 0,
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
            metadata=info.metadata,
        )
    except Exception as e:
        logger.error(f"Error analyzing URL {url_str}: {e}")
        raise handle_exception(e)


@router.post("/download", response_model=DownloadResponse, tags=["Downloads"])
@limiter.limit("60/minute")
async def create_download(req: DownloadRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db), api_key: Optional[str] = Depends(verify_api_key)):
    """Queue a media download or schedule it for future automated execution."""
    url_str = str(req.url)
    try:
        validated_url = validate_url(url_str)
        await check_ssrf(validated_url)

        extractor = ExtractorRegistry.get_extractor(validated_url)
        source = extractor.name if extractor else "generic"

        download_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        extra_meta = {}
        if req.audio_only:
            extra_meta["audio_only"] = True
            extra_meta["audio_format"] = req.audio_format or "mp3"
            extra_meta["audio_bitrate"] = req.audio_bitrate or "320k"
            content_type = DBContentType.AUDIO
        else:
            content_type = DBContentType.VIDEO if req.is_video else (DBContentType.AUDIO if req.is_audio else DBContentType.UNKNOWN)

        if req.speed_limit_kbps:
            extra_meta["speed_limit_kbps"] = req.speed_limit_kbps

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

    for raw_url in req.urls:
        try:
            validated_url = validate_url(raw_url.strip())
            await check_ssrf(validated_url)

            extractor = ExtractorRegistry.get_extractor(validated_url)
            source = extractor.name if extractor else "generic"

            # Quick analyze to get title + thumbnail + format details
            title = None
            thumbnail = None
            duration = None
            detected_format = f"Audio {req.audio_format.upper() if req.audio_format else 'MP3'}" if req.audio_only else None
            detected_format_id = req.format_id
            detected_file_size = 0

            if extractor:
                try:
                    info = await extractor.analyze(validated_url)
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
            await db.commit()

            if not is_scheduled:
                await queue_manager.add(download_id, priority=req.priority)

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
    format: str = Query("json", regex="^(json|csv)$"),
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
    )


@router.put("/settings", response_model=SettingsModel, tags=["Settings"])
async def update_settings(update_data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
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
async def generate_api_key(db: AsyncSession = Depends(get_db)):
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
async def delete_api_key(db: AsyncSession = Depends(get_db)):
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
async def delete_cookies():
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
async def open_folder(req: OpenFolderRequest, db: AsyncSession = Depends(get_db)):
    """Reveal a downloaded file or open target directory in the OS file explorer."""
    target_path = None
    if req.download_id:
        result = await db.execute(select(Download).where(Download.id == req.download_id))
        dl = result.scalar_one_or_none()
        if dl and dl.output_path:
            target_path = dl.output_path
        else:
            res_h = await db.execute(select(DownloadHistory).where(DownloadHistory.id == req.download_id))
            hist = res_h.scalar_one_or_none()
            if hist and hist.output_path:
                target_path = hist.output_path

    if not target_path and req.path:
        target_path = req.path

    if not target_path:
        target_path = settings.download_dir

    try:
        target_path = sanitize_folder_path(target_path)
    except Exception:
        target_path = settings.download_dir

    full_path = os.path.abspath(target_path)
    folder_path = os.path.dirname(full_path) if os.path.isfile(full_path) else full_path
    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)

    try:
        cur_os = platform.system()
        if cur_os == "Windows":
            if os.path.isfile(full_path):
                subprocess.Popen(f'explorer /select,"{full_path}"')
            else:
                subprocess.Popen(f'explorer "{folder_path}"')
        elif cur_os == "Darwin":
            if os.path.isfile(full_path):
                subprocess.Popen(["open", "-R", full_path])
            else:
                subprocess.Popen(["open", folder_path])
        else:
            subprocess.Popen(["xdg-open", folder_path])

        return {"success": True, "path": full_path, "folder": folder_path}
    except Exception as e:
        logger.error(f"Error opening folder for {full_path}: {e}")
        return {"success": False, "error": str(e), "path": full_path}


@router.post("/download/{download_id}/open-folder", tags=["System"])
async def open_download_folder(download_id: str, db: AsyncSession = Depends(get_db)):
    """Reveal a specific download in the OS file explorer."""
    return await open_folder(OpenFolderRequest(download_id=download_id), db)

