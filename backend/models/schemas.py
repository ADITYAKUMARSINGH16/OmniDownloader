from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional, List, Literal, Any
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    DOCUMENT = "document"
    ARCHIVE = "archive"
    UNKNOWN = "unknown"


class DownloadStatus(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FormatModel(BaseModel):
    format_id: str
    quality: str
    extension: str
    filesize: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    fps: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    bitrate: Optional[float] = None
    protocol: Optional[str] = None
    is_video: bool = False
    is_audio: bool = False


class AnalyzeRequest(BaseModel):
    url: HttpUrl
    
    @field_validator("url", mode="before")
    @classmethod
    def validate_url(cls, v):
        return str(v)


class AnalyzeResponse(BaseModel):
    success: bool = True
    source: str
    type: ContentType
    title: str
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    formats: List[FormatModel] = []
    metadata: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict[str, Any]


class DownloadRequest(BaseModel):
    url: HttpUrl
    format_id: Optional[str] = None
    output_path: Optional[str] = None
    priority: int = 0
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    format: Optional[str] = None
    file_size: Optional[int] = None
    is_video: Optional[bool] = None
    is_audio: Optional[bool] = None
    
    @field_validator("url", mode="before")
    @classmethod
    def validate_url(cls, v):
        return str(v)


class DownloadResponse(BaseModel):
    id: str
    status: DownloadStatus = DownloadStatus.QUEUED


class DownloadInfo(BaseModel):
    id: str
    url: str
    source: str
    title: Optional[str] = None
    filename: Optional[str] = None
    file_size: int = 0
    downloaded_size: int = 0
    format: Optional[str] = None
    format_id: Optional[str] = None
    extension: Optional[str] = None
    content_type: ContentType = ContentType.UNKNOWN
    status: DownloadStatus
    progress: float = 0.0
    speed: int = 0
    eta: int = 0
    priority: int = 0
    retries: int = 0
    max_retries: int = 3
    error: Optional[str] = None
    output_path: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProgressUpdate(BaseModel):
    id: str
    status: DownloadStatus
    progress: float
    downloaded: int
    total: int
    speed: int
    eta: int


class QueueStatus(BaseModel):
    downloads: List[DownloadInfo]
    active_count: int
    queued_count: int
    completed_count: int
    failed_count: int
    max_concurrent: int


class HistoryItem(BaseModel):
    id: str
    url: str
    source: str
    title: Optional[str] = None
    filename: Optional[str] = None
    file_size: int = 0
    format: Optional[str] = None
    extension: Optional[str] = None
    content_type: ContentType = ContentType.UNKNOWN
    status: DownloadStatus
    output_path: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    metadata: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class SettingsModel(BaseModel):
    download_dir: str
    max_concurrent_downloads: int
    max_download_speed: Optional[int] = None
    retry_count: int
    preferred_video_format: str
    preferred_audio_format: str
    default_quality: str
    auto_merge_audio_video: bool
    delete_temp_files: bool
    theme: Literal["light", "dark", "system"] = "system"


class SettingsUpdate(BaseModel):
    download_dir: Optional[str] = None
    max_concurrent_downloads: Optional[int] = None
    max_download_speed: Optional[int] = None
    retry_count: Optional[int] = None
    preferred_video_format: Optional[str] = None
    preferred_audio_format: Optional[str] = None
    default_quality: Optional[str] = None
    auto_merge_audio_video: Optional[bool] = None
    delete_temp_files: Optional[bool] = None
    theme: Optional[Literal["light", "dark", "system"]] = None