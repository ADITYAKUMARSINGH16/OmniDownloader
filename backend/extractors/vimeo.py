import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError


class VimeoExtractor(BaseExtractor):
    name = "vimeo"
    domains = [
        "vimeo.com",
        "player.vimeo.com",
    ]

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
                    raise ExtractionError("Failed to extract Vimeo video info")

                formats = self._parse_formats(info.get("formats", []))

                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Vimeo Video"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "uploader_id": info.get("uploader_id"),
                        "view_count": info.get("view_count"),
                        "like_count": info.get("like_count"),
                        "description": info.get("description"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"Vimeo extraction failed: {str(e)}")
        except Exception as e:
            raise ExtractionError(f"Unexpected error during Vimeo extraction: {str(e)}")


ExtractorRegistry.register(VimeoExtractor())
