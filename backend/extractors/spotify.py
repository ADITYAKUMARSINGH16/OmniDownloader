import os
import re
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

import httpx
import yt_dlp

from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel, PlaylistAnalyzeResponse, PlaylistEntryModel
from core.exceptions import ExtractionError

logger = logging.getLogger(__name__)


class SpotifyExtractor(BaseExtractor):
    name = "spotify"
    domains = [
        "spotify.com",
        "open.spotify.com",
        "play.spotify.com",
    ]

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        if not any(d in url_lower for d in self.domains):
            return False
        return any(kind in url_lower for kind in ["/track/", "/album/", "/playlist/", "/artist/"])

    def _parse_spotify_uri(self, url: str) -> tuple[Optional[str], Optional[str]]:
        """Extract type (track/album/playlist) and ID from URL."""
        path = urlparse(url).path
        match = re.search(r"/(track|album|playlist|artist)/([a-zA-Z0-9]+)", path)
        if match:
            return match.group(1), match.group(2)
        return None, None

    async def _fetch_embed_entity(self, entity_type: str, entity_id: str) -> Dict[str, Any]:
        """Fetch and parse Spotify embed entity JSON."""
        embed_url = f"https://open.spotify.com/embed/{entity_type}/{entity_id}"
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(embed_url, headers=self.HEADERS)
            if resp.status_code != 200:
                raise ExtractionError(f"Spotify embed returned HTTP {resp.status_code}")
            
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
            if not match:
                raise ExtractionError("Failed to parse Spotify embed page data")
            
            try:
                data = json.loads(match.group(1))
                entity = data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
                if not entity:
                    raise ExtractionError("Spotify entity data is empty")
                return entity
            except json.JSONDecodeError as e:
                raise ExtractionError(f"Failed to decode Spotify JSON: {e}")

    async def match_youtube_stream(self, artist: str, title: str) -> Optional[Dict[str, Any]]:
        """Search YouTube for the best matching audio stream."""
        query = f"ytsearch1:{artist} - {title} audio"
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
            "socket_timeout": 8,
        }

        def _search():
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(query, download=False)

        try:
            res = await asyncio.to_thread(_search)
            entries = res.get("entries", [])
            if entries and entries[0]:
                first = entries[0]
                video_id = first.get("id")
                return {
                    "id": video_id,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "title": first.get("title"),
                    "duration": first.get("duration"),
                }
        except Exception as e:
            logger.warning(f"YouTube match search failed for {artist} - {title}: {e}")
        return None

    async def _extract_info(self, url: str) -> VideoInfo:
        entity_type, entity_id = self._parse_spotify_uri(url)
        if not entity_type or not entity_id:
            raise ExtractionError(f"Invalid Spotify URL: {url}")

        if entity_type in ["playlist", "album"]:
            playlist_res = await self.extract_playlist(url)
            if playlist_res.entries:
                first_url = playlist_res.entries[0].url
                return await self._extract_info(first_url)
            raise ExtractionError(f"No playable tracks found in Spotify {entity_type}")

        entity = await self._fetch_embed_entity("track", entity_id)

        title = entity.get("title") or entity.get("name") or "Spotify Track"
        artists_list = [a.get("name") for a in entity.get("artists", []) if a.get("name")]
        artist_str = ", ".join(artists_list) if artists_list else "Unknown Artist"
        display_title = f"{artist_str} - {title}" if artist_str != "Unknown Artist" else title

        # Duration in seconds
        duration_ms = entity.get("duration") or 0
        duration_sec = round(duration_ms / 1000.0, 2) if duration_ms else None

        # Cover art: find highest resolution image
        cover_art = None
        images = entity.get("visualIdentity", {}).get("image", [])
        if images and isinstance(images, list):
            # Sort by maxHeight descending
            sorted_imgs = sorted(images, key=lambda x: x.get("maxHeight", 0), reverse=True)
            cover_art = sorted_imgs[0].get("url")

        # Match to YouTube audio stream
        matched = await self.match_youtube_stream(artist_str, title)
        matched_url = matched.get("url") if matched else None

        formats = [
            FormatModel(
                format_id="audio_mp3_320",
                quality="MP3 Audio (320 kbps)",
                extension="mp3",
                filesize=int(round((duration_sec or 180) * 320 * 1024 / 8)),
                is_video=False,
                is_audio=True,
                bitrate=320,
            ),
            FormatModel(
                format_id="audio_mp3_256",
                quality="MP3 Audio (256 kbps)",
                extension="mp3",
                filesize=int(round((duration_sec or 180) * 256 * 1024 / 8)),
                is_video=False,
                is_audio=True,
                bitrate=256,
            ),
            FormatModel(
                format_id="audio_flac",
                quality="Lossless FLAC",
                extension="flac",
                filesize=int(round((duration_sec or 180) * 900 * 1024 / 8)),
                is_video=False,
                is_audio=True,
            ),
        ]

        return VideoInfo(
            id=entity_id,
            title=display_title,
            thumbnail=cover_art,
            duration=duration_sec,
            formats=formats,
            metadata={
                "artist": artist_str,
                "title": title,
                "album": entity.get("album", {}).get("name") if entity.get("album") else None,
                "cover_art": cover_art,
                "release_date": entity.get("releaseDate"),
                "matched_url": matched_url,
                "spotify_url": url,
                "spotify_id": entity_id,
            },
            source=self.name,
            content_type=ContentType.AUDIO,
        )

    async def extract_playlist(self, url: str) -> PlaylistAnalyzeResponse:
        entity_type, entity_id = self._parse_spotify_uri(url)
        if not entity_type or not entity_id or entity_type not in ["playlist", "album", "artist"]:
            raise ExtractionError(f"URL is not a Spotify playlist or album: {url}")

        entity = await self._fetch_embed_entity(entity_type, entity_id)

        playlist_title = entity.get("name") or entity.get("title") or f"Spotify {entity_type.capitalize()}"
        uploader = entity.get("subtitle") or "Spotify"
        track_list = entity.get("trackList", [])

        # Cover art
        cover_art = None
        images = entity.get("visualIdentity", {}).get("image", [])
        if images and isinstance(images, list):
            sorted_imgs = sorted(images, key=lambda x: x.get("maxHeight", 0), reverse=True)
            cover_art = sorted_imgs[0].get("url")

        entries: List[PlaylistEntryModel] = []
        for idx, t in enumerate(track_list, start=1):
            t_uri = t.get("uri") or ""
            t_id = t_uri.split(":")[-1] if ":" in t_uri else f"track_{idx}"
            t_title = t.get("title") or f"Track {idx}"
            t_subtitle = t.get("subtitle") or ""
            display_title = f"{t_subtitle} - {t_title}" if t_subtitle else t_title
            
            t_dur_ms = t.get("duration") or 0
            t_dur_sec = round(t_dur_ms / 1000.0, 2) if t_dur_ms else None

            track_url = f"https://open.spotify.com/track/{t_id}"

            entries.append(
                PlaylistEntryModel(
                    id=t_id,
                    url=track_url,
                    title=display_title,
                    duration=t_dur_sec,
                    thumbnail=cover_art,
                    index=idx,
                )
            )

        return PlaylistAnalyzeResponse(
            success=True,
            id=entity_id,
            title=playlist_title,
            uploader=uploader,
            entry_count=len(entries),
            entries=entries,
        )


ExtractorRegistry.register(SpotifyExtractor())
