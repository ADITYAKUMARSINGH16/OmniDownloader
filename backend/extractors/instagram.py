import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings


class InstagramExtractor(BaseExtractor):
    name = "instagram"
    domains = ["instagram.com", "www.instagram.com", "instagr.am"]
    
    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)
    
    async def _extract_info(self, url: str) -> VideoInfo:
        clean_url = url.split("#")[0].strip()
        ydl_opts = {
            **self.ydl_opts,
            "format": "bestvideo+bestaudio/best",
            "noplaylist": True,
        }
        
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
                
                if not info:
                    raise ExtractionError("Failed to extract Instagram post info")
                
                formats = self._parse_formats(info.get("formats", []))
                
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Instagram Post"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "author": info.get("uploader"),
                        "author_id": info.get("uploader_id"),
                        "like_count": info.get("like_count"),
                        "comment_count": info.get("comment_count"),
                        "view_count": info.get("view_count"),
                        "is_video": info.get("is_video", False),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if info.get("is_video") else ContentType.IMAGE,
                )
        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            if "login" in err_msg.lower() or "not granting access" in err_msg.lower() or "empty media response" in err_msg.lower():
                raise ExtractionError("Instagram requires login authentication or cookies to access this post. Please ensure the post is public.")
            raise ExtractionError(f"Instagram extraction failed: {err_msg}")


ExtractorRegistry.register(InstagramExtractor())