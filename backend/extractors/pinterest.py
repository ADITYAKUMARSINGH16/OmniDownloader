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
        clean_url = url.split("#")[0].strip()

        # Validate that the URL points to a specific pin or shortlink, not just the homepage/feed
        if not ("/pin/" in clean_url or "pin.it/" in clean_url or "/sent/" in clean_url):
            raise ExtractionError(
                "Please provide a direct Pinterest Pin URL (e.g., https://pinterest.com/pin/123456789/ or https://pin.it/...) rather than the Pinterest homepage or feed."
            )

        ydl_opts = {
            **self.ydl_opts,
            "format": "bestvideo+bestaudio/best",
            "ignore_no_formats_error": True,
        }

        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
                if not info:
                    raise ExtractionError("Failed to extract Pinterest pin info")

                formats = self._parse_formats(info.get("formats", []))

                # If no video formats are returned, this is an image pin.
                # Provide the highest resolution/original image as a downloadable format.
                thumbnails = info.get("thumbnails", [])
                if not formats and thumbnails:
                    best_thumb = max(
                        thumbnails,
                        key=lambda t: (
                            1 if "/originals/" in (t.get("url") or "") else 0,
                            (t.get("width") or 0) * (t.get("height") or 0),
                        ),
                        default=None,
                    )
                    if best_thumb and best_thumb.get("url"):
                        img_url = best_thumb["url"]
                        w = best_thumb.get("width")
                        h = best_thumb.get("height")
                        res_label = f"{w}x{h}" if (w and h) else "Original"
                        formats.append(
                            FormatModel(
                                format_id=img_url,
                                quality=f"Image ({res_label})",
                                extension="jpg",
                                width=w,
                                height=h,
                                is_video=False,
                                is_audio=False,
                                protocol="https",
                            )
                        )

                # Use best thumbnail as main thumbnail if available
                main_thumbnail = info.get("thumbnail")
                if thumbnails:
                    best_thumb = max(
                        thumbnails,
                        key=lambda t: (
                            1 if "/originals/" in (t.get("url") or "") else 0,
                            (t.get("width") or 0) * (t.get("height") or 0),
                        ),
                        default=None,
                    )
                    if best_thumb and best_thumb.get("url"):
                        main_thumbnail = best_thumb["url"]

                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Pinterest Pin"),
                    thumbnail=main_thumbnail,
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "uploader": info.get("uploader"),
                        "description": info.get("description"),
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if any(f.is_video for f in formats) else ContentType.IMAGE,
                )
        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            if "unsupported url" in err_msg.lower():
                raise ExtractionError(
                    "Unsupported Pinterest URL. Please provide a direct Pin link (e.g., https://pinterest.com/pin/... or https://pin.it/...)."
                )
            raise ExtractionError(f"Pinterest extraction failed: {err_msg}")
        except ExtractionError:
            raise
        except Exception as e:
            raise ExtractionError(f"Unexpected error during Pinterest extraction: {str(e)}")


ExtractorRegistry.register(PinterestExtractor())
