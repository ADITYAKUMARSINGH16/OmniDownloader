import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError


class PinterestExtractor(BaseExtractor):
    name = "pinterest"
    domains = [
        "pinterest.com",
        "www.pinterest.com",
        "pin.it",
        "in.pinterest.com",
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
                    raise ExtractionError("Failed to extract Pinterest pin info")

                formats = self._parse_formats(info.get("formats", []))

                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Pinterest Pin"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "description": info.get("description"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if formats else ContentType.IMAGE,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"Pinterest extraction failed: {str(e)}")
        except Exception as e:
            raise ExtractionError(f"Unexpected error during Pinterest extraction: {str(e)}")


ExtractorRegistry.register(PinterestExtractor())
