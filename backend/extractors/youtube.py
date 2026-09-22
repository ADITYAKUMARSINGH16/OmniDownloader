import yt_dlp
from typing import List, Dict, Any, Optional
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings


class YouTubeExtractor(BaseExtractor):
    name = "youtube"
    domains = ["youtube.com", "youtu.be", "youtube-nocookie.com", "m.youtube.com"]
    
    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)
    
    async def _extract_info(self, url: str) -> VideoInfo:
        ydl_opts = {
            **self.ydl_opts,
            "noplaylist": True,
        }
        
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise ExtractionError("Failed to extract video info")
                
                formats = self._parse_formats(info.get("formats", []))
                
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Unknown"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "uploader_id": info.get("uploader_id"),
                        "view_count": info.get("view_count"),
                        "like_count": info.get("like_count"),
                        "description": info.get("description"),
                        "tags": info.get("tags", []),
                        "categories": info.get("categories", []),
                        "upload_date": info.get("upload_date"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"YouTube extraction failed: {str(e)}")
        except Exception as e:
            raise ExtractionError(f"Unexpected error: {str(e)}")


class YouTubeMusicExtractor(BaseExtractor):
    name = "youtube_music"
    domains = ["music.youtube.com"]
    
    def supports(self, url: str) -> bool:
        return "music.youtube.com" in url.lower()
    
    async def _extract_info(self, url: str) -> VideoInfo:
        ydl_opts = {
            **self.ydl_opts,
            "noplaylist": True,
        }
        
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise ExtractionError("Failed to extract music info")
                
                formats = self._parse_formats(info.get("formats", []))
                
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Unknown"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "artist": info.get("artist"),
                        "album": info.get("album"),
                        "track": info.get("track"),
                    },
                    source=self.name,
                    content_type=ContentType.AUDIO,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"YouTube Music extraction failed: {str(e)}")


ExtractorRegistry.register(YouTubeExtractor())
ExtractorRegistry.register(YouTubeMusicExtractor())