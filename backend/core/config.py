from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    app_name: str = "OmniDownload"
    app_version: str = "1.0.0"
    debug: bool = False
    
    host: str = "0.0.0.0"
    port: int = 8000
    
    download_dir: str = Field(default_factory=lambda: os.path.join(os.getcwd(), "downloads"))
    temp_dir: str = Field(default_factory=lambda: os.path.join(os.getcwd(), "temp"))
    max_file_size: int = 10 * 1024 * 1024 * 1024  # 10GB
    max_concurrent_downloads: int = 2
    default_retries: int = 3
    request_timeout: int = 30
    
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"
    
    database_url: str = Field(default_factory=lambda: f"sqlite+aiosqlite:///{os.getcwd()}/data/omnidownload.db")
    
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()