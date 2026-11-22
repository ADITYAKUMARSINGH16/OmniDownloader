import yt_dlp
import asyncio
from typing import List, Dict, Any
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError


class JioSaavnExtractor(BaseExtractor):
    name = "jiosaavn"
    domains = [
        "jiosaavn.com",
        "www.jiosaavn.com",
        "saavn.com",
        "www.saavn.com",
    ]

    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)

    async def _extract_info(self, url: str) -> VideoInfo:
        ydl_opts = {
            **self.ydl_opts,
            "format": "bestaudio/best",
        }

        def _run():
            with self._create_ydl(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        try:
            info = await asyncio.to_thread(_run)
            if not info:
                raise ExtractionError("Failed to extract JioSaavn track info")

            # If playlist result, extract first entry for single analysis
            if info.get("_type") == "playlist" and info.get("entries"):
                entries = list(info["entries"])
                if entries and entries[0]:
                    info = entries[0]

            formats = self._parse_formats(info.get("formats", []))

            return VideoInfo(
                id=info.get("id", ""),
                title=info.get("title", "JioSaavn Track"),
                thumbnail=info.get("thumbnail"),
                duration=info.get("duration"),
                formats=formats,
                metadata={
                    "uploader": info.get("uploader") or info.get("artist"),
                    "album": info.get("album"),
                    "artist": info.get("artist"),
                    "release_year": info.get("release_year"),
                    "language": info.get("language"),
                    "description": info.get("description"),
                },
                source=self.name,
                content_type=ContentType.AUDIO,
            )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"JioSaavn extraction failed: {str(e)}")
        except Exception as e:
            raise ExtractionError(f"Unexpected error during JioSaavn extraction: {str(e)}")


ExtractorRegistry.register(JioSaavnExtractor())

