import os
import re
import asyncio
import logging
from typing import Optional, Tuple, Dict, Any
import httpx
import mutagen
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, COMM, APIC, ID3NoHeaderError
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture
from mutagen.oggopus import OggOpus

logger = logging.getLogger(__name__)

MUSICBRAINZ_USER_AGENT = "OmniDownload/1.0.0 (https://github.com/ADITYAKUMARSINGH16/OmniDownloader)"


class AudioTagger:
    """Automated audio metadata cleaner, MusicBrainz tagger, and cover art embedder."""

    @staticmethod
    def clean_title_and_artist(raw_title: str, uploader: Optional[str] = None) -> Tuple[str, str]:
        """Cleans video title noise and parses artist and song title."""
        if not raw_title:
            return "Unknown Artist", "Unknown Track"

        # Remove common video bracketed and parenthesized noise
        cleaned = raw_title
        junk_patterns = [
            r"\[(?:official\s+)?(?:hd\s+|4k\s+|hq\s+|music\s+)?video\]",
            r"\((?:official\s+)?(?:hd\s+|4k\s+|hq\s+|music\s+)?video\)",
            r"\[(?:official\s+)?(?:hd\s+|4k\s+|hq\s+)?audio\]",
            r"\((?:official\s+)?(?:hd\s+|4k\s+|hq\s+)?audio\)",
            r"\[(?:official\s+)?(?:lyric\s+video|lyrics)\]",
            r"\((?:official\s+)?(?:lyric\s+video|lyrics)\)",
            r"\[(?:hd|4k|hq|remastered|remaster|visualizer)\]",
            r"\((?:hd|4k|hq|remastered|remaster|visualizer)\)",
            r"\[4k\s+(?:remastered|remaster)\]",
            r"\(4k\s+(?:remastered|remaster)\)",
            r"\((?:video\s+clip|clip\s+officiel)\)",
            r"\[(?:video\s+clip|clip\s+officiel)\]",
            r"\(prod\.\s+[^\)]+\)",
            r"\[prod\.\s+[^\]]+\]",
        ]
        for pattern in junk_patterns:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

        cleaned = cleaned.strip(" -–—|: \t\r\n\"'")

        # Check for Artist - Title separator
        for sep in [" - ", " – ", " — ", " | "]:
            if sep in cleaned:
                parts = cleaned.split(sep, 1)
                artist = parts[0].strip(" \"'")
                title = parts[1].strip(" \"'")
                if artist and title:
                    return artist, title

        # Fallback to uploader as artist if available
        if uploader:
            clean_uploader = re.sub(r"\s*-\s*Topic$", "", uploader.strip())
            clean_uploader = re.sub(r"VEVO$", "", clean_uploader.strip(), flags=re.IGNORECASE)
            return clean_uploader.strip() or "Unknown Artist", cleaned

        return "Unknown Artist", cleaned

    async def fetch_musicbrainz_metadata(
        self, artist: str, title: str
    ) -> Optional[Dict[str, Any]]:
        """Queries MusicBrainz API for official album title, year, and cover art."""
        if not artist or artist == "Unknown Artist" or not title:
            return None

        # Clean search terms
        q_artist = re.sub(r"[^\w\s]", "", artist).strip()
        q_title = re.sub(r"[^\w\s]", "", title).strip()

        if not q_artist or not q_title:
            return None

        url = "https://musicbrainz.org/ws/2/recording/"
        params = {
            "query": f'recording:"{q_title}" AND artist:"{q_artist}"',
            "fmt": "json",
            "limit": 1,
        }
        headers = {"User-Agent": MUSICBRAINZ_USER_AGENT, "Accept": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=3.0, headers=headers) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return None
                data = resp.json()
                recordings = data.get("recordings", [])
                if not recordings:
                    return None

                rec = recordings[0]
                releases = rec.get("releases", [])
                album = releases[0].get("title") if releases else None
                date = releases[0].get("date") if releases else rec.get("first-release-date")
                year = date.split("-")[0] if date else None
                release_id = releases[0].get("id") if releases else None

                cover_art_url = None
                if release_id:
                    cover_art_url = f"https://coverartarchive.org/release/{release_id}/front-500"

                return {
                    "album": album,
                    "year": year,
                    "release_id": release_id,
                    "cover_art_url": cover_art_url,
                }
        except Exception as e:
            logger.debug(f"MusicBrainz lookup skipped or timed out: {e}")
            return None

    async def fetch_image_bytes(self, image_url: Optional[str]) -> Optional[bytes]:
        """Downloads cover art image bytes."""
        if not image_url:
            return None

        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                resp = await client.get(image_url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    return resp.content
        except Exception as e:
            logger.debug(f"Failed to fetch cover art from {image_url}: {e}")
        return None

    def apply_tags(
        self,
        file_path: str,
        title: str,
        artist: str,
        album: Optional[str] = None,
        year: Optional[str] = None,
        cover_bytes: Optional[bytes] = None,
    ) -> bool:
        """Applies format-appropriate native tags and album artwork using mutagen."""
        if not os.path.isfile(file_path):
            return False

        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        album_name = album or title

        try:
            if ext == "mp3":
                self._tag_mp3(file_path, title, artist, album_name, year, cover_bytes)
            elif ext in ["m4a", "mp4", "aac"]:
                self._tag_mp4(file_path, title, artist, album_name, year, cover_bytes)
            elif ext == "flac":
                self._tag_flac(file_path, title, artist, album_name, year, cover_bytes)
            elif ext in ["opus", "ogg"]:
                self._tag_ogg(file_path, title, artist, album_name, year, cover_bytes)
            else:
                logger.debug(f"No tagger supported for extension .{ext}")
                return False

            logger.info(f"Successfully tagged audio: {os.path.basename(file_path)} [{artist} - {title}]")
            return True
        except Exception as e:
            logger.warning(f"Error applying tags to {file_path}: {e}")
            return False

    def _tag_mp3(
        self,
        file_path: str,
        title: str,
        artist: str,
        album: str,
        year: Optional[str],
        cover_bytes: Optional[bytes],
    ):
        try:
            audio = ID3(file_path)
        except ID3NoHeaderError:
            audio = ID3()

        audio.add(TIT2(encoding=3, text=title))
        audio.add(TPE1(encoding=3, text=artist))
        audio.add(TALB(encoding=3, text=album))
        if year:
            audio.add(TDRC(encoding=3, text=str(year)))
        audio.add(COMM(encoding=3, lang="eng", desc="Tag", text="Downloaded via OmniDownload"))

        if cover_bytes:
            mime = "image/png" if cover_bytes.startswith(b"\x89PNG") else "image/jpeg"
            audio.delall("APIC")
            audio.add(
                APIC(
                    encoding=3,
                    mime=mime,
                    type=3,  # Front cover
                    desc="Cover",
                    data=cover_bytes,
                )
            )

        audio.save(file_path, v2_version=3)

    def _tag_mp4(
        self,
        file_path: str,
        title: str,
        artist: str,
        album: str,
        year: Optional[str],
        cover_bytes: Optional[bytes],
    ):
        audio = MP4(file_path)
        audio["\xa9nam"] = [title]
        audio["\xa9ART"] = [artist]
        audio["\xa9alb"] = [album]
        if year:
            audio["\xa9day"] = [str(year)]

        if cover_bytes:
            fmt = (
                MP4Cover.FORMAT_PNG
                if cover_bytes.startswith(b"\x89PNG")
                else MP4Cover.FORMAT_JPEG
            )
            audio["covr"] = [MP4Cover(cover_bytes, imageformat=fmt)]

        audio.save()

    def _tag_flac(
        self,
        file_path: str,
        title: str,
        artist: str,
        album: str,
        year: Optional[str],
        cover_bytes: Optional[bytes],
    ):
        audio = FLAC(file_path)
        audio["title"] = title
        audio["artist"] = artist
        audio["album"] = album
        if year:
            audio["date"] = str(year)

        if cover_bytes:
            pic = Picture()
            pic.type = 3  # Cover (front)
            pic.mime = "image/png" if cover_bytes.startswith(b"\x89PNG") else "image/jpeg"
            pic.data = cover_bytes
            audio.clear_pictures()
            audio.add_picture(pic)

        audio.save()

    def _tag_ogg(
        self,
        file_path: str,
        title: str,
        artist: str,
        album: str,
        year: Optional[str],
        cover_bytes: Optional[bytes],
    ):
        audio = OggOpus(file_path)
        audio["title"] = [title]
        audio["artist"] = [artist]
        audio["album"] = [album]
        if year:
            audio["date"] = [str(year)]
        audio.save()

    async def tag_audio_file(
        self,
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None,
        thumbnail_url: Optional[str] = None,
        embed_art: bool = True,
    ) -> bool:
        """High-level async workflow to clean, enrich, fetch art, and tag an audio file."""
        if not file_path or not os.path.isfile(file_path):
            return False

        meta = metadata or {}
        raw_title = meta.get("title") or os.path.basename(file_path)
        uploader = meta.get("uploader") or meta.get("artist") or meta.get("uploader_id")

        # 1. Clean Title and Artist
        artist, title = self.clean_title_and_artist(raw_title, uploader=uploader)
        album = meta.get("album")
        year = meta.get("upload_date", "")[:4] if meta.get("upload_date") else None

        # 2. Enrich with MusicBrainz
        cover_art_url = thumbnail_url or meta.get("thumbnail")
        mb_data = await self.fetch_musicbrainz_metadata(artist, title)
        if mb_data:
            album = album or mb_data.get("album")
            year = year or mb_data.get("year")
            if mb_data.get("cover_art_url"):
                cover_art_url = mb_data.get("cover_art_url")

        # 3. Download Cover Artwork if requested
        cover_bytes = None
        if embed_art and cover_art_url:
            cover_bytes = await self.fetch_image_bytes(cover_art_url)
            # If MusicBrainz cover art archive 404s, fall back to thumbnail
            if not cover_bytes and thumbnail_url and thumbnail_url != cover_art_url:
                cover_bytes = await self.fetch_image_bytes(thumbnail_url)

        # 4. Apply tags in thread executor to keep event loop fast
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self.apply_tags, file_path, title, artist, album, year, cover_bytes
        )


audio_tagger = AudioTagger()
