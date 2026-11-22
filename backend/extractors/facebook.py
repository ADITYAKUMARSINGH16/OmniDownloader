import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings


class FacebookExtractor(BaseExtractor):
    name = "facebook"
    domains = ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]
    
    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)
    
    async def _extract_info(self, url: str) -> VideoInfo:
        ydl_opts = {
            **self.ydl_opts,
            "format": "bestvideo+bestaudio/best",
        }
        
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise ExtractionError("Failed to extract Facebook post info")
                
                formats = self._parse_formats(info.get("formats", []))
                
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Facebook Post"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "author": info.get("uploader"),
                        "author_id": info.get("uploader_id"),
                        "like_count": info.get("like_count"),
                        "comment_count": info.get("comment_count"),
                        "share_count": info.get("repost_count"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if formats else ContentType.UNKNOWN,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"Facebook extraction failed: {str(e)}")


ExtractorRegistry.register(FacebookExtractor())