import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings


class TeraboxExtractor(BaseExtractor):
    name = "terabox"
    domains = ["terabox.com", "www.terabox.com", "teraboxapp.com", "www.teraboxapp.com",
               "1024terabox.com", "www.1024terabox.com", "freeterabox.com", "www.freeterabox.com",
               "teraboxlink.com", "www.teraboxlink.com"]
    
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
                    raise ExtractionError("Failed to extract Terabox file info")
                
                formats = self._parse_formats(info.get("formats", []))
                
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Terabox File"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "file_size": info.get("filesize"),
                        "ext": info.get("ext"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if formats else ContentType.UNKNOWN,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"Terabox extraction failed: {str(e)}")


ExtractorRegistry.register(TeraboxExtractor())