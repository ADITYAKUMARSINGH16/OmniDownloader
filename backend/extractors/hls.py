import os
import re
import httpx
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, urljoin, unquote

from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.security import validate_url, check_ssrf, sanitize_filename
from core.config import settings


class HlsExtractor(BaseExtractor):
    name = "hls"
    domains = []

    def supports(self, url: str) -> bool:
        clean = url.lower().split("?")[0]
        return clean.endswith(".m3u8") or ".m3u8" in clean or "format=m3u8" in url.lower() or "m3u8=true" in url.lower()

    async def _extract_info(self, url: str) -> VideoInfo:
        validated_url = validate_url(url)
        await check_ssrf(validated_url)

        headers = {
            "User-Agent": settings.user_agent,
            "Accept": "*/*",
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.request_timeout,
                follow_redirects=True,
                headers=headers,
            ) as client:
                resp = await client.get(validated_url)
                resp.raise_for_status()
                content = resp.text

            if not content.startswith("#EXTM3U") and "#EXT" not in content:
                raise ExtractionError("Provided URL does not return a valid HLS M3U8 manifest")

            is_live = "#EXT-X-ENDLIST" not in content
            formats = self.parse_manifest(content, validated_url, is_live=is_live)

            # Derive title
            parsed = urlparse(validated_url)
            basename = os.path.basename(parsed.path.rstrip("/"))
            title = basename.replace(".m3u8", "").replace("-", " ").replace("_", " ").title()
            if not title or title.lower() in ["playlist", "master", "index", "live", "chunklist"]:
                title = f"HLS Stream ({parsed.netloc})"

            return VideoInfo(
                id=self._generate_id(validated_url),
                title=title,
                thumbnail=None,
                duration=None,
                formats=formats,
                metadata={
                    "is_live": is_live,
                    "stream_type": "hls",
                    "manifest_url": validated_url,
                },
                source=self.name,
                content_type=ContentType.VIDEO,
            )

        except Exception as e:
            raise ExtractionError(f"Failed to capture HLS stream: {str(e)}")

    def parse_manifest(self, content: str, base_url: str, is_live: bool = False) -> List[FormatModel]:
        formats: List[FormatModel] = []
        stream_pattern = re.compile(
            r'#EXT-X-STREAM-INF:([^\n]+)\n([^\n#]+)',
            re.IGNORECASE
        )
        
        matches = stream_pattern.findall(content)
        if matches:
            for idx, (attr_str, stream_uri) in enumerate(matches):
                stream_uri = stream_uri.strip()
                resolved_uri = urljoin(base_url, stream_uri)
                
                bandwidth = None
                bw_match = re.search(r'BANDWIDTH=(\d+)', attr_str)
                if bw_match:
                    bandwidth = float(bw_match.group(1))

                res_match = re.search(r'RESOLUTION=(\d+)x(\d+)', attr_str)
                width, height = None, None
                if res_match:
                    width = int(res_match.group(1))
                    height = int(res_match.group(2))

                fps = None
                fps_match = re.search(r'FRAME-RATE=([\d\.]+)', attr_str)
                if fps_match:
                    try:
                        fps = float(fps_match.group(1))
                    except Exception:
                        fps = None

                quality = f"{height}p (HLS)" if height else (f"{int(bandwidth/1000)}k (HLS)" if bandwidth else f"Variant {idx + 1}")

                formats.append(FormatModel(
                    format_id=resolved_uri,
                    quality=quality,
                    extension="mp4",
                    width=width,
                    height=height,
                    fps=fps,
                    bitrate=bandwidth,
                    protocol="m3u8",
                    is_video=True,
                    is_audio=False,
                ))

        if not formats:
            formats.append(FormatModel(
                format_id=base_url,
                quality="Live Stream (HLS)" if is_live else "Direct HLS Stream",
                extension="mp4",
                protocol="m3u8",
                is_video=True,
                is_audio=False,
            ))

        formats.sort(key=lambda f: (-(f.height or 0), -(f.bitrate or 0)))
        return formats

    def _generate_id(self, url: str) -> str:
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()[:12]


ExtractorRegistry.register(HlsExtractor())
