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
    SCHEDULED = "scheduled"
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
    audio_only: Optional[bool] = False
    audio_format: Optional[str] = "mp3"
    audio_bitrate: Optional[str] = "320k"
    speed_limit_kbps: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    
    @field_validator("url", mode="before")
    @classmethod
    def validate_url(cls, v):
        return str(v)


class DownloadResponse(BaseModel):
    id: str
    status: DownloadStatus = DownloadStatus.QUEUED


class BatchDownloadRequest(BaseModel):
    urls: List[str]
    format_id: Optional[str] = None
    priority: int = 0
    is_video: Optional[bool] = None
    is_audio: Optional[bool] = None
    audio_only: Optional[bool] = False
    audio_format: Optional[str] = "mp3"
    audio_bitrate: Optional[str] = "320k"
    speed_limit_kbps: Optional[int] = None
    scheduled_at: Optional[datetime] = None

    @field_validator("urls", mode="before")
    @classmethod
    def validate_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one URL is required")
        if len(v) > 50:
            raise ValueError("Maximum 50 URLs per batch")
        return [str(u).strip() for u in v if str(u).strip()]


class BatchDownloadResult(BaseModel):
    url: str
    id: Optional[str] = None
    status: Literal["queued", "failed", "scheduled"] = "queued"
    title: Optional[str] = None
    error: Optional[str] = None


class BatchDownloadResponse(BaseModel):
    total: int
    queued: int
    failed: int
    results: List[BatchDownloadResult]


class CookieStatusResponse(BaseModel):
    exists: bool
    size: int = 0
    line_count: int = 0
    updated_at: Optional[str] = None


class SourceStat(BaseModel):
    source: str
    count: int
    percentage: float


class FormatStat(BaseModel):
    format: str
    count: int


class DailyActivity(BaseModel):
    date: str
    count: int
    bytes: int


class AnalyticsStatsResponse(BaseModel):
    total_downloads: int
    completed_downloads: int
    failed_downloads: int
    active_downloads: int
    scheduled_downloads: int = 0
    total_bytes: int
    success_rate: float
    sources: List[SourceStat]
    formats: List[FormatStat]
    daily_activity: List[DailyActivity]



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
    scheduled_at: Optional[datetime] = None



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
    scheduled_count: int = 0
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


class ApiKeyGenerateResponse(BaseModel):
    api_key: str
    message: str


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
    api_key: Optional[str] = None
    require_api_key: bool = False
    rate_limit_per_minute: int = 60


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
    api_key: Optional[str] = None
    require_api_key: Optional[bool] = None
    rate_limit_per_minute: Optional[int] = None