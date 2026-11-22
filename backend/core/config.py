from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
import os
import sys
import shutil

# Ensure static_ffmpeg is activated and on PATH immediately
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass


def _resolve_binary(binary_name: str) -> str:
    """Find the absolute path to ffmpeg / ffprobe, checking PATH and static_ffmpeg packages."""
    # 1. Standard PATH check
    path = shutil.which(binary_name)
    if path and os.path.isfile(path):
        return path

    # 2. Check static_ffmpeg install directory in venv or site-packages
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    win32_name = f"{binary_name}.exe" if sys.platform == "win32" else binary_name
    candidates = [
        os.path.join(base_dir, "venv", "Lib", "site-packages", "static_ffmpeg", "bin", "win32", win32_name),
        os.path.join(base_dir, "venv", "Lib", "site-packages", "static_ffmpeg", "bin", "linux", binary_name),
        os.path.join(base_dir, "venv", "Lib", "site-packages", "static_ffmpeg", "bin", "darwin", binary_name),
    ]
    for c in candidates:
        if os.path.isfile(c):
            bin_dir = os.path.dirname(c)
            if bin_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
            return c

    return binary_name


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

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
    
    ffmpeg_path: str = Field(default_factory=lambda: _resolve_binary("ffmpeg"))
    ffprobe_path: str = Field(default_factory=lambda: _resolve_binary("ffprobe"))
    
    database_url: str = Field(default_factory=lambda: f"sqlite+aiosqlite:///{os.getcwd()}/data/omnidownload.db")
    
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


settings = Settings()