from sqlalchemy import (
    Column, String, Integer, BigInteger, DateTime, Enum as SQLEnum,
    Text, Boolean, Index, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class DownloadStatus(str, enum.Enum):
    QUEUED = "queued"
    SCHEDULED = "scheduled"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"



class ContentType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    DOCUMENT = "document"
    ARCHIVE = "archive"
    TORRENT = "torrent"
    UNKNOWN = "unknown"


class Download(Base):
    __tablename__ = "downloads"
    
    id = Column(String(64), primary_key=True)
    url = Column(Text, nullable=False)
    source = Column(String(64), nullable=False)
    title = Column(String(512))
    filename = Column(String(512))
    file_size = Column(BigInteger, default=0)
    downloaded_size = Column(BigInteger, default=0)
    format = Column(String(256))
    format_id = Column(String(1024))
    extension = Column(String(16))
    content_type = Column(SQLEnum(ContentType), default=ContentType.UNKNOWN)
    status = Column(SQLEnum(DownloadStatus), default=DownloadStatus.QUEUED, nullable=False)
    progress = Column(Integer, default=0)
    speed = Column(BigInteger, default=0)
    eta = Column(Integer, default=0)
    priority = Column(Integer, default=0)
    retries = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error = Column(Text)
    output_path = Column(String(1024))
    thumbnail = Column(Text)
    duration = Column(Integer)
    extra_metadata = Column("metadata", Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    scheduled_at = Column(DateTime(timezone=True))

    
    __table_args__ = (
        Index("idx_downloads_status", "status"),
        Index("idx_downloads_created_at", "created_at"),
        Index("idx_downloads_source", "source"),
    )


class DownloadHistory(Base):
    __tablename__ = "download_history"
    
    id = Column(String(64), primary_key=True)
    url = Column(Text, nullable=False)
    source = Column(String(64), nullable=False)
    title = Column(String(512))
    filename = Column(String(512))
    file_size = Column(BigInteger, default=0)
    format = Column(String(256))
    extension = Column(String(16))
    content_type = Column(SQLEnum(ContentType), default=ContentType.UNKNOWN)
    status = Column(SQLEnum(DownloadStatus), default=DownloadStatus.COMPLETED, nullable=False)
    output_path = Column(String(1024))
    thumbnail = Column(Text)
    duration = Column(Integer)
    extra_metadata = Column("metadata", Text)
    error = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index("idx_history_created_at", "created_at"),
        Index("idx_history_source", "source"),
        Index("idx_history_status", "status"),
    )


class Settings(Base):
    __tablename__ = "settings"
    
    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())