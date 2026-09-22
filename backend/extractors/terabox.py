import re
import os
import urllib.parse
import httpx
from typing import List, Dict, Any, Optional
from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings


class TeraboxExtractor(BaseExtractor):
    name = "terabox"
    domains = [
        "terabox.com", "www.terabox.com",
        "teraboxapp.com", "www.teraboxapp.com",
        "1024terabox.com", "www.1024terabox.com",
        "freeterabox.com", "www.freeterabox.com",
        "teraboxlink.com", "www.teraboxlink.com",
        "teraboxurl.com", "www.teraboxurl.com",
        "teraboxshare.com", "www.teraboxshare.com",
        "mirrobox.com", "www.mirrobox.com",
        "nephobox.com", "www.nephobox.com",
        "4funbox.com", "www.4funbox.com",
        "tibibox.com", "www.tibibox.com",
        "terabox.app", "www.terabox.app",
        "momerybox.com", "www.momerybox.com",
    ]
    
    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)
    
    def _extract_surl(self, url: str) -> Optional[str]:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "surl" in qs and qs["surl"]:
            return qs["surl"][0]
        if "shorturl" in qs and qs["shorturl"]:
            return qs["shorturl"][0]

        match = re.search(r'/s/([A-Za-z0-9_-]+)', parsed.path)
        if match:
            return match.group(1)

        match = re.search(r'surl=([A-Za-z0-9_-]+)', url)
        if match:
            return match.group(1)

        return None

    def _load_terabox_cookies(self) -> Dict[str, str]:
        cookies_dict: Dict[str, str] = {}
        cookies_path = os.path.join(os.getcwd(), "data", "cookies.txt")
        if not os.path.exists(cookies_path):
            return cookies_dict

        try:
            with open(cookies_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line_str = line.strip()
                    if not line_str or line_str.startswith("#"):
                        continue
                    if "\t" in line_str:
                        parts = line_str.split("\t")
                        if len(parts) >= 7 and any(tb in parts[0].lower() for tb in ["terabox", "1024", "4funbox", "mirrobox"]):
                            cookies_dict[parts[5]] = parts[6]
                    elif "=" in line_str:
                        for pair in line_str.split(";"):
                            if "=" in pair:
                                k, v = pair.strip().split("=", 1)
                                if k.strip():
                                    cookies_dict[k.strip()] = v.strip()
        except Exception:
            pass

        return cookies_dict

    async def _extract_info(self, url: str) -> VideoInfo:
        surl = self._extract_surl(url)
        if not surl:
            raise ExtractionError("Invalid TeraBox URL: Could not extract shortcode or share ID.")

        clean_surl = surl[1:] if surl.startswith("1") else surl
        full_surl = surl if surl.startswith("1") else f"1{surl}"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": f"https://www.1024terabox.com/sharing/link?surl={clean_surl}",
            "Origin": "https://www.1024terabox.com",
        }

        cookies_dict = self._load_terabox_cookies()
        if "lang" not in cookies_dict:
            cookies_dict["lang"] = "en"

        api_endpoints = [
            f"https://www.1024terabox.com/share/list?app_id=250528&shorturl={clean_surl}&root=1",
            f"https://www.1024terabox.com/share/list?app_id=250528&shorturl={full_surl}&root=1",
            f"https://www.terabox.app/share/list?app_id=250528&shorturl={clean_surl}&root=1",
            f"https://www.terabox.com/share/list?app_id=250528&shorturl={clean_surl}&root=1",
            f"https://teraboxurl.com/share/list?app_id=250528&shorturl={clean_surl}&root=1",
        ]

        last_error = None
        for ep in api_endpoints:
            try:
                async with httpx.AsyncClient(timeout=3.0, follow_redirects=True, headers=headers, cookies=cookies_dict) as client:
                    resp = await client.get(ep)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("errno") == 0 and data.get("list"):
                            file_item = data["list"][0]
                            file_name = file_item.get("server_filename") or "TeraBox File"
                            file_size = file_item.get("size")
                            dlink = file_item.get("dlink") or url
                            thumbs = file_item.get("thumbs", {})
                            thumb_url = thumbs.get("url3") or thumbs.get("url2") or thumbs.get("url1")

                            ext = file_name.split(".")[-1].lower() if "." in file_name else "bin"
                            is_video = ext in ["mp4", "mkv", "avi", "mov", "webm", "flv"]
                            is_audio = ext in ["mp3", "m4a", "wav", "flac", "aac"]

                            fmt = FormatModel(
                                format_id=dlink,
                                quality=f"Original File ({ext.upper()})",
                                extension=ext,
                                filesize=file_size,
                                is_video=is_video,
                                is_audio=is_audio,
                                protocol="https",
                            )

                            return VideoInfo(
                                id=clean_surl,
                                title=file_name,
                                thumbnail=thumb_url,
                                duration=None,
                                formats=[fmt],
                                metadata={
                                    "fs_id": file_item.get("fs_id"),
                                    "category": file_item.get("category"),
                                    "share_id": data.get("shareid"),
                                },
                                source=self.name,
                                content_type=ContentType.VIDEO if is_video else (ContentType.AUDIO if is_audio else ContentType.UNKNOWN),
                            )
            except Exception as e:
                last_error = e

        # If direct connection failed or timed out due to ISP blocks
        raise ExtractionError(
            "TeraBox connection blocked by your local Internet Provider (ISP). "
            "TeraBox domains are blocked at network level in India & select regions. "
            "To download this link: Enable a VPN (or Cloudflare 1.1.1.1 WARP), or log in to TeraBox in your browser and sync cookies via the OmniDownload extension."
        )


ExtractorRegistry.register(TeraboxExtractor())