import httpx
import mimetypes
import os
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, unquote
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError, DownloadError
from core.security import validate_url, check_ssrf, sanitize_filename
from core.config import settings


class GenericExtractor(BaseExtractor):
    name = "generic"
    domains = []
    
    def supports(self, url: str) -> bool:
        return True
    
    async def _extract_info(self, url: str) -> VideoInfo:
        validated_url = validate_url(url)
        await check_ssrf(validated_url)
        
        try:
            headers = {
                "User-Agent": settings.user_agent,
                "Accept": "*/*",
            }
            async with httpx.AsyncClient(
                timeout=settings.request_timeout,
                follow_redirects=True,
                headers=headers,
            ) as client:
                try:
                    response = await client.head(validated_url)
                    response.raise_for_status()
                except Exception:
                    response = await client.get(validated_url, headers={"Range": "bytes=0-1024"})
                    response.raise_for_status()
                
                content_type = response.headers.get("content-type", "").split(";")[0].strip()
                content_length = response.headers.get("content-length")
                content_disposition = response.headers.get("content-disposition")
                
                filename = self._extract_filename(validated_url, content_disposition)
                file_size = int(content_length) if content_length else 0
                
                if file_size > settings.max_file_size:
                    raise DownloadError(f"File size {file_size} exceeds maximum allowed")
                
                detected_type = self._detect_content_type(content_type, filename)
                
                fmt = FormatModel(
                    format_id="direct",
                    quality="original",
                    extension=self._get_extension(content_type, filename),
                    filesize=file_size,
                    vcodec=None,
                    acodec=None,
                    is_video=detected_type == ContentType.VIDEO,
                    is_audio=detected_type == ContentType.AUDIO,
                )
                
                return VideoInfo(
                    id=self._generate_id(validated_url),
                    title=filename,
                    thumbnail=None,
                    duration=None,
                    formats=[fmt],
                    metadata={
                        "content_type": content_type,
                        "content_length": file_size,
                        "headers": dict(response.headers),
                    },
                    source=self.name,
                    content_type=detected_type,
                )
        except httpx.HTTPStatusError as e:
            raise ExtractionError(f"HTTP error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise ExtractionError(f"Request failed: {str(e)}")
        except ExtractionError:
            raise
        except Exception as e:
            raise ExtractionError(f"Generic extraction failed: {str(e)}")
    
    def _extract_filename(self, url: str, content_disposition: Optional[str]) -> str:
        if content_disposition:
            import re
            match = re.search(r'filename\*=?(?:UTF-8\'\')?([^;\n]+)', content_disposition)
            if match:
                return sanitize_filename(unquote(match.group(1).strip('"')))
        
        parsed = urlparse(url)
        path = unquote(parsed.path.rstrip("/"))
        filename = os.path.basename(path)
        
        if not filename:
            filename = "download"
        
        return sanitize_filename(filename)
    
    def _detect_content_type(self, mime_type: str, filename: str) -> ContentType:
        if mime_type:
            if mime_type.startswith("video/"):
                return ContentType.VIDEO
            elif mime_type.startswith("audio/"):
                return ContentType.AUDIO
            elif mime_type.startswith("image/"):
                return ContentType.IMAGE
            elif mime_type in ["application/pdf", "application/msword",
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
                return ContentType.DOCUMENT
            elif mime_type in ["application/zip", "application/x-rar-compressed",
                              "application/x-7z-compressed", "application/gzip"]:
                return ContentType.ARCHIVE
        
        ext = os.path.splitext(filename)[1].lower()
        video_exts = {".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".m4v", ".mpg", ".mpeg"}
        audio_exts = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".opus"}
        image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"}
        doc_exts = {".pdf", ".doc", ".docx", ".txt", ".md"}
        archive_exts = {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"}
        
        if ext in video_exts:
            return ContentType.VIDEO
        elif ext in audio_exts:
            return ContentType.AUDIO
        elif ext in image_exts:
            return ContentType.IMAGE
        elif ext in doc_exts:
            return ContentType.DOCUMENT
        elif ext in archive_exts:
            return ContentType.ARCHIVE
        
        return ContentType.UNKNOWN
    
    def _get_extension(self, mime_type: str, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        if ext:
            return ext.lstrip(".")
        
        guessed = mimetypes.guess_extension(mime_type)
        if guessed:
            return guessed.lstrip(".")
        
        return "bin"
    
    def _generate_id(self, url: str) -> str:
        import hashlib
        return hashlib.sha256(url.encode()).hexdigest()[:16]


ExtractorRegistry.register(GenericExtractor())