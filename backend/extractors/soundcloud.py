import yt_dlp
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError


class SoundCloudExtractor(BaseExtractor):
    name = "soundcloud"
    domains = [
        "soundcloud.com",
        "m.soundcloud.com",
        "on.soundcloud.com",
    ]

    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)

    async def _extract_info(self, url: str) -> VideoInfo:
        ydl_opts = {
            **self.ydl_opts,
            "format": "bestaudio/best",
        }

        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise ExtractionError("Failed to extract SoundCloud track info")

                formats = self._parse_formats(info.get("formats", []))

                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "SoundCloud Track"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "uploader_id": info.get("uploader_id"),
                        "view_count": info.get("view_count"),
                        "like_count": info.get("like_count"),
                        "genre": info.get("genre"),
                        "description": info.get("description"),
                    },
                    source=self.name,
                    content_type=ContentType.AUDIO,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"SoundCloud extraction failed: {str(e)}")
        except Exception as e:
            raise ExtractionError(f"Unexpected error during SoundCloud extraction: {str(e)}")


ExtractorRegistry.register(SoundCloudExtractor())
