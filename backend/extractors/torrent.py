import re
import urllib.parse
from typing import Optional, Dict, Any, List

from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError


class TorrentExtractor(BaseExtractor):
    name = "torrent"
    
    def supports(self, url: str) -> bool:
        url_clean = url.strip().lower()
        if url_clean.startswith("magnet:?"):
            return True
        path = url_clean.split("?")[0]
        if path.endswith(".torrent"):
            return True
        return False
    
    async def _extract_info(self, url: str) -> VideoInfo:
        url_clean = url.strip()
        
        if url_clean.lower().startswith("magnet:?"):
            query_part = url_clean[url_clean.find("?") + 1 :]
            params = urllib.parse.parse_qs(query_part)
            
            # Display name
            dn_list = params.get("dn", [])
            title = dn_list[0] if dn_list else "BitTorrent Transfer"
            
            # BTIH info hash
            xt_list = params.get("xt", [])
            info_hash = ""
            for xt in xt_list:
                if xt.lower().startswith("urn:btih:"):
                    info_hash = xt[9:].strip().upper()
                    break
            
            # Trackers
            trackers = params.get("tr", [])
            
            # Formats
            formats = [
                FormatModel(
                    format_id="torrent",
                    quality="BitTorrent P2P",
                    extension="bin",
                    protocol="bittorrent",
                    is_video=False,
                    is_audio=False,
                )
            ]
            
            return VideoInfo(
                id=info_hash or "magnet",
                title=title,
                thumbnail=None,
                duration=None,
                formats=formats,
                metadata={
                    "info_hash": info_hash,
                    "trackers": trackers,
                    "is_magnet": True,
                },
                source=self.name,
                content_type=ContentType.TORRENT,
            )
        
        elif url_clean.lower().split("?")[0].endswith(".torrent"):
            url_path = url_clean.split("?")[0].rstrip("/")
            raw_title = url_path.split("/")[-1]
            title = urllib.parse.unquote(raw_title)
            
            formats = [
                FormatModel(
                    format_id="torrent_file",
                    quality="BitTorrent P2P",
                    extension="bin",
                    protocol="bittorrent",
                    is_video=False,
                    is_audio=False,
                )
            ]
            
            return VideoInfo(
                id="torrent_file",
                title=title or "BitTorrent Package",
                thumbnail=None,
                duration=None,
                formats=formats,
                metadata={"is_torrent_file": True},
                source=self.name,
                content_type=ContentType.TORRENT,
            )
        
        raise ExtractionError("Unsupported torrent or magnet URL")


ExtractorRegistry.register(TorrentExtractor())
