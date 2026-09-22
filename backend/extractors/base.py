from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pydantic import HttpUrl
import yt_dlp

from models.schemas import FormatModel, ContentType, AnalyzeResponse
from core.exceptions import ExtractionError, UnsupportedSourceError
from core.security import validate_url, check_ssrf
from core.config import settings


@dataclass
class VideoInfo:
    id: str
    title: str
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    formats: List[FormatModel] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: str = ""
    content_type: ContentType = ContentType.VIDEO


class BaseExtractor(ABC):
    name: str = ""
    domains: List[str] = []
    
    def __init__(self):
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "noplaylist": True,
            "socket_timeout": settings.request_timeout,
            "retries": 3,
            "user_agent": settings.user_agent,
        }
    
    def matches_domain(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse
            host = urlparse(url).netloc.lower().split(":")[0]
            return any(host == domain or host.endswith("." + domain) for domain in self.domains)
        except Exception:
            return False

    @abstractmethod
    def supports(self, url: str) -> bool:
        pass
    
    async def analyze(self, url: str) -> VideoInfo:
        validated_url = validate_url(url)
        await check_ssrf(validated_url)
        
        if not self.supports(validated_url):
            raise UnsupportedSourceError(validated_url)
        
        return await self._extract_info(validated_url)
    
    @abstractmethod
    async def _extract_info(self, url: str) -> VideoInfo:
        pass
    
    async def get_formats(self, url: str) -> List[FormatModel]:
        info = await self.analyze(url)
        return info.formats
    
    def _parse_formats(self, ydl_formats: List[Dict]) -> List[FormatModel]:
        formats = []
        for f in ydl_formats:
            vcodec = f.get("vcodec")
            acodec = f.get("acodec")
            ext = str(f.get("ext", "mp4")).lower()
            video_ext = str(f.get("video_ext", "")).lower()

            is_video = (vcodec not in (None, "none")) or (video_ext not in (None, "none", "")) or (ext in ["mp4", "webm", "mkv", "avi", "mov", "flv", "m4v"])
            is_audio = (acodec not in (None, "none")) or (ext in ["mp3", "m4a", "wav", "flac", "aac", "ogg", "opus"])

            if is_video or is_audio:
                raw_fs = f.get("filesize") or f.get("filesize_approx")
                filesize = int(round(raw_fs)) if raw_fs is not None else None
                
                raw_w = f.get("width")
                width = int(raw_w) if raw_w is not None else None
                
                raw_h = f.get("height")
                height = int(raw_h) if raw_h is not None else None
                
                raw_fps = f.get("fps")
                fps = float(raw_fps) if raw_fps is not None else None
                
                raw_br = f.get("tbr") or f.get("vbr") or f.get("abr") or f.get("bitrate")
                bitrate = float(raw_br) if raw_br is not None else None

                if is_video:
                    if height:
                        if height >= 2160:
                            tag = " (4K)"
                        elif height >= 1440:
                            tag = " (2K)"
                        elif height >= 1080:
                            tag = " (Full HD)"
                        elif height >= 720:
                            tag = " (HD)"
                        else:
                            tag = ""
                        quality = f"{height}p{tag}"
                    else:
                        note = str(f.get("format_note") or f.get("tag") or f.get("format_id") or f.get("resolution") or "Video")
                        quality = note.upper() if len(note) <= 4 else note.capitalize()
                else:
                    if bitrate:
                        display_br = int(round(bitrate / 1000 if bitrate > 10000 else bitrate))
                        quality = f"Audio ({display_br}kbps)"
                    else:
                        quality = str(f.get("format_note") or "Audio")

                fmt = FormatModel(
                    format_id=str(f.get("format_id", "")),
                    quality=quality,
                    extension=ext,
                    filesize=filesize,
                    vcodec=f.get("vcodec"),
                    acodec=f.get("acodec"),
                    fps=fps,
                    width=width,
                    height=height,
                    bitrate=bitrate,
                    protocol=f.get("protocol"),
                    is_video=is_video,
                    is_audio=is_audio and not is_video,
                )
                formats.append(fmt)

        # Sort: Videos first (highest resolution, then bitrate), Audios second (highest bitrate)
        formats.sort(key=lambda fmt: (
            0 if fmt.is_video else 1,
            -(fmt.height or 0),
            -(fmt.bitrate or 0),
            -(fmt.filesize or 0)
        ))

        return formats
    
    def _create_ydl(self, extra_opts: Optional[Dict] = None) -> yt_dlp.YoutubeDL:
        opts = self.ydl_opts.copy()
        if extra_opts:
            opts.update(extra_opts)
        return yt_dlp.YoutubeDL(opts)


class ExtractorRegistry:
    _extractors: List[BaseExtractor] = []
    _domain_map: Dict[str, BaseExtractor] = {}
    
    @classmethod
    def register(cls, extractor: BaseExtractor):
        cls._extractors.append(extractor)
        for domain in extractor.domains:
            cls._domain_map[domain.lower()] = extractor
    
    @classmethod
    def get_extractor(cls, url: str) -> Optional[BaseExtractor]:
        parsed = HttpUrl(url)
        domain = parsed.host.lower() if parsed.host else ""
        
        for extractor in cls._extractors:
            if extractor.supports(url):
                return extractor
        
        for registered_domain, extractor in cls._domain_map.items():
            if domain.endswith(registered_domain):
                return extractor
        
        return None
    
    @classmethod
    def get_all_extractors(cls) -> List[BaseExtractor]:
        return cls._extractors.copy()
    
    @classmethod
    def clear(cls):
        cls._extractors.clear()
        cls._domain_map.clear()