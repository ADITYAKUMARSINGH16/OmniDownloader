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
            msg = str(e)
            if "This video is unavailable" in msg:
                clean_msg = "This video is unavailable, private, or has been removed from YouTube."
            elif "Private video" in msg:
                clean_msg = "This video is private. Please provide cookies in Settings to access private content."
            elif "Sign in to confirm your age" in msg:
                clean_msg = "This video is age-restricted. Please configure YouTube cookies in Settings to download."
            elif "HTTP Error 403" in msg:
                clean_msg = "YouTube stream access was forbidden (403). Retrying with alternate player client..."
            else:
                clean_msg = f"YouTube extraction failed: {msg.split('ERROR:')[-1].strip() if 'ERROR:' in msg else msg}"
            raise ExtractionError(clean_msg)
        except Exception as e:
            if isinstance(e, ExtractionError):
                raise
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