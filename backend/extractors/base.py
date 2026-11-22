from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pydantic import HttpUrl
import os
import shutil
import yt_dlp

from models.schemas import FormatModel, ContentType, AnalyzeResponse, PlaylistAnalyzeResponse, PlaylistEntryModel
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
    subtitles: List[str] = field(default_factory=list)
    chapters: Optional[List[Dict[str, Any]]] = None
    source: str = ""
    content_type: ContentType = ContentType.VIDEO


class BaseExtractor(ABC):
    name: str = ""
    domains: List[str] = []
    
    def __init__(self):
        cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "noplaylist": True,
            "socket_timeout": settings.request_timeout,
            "retries": 5,
            "user_agent": settings.user_agent,
            "js_runtimes": {"node": {}},
            "remote_components": ["ejs:github"],
        }
        if os.path.exists(cookies_path) and os.path.getsize(cookies_path) > 0:
            self.ydl_opts["cookiefile"] = cookies_path

        ff_bin = shutil.which("ffmpeg") or settings.ffmpeg_path
        if ff_bin and os.path.exists(ff_bin):
            self.ydl_opts["ffmpeg_location"] = os.path.dirname(ff_bin) if os.path.isfile(ff_bin) else ff_bin

    
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
        best_audio_size = max(
            (
                int(round(f.get("filesize") or f.get("filesize_approx") or 0))
                for f in ydl_formats
                if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")
            ),
            default=0,
        )

        for f in ydl_formats:
            vcodec = f.get("vcodec")
            acodec = f.get("acodec")
            ext = str(f.get("ext", "mp4")).lower()
            protocol = str(f.get("protocol", "")).lower()

            # Skip storyboard formats (thumbnails/sprites), images, and mhtml manifests
            if protocol in ["mhtml"] or f.get("format_note") == "storyboard" or ext in ["mhtml", "jpg", "jpeg", "png"]:
                continue

            has_v = vcodec not in (None, "none")
            has_a = acodec not in (None, "none")

            if not has_v and not has_a:
                if ext in ["mp3", "m4a", "wav", "flac", "aac", "ogg", "opus"]:
                    has_a = True
                elif ext in ["mp4", "webm", "mkv", "avi", "mov", "flv", "m4v"]:
                    has_v = True
                else:
                    continue

            raw_fs = f.get("filesize") or f.get("filesize_approx")
            if has_v and not has_a:
                filesize = (int(round(raw_fs)) + best_audio_size) if raw_fs is not None else None
            else:
                filesize = int(round(raw_fs)) if raw_fs is not None else None
            
            raw_w = f.get("width")
            width = int(raw_w) if raw_w is not None else None
            
            raw_h = f.get("height")
            height = int(raw_h) if raw_h is not None else None
            
            raw_fps = f.get("fps")
            fps = float(raw_fps) if raw_fps is not None else None
            
            raw_br = f.get("tbr") or f.get("vbr") or f.get("abr") or f.get("bitrate")
            bitrate = float(raw_br) if raw_br is not None else None

            is_video = has_v
            is_audio = has_a and not has_v

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
                is_audio=is_audio,
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

    async def extract_playlist(self, url: str) -> PlaylistAnalyzeResponse:
        import asyncio
        validated_url = validate_url(url)
        await check_ssrf(validated_url)

        def _run_flat_extract():
            opts = self.ydl_opts.copy()
            opts.update({
                "extract_flat": "in_playlist",
                "playlistend": 200,
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
            })
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(validated_url, download=False)

        info = await asyncio.to_thread(_run_flat_extract)
        if not info:
            raise ExtractionError("Failed to extract playlist metadata")

        entries_raw = info.get("entries") or []
        entries: List[PlaylistEntryModel] = []
        idx = 1
        for e in entries_raw:
            if not e:
                continue
            entry_id = str(e.get("id") or "")
            entry_url = e.get("url") or e.get("webpage_url") or ""
            # Strip yt-dlp internal smuggle fragments (e.g. #__youtubedl_smuggle=...)
            if "#__youtubedl_smuggle" in entry_url:
                entry_url = entry_url.split("#__youtubedl_smuggle")[0]
            if not entry_url.startswith("http://") and not entry_url.startswith("https://"):
                if "youtube" in str(info.get("extractor", "")).lower() or "youtu.be" in validated_url or "youtube.com" in validated_url:
                    entry_url = f"https://www.youtube.com/watch?v={entry_id}"
                else:
                    entry_url = entry_url or validated_url

            entries.append(PlaylistEntryModel(
                id=entry_id,
                url=entry_url,
                title=str(e.get("title") or f"Item {idx}"),
                duration=float(e.get("duration")) if e.get("duration") is not None else None,
                thumbnail=e.get("thumbnail"),
                index=idx,
            ))
            idx += 1

        return PlaylistAnalyzeResponse(
            success=True,
            id=str(info.get("id") or ""),
            title=str(info.get("title") or "Playlist"),
            uploader=info.get("uploader"),
            entry_count=len(entries),
            entries=entries,
        )


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
        domain = ""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.hostname.lower() if parsed.hostname else ""
        except Exception:
            domain = ""
        
        # 1. Match specific extractors (excluding generic)
        for extractor in cls._extractors:
            if extractor.name != "generic" and extractor.supports(url):
                return extractor
        
        # 2. Match registered domain map
        for registered_domain, extractor in cls._domain_map.items():
            if domain == registered_domain or domain.endswith("." + registered_domain):
                return extractor
        
        # 3. Fallback to generic extractor
        for extractor in cls._extractors:
            if extractor.name == "generic" and extractor.supports(url):
                return extractor
        
        return None
    
    @classmethod
    def get_all_extractors(cls) -> List[BaseExtractor]:
        return cls._extractors.copy()
    
    @classmethod
    def clear(cls):
        cls._extractors.clear()
        cls._domain_map.clear()