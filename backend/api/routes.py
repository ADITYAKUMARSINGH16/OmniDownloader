import os
import uuid
import json
import logging
import subprocess
import platform
from typing import Optional, List, Any
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, update, delete, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db, AsyncSessionLocal
from core.exceptions import handle_exception, NotFoundError, ValidationError, UnsupportedSourceError
from core.security import validate_url, check_ssrf, sanitize_folder_path
from models.database import Download, DownloadHistory, Settings as DBSettings, DownloadStatus as DBDownloadStatus, ContentType as DBContentType
from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DownloadRequest,
    DownloadResponse,
    DownloadInfo,
    QueueStatus,
    HistoryItem,
    SettingsModel,
    SettingsUpdate,
    FormatModel,
    ContentType,
    DownloadStatus,
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


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_url(req: AnalyzeRequest):
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


@router.post("/download", response_model=DownloadResponse)
async def create_download(req: DownloadRequest, db: AsyncSession = Depends(get_db)):
    url_str = str(req.url)
    try:
        validated_url = validate_url(url_str)
        await check_ssrf(validated_url)

        extractor = ExtractorRegistry.get_extractor(validated_url)
        source = extractor.name if extractor else "generic"

        download_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        content_type = DBContentType.VIDEO if req.is_video else (DBContentType.AUDIO if req.is_audio else DBContentType.UNKNOWN)

        # Create database record
        download = Download(
            id=download_id,
            url=validated_url,
            source=source,
            title=req.title,
            thumbnail=req.thumbnail,
            duration=req.duration,
            format=req.format,
            content_type=content_type,
            file_size=req.file_size or 0,
            status=DBDownloadStatus.QUEUED,
            priority=req.priority,
            format_id=req.format_id,
            output_path=req.output_path,
            created_at=now,
        )
        db.add(download)
        await db.commit()

        # Add to download queue
        await queue_manager.add(download_id, priority=req.priority)

        return DownloadResponse(id=download_id, status=DownloadStatus.QUEUED)
    except Exception as e:
        logger.error(f"Error creating download for {url_str}: {e}")
        raise handle_exception(e)


@router.get("/download/{download_id}", response_model=DownloadInfo)
async def get_download(download_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise HTTPException(status_code=404, detail="Download not found")
    return db_download_to_info(download)


@router.post("/download/{download_id}/pause")
async def pause_download(download_id: str):
    await download_engine.pause_download(download_id)
    await queue_manager.remove(download_id)
    return {"success": True}


@router.post("/download/{download_id}/resume")
async def resume_download(download_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Download).where(Download.id == download_id))
    dl = res.scalar_one_or_none()
    if not dl:
        raise HTTPException(status_code=404, detail="Download not found")

    dl.status = DBDownloadStatus.QUEUED
    await db.commit()
    await queue_manager.add(download_id, priority=dl.priority or 0)
    return {"success": True}


@router.post("/download/{download_id}/cancel")
async def cancel_download(download_id: str):
    await download_engine.cancel_download(download_id)
    await queue_manager.remove(download_id)
    return {"success": True}


@router.delete("/download/{download_id}")
async def delete_download(download_id: str, db: AsyncSession = Depends(get_db)):
    await download_engine.cancel_download(download_id)
    await queue_manager.remove(download_id)

    # Delete from downloads table
    await db.execute(delete(Download).where(Download.id == download_id))
    # Also delete from history table if present
    await db.execute(delete(DownloadHistory).where(DownloadHistory.id == download_id))
    await db.commit()
    return {"success": True}


@router.post("/download/{download_id}/retry")
async def retry_download(download_id: str, db: AsyncSession = Depends(get_db)):
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


@router.get("/queue", response_model=QueueStatus)
async def get_queue(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Download).order_by(desc(Download.priority), desc(Download.created_at))
    )
    downloads = result.scalars().all()

    active_count = sum(1 for d in downloads if d.status == DBDownloadStatus.DOWNLOADING)
    queued_count = sum(1 for d in downloads if d.status == DBDownloadStatus.QUEUED)
    completed_count = sum(1 for d in downloads if d.status == DBDownloadStatus.COMPLETED)
    failed_count = sum(1 for d in downloads if d.status == DBDownloadStatus.FAILED)

    return QueueStatus(
        downloads=[db_download_to_info(d) for d in downloads],
        active_count=active_count,
        queued_count=queued_count,
        completed_count=completed_count,
        failed_count=failed_count,
        max_concurrent=queue_manager.max_concurrent,
    )


@router.get("/history", response_model=List[HistoryItem])
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


@router.delete("/history")
async def clear_history(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(DownloadHistory))
    await db.commit()
    return {"success": True}


@router.get("/settings", response_model=SettingsModel)
async def get_settings(db: AsyncSession = Depends(get_db)):
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
    )


@router.put("/settings", response_model=SettingsModel)
async def update_settings(update_data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
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


@router.get("/extractors")
async def get_extractors():
    exts = ExtractorRegistry.get_all_extractors()
    return {
        "extractors": [{"name": e.name, "domains": e.domains} for e in exts]
    }


@router.get("/download/{download_id}/file")
async def get_download_file(download_id: str, db: AsyncSession = Depends(get_db)):
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


@router.post("/open-folder")
async def open_folder(req: OpenFolderRequest, db: AsyncSession = Depends(get_db)):
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


@router.post("/download/{download_id}/open-folder")
async def open_download_folder(download_id: str, db: AsyncSession = Depends(get_db)):
    return await open_folder(OpenFolderRequest(download_id=download_id), db)

