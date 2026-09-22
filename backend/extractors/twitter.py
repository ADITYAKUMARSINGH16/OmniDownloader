import re
import logging
import asyncio
import yt_dlp
import httpx
from typing import List, Dict, Any, Optional

from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings

logger = logging.getLogger(__name__)


class TwitterExtractor(BaseExtractor):
    name = "twitter"
    domains = ["twitter.com", "x.com", "mobile.twitter.com", "mobile.x.com"]
    
    def supports(self, url: str) -> bool:
        return self.matches_domain(url)

    async def _fxtwitter_extract(self, url: str) -> Optional[VideoInfo]:
        """Fallback to FxTwitter API when yt-dlp encounters issues or for image/multi-media posts."""
        m = re.search(r'status/(\d+)', url)
        if not m:
            return None
        tweet_id = m.group(1)
        
        headers = {
            "User-Agent": settings.user_agent,
            "Accept": "application/json",
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
                resp = await client.get(f"https://api.fxtwitter.com/status/{tweet_id}")
                if resp.status_code != 200:
                    return None
                data = resp.json().get("tweet", {})
                if not data:
                    return None
                
                title = data.get("text", "Twitter/X Post")
                author_info = data.get("author", {})
                author = author_info.get("name", "Twitter User")
                author_handle = author_info.get("screen_name")
                likes = data.get("likes", 0)
                retweets = data.get("retweets", 0)
                replies = data.get("replies", 0)

                media = data.get("media", {})
                formats: List[FormatModel] = []

                # Videos
                for v in media.get("videos", []):
                    v_url = v.get("url")
                    if not v_url:
                        continue
                    w = v.get("width")
                    h = v.get("height")
                    quality_str = f"{h}p MP4 (Video)" if h else "MP4 Video"
                    formats.append(
                        FormatModel(
                            format_id=v_url,
                            quality=quality_str,
                            extension="mp4",
                            width=w,
                            height=h,
                            is_video=True,
                            is_audio=False,
                            protocol="https",
                        )
                    )

                # Photos
                for p in media.get("photos", []):
                    p_url = p.get("url")
                    if not p_url:
                        continue
                    w = p.get("width")
                    h = p.get("height")
                    quality_str = f"Photo ({w}x{h})" if w and h else "Original Photo"
                    formats.append(
                        FormatModel(
                            format_id=p_url,
                            quality=quality_str,
                            extension="jpg",
                            width=w,
                            height=h,
                            is_video=False,
                            is_audio=False,
                            protocol="https",
                        )
                    )

                thumbnail = None
                if media.get("videos"):
                    thumbnail = media["videos"][0].get("thumbnail_url")
                elif media.get("photos"):
                    thumbnail = media["photos"][0].get("url")

                is_video = any(f.is_video for f in formats)

                return VideoInfo(
                    id=tweet_id,
                    title=f"{author}: {title}"[:100] if author else title[:100],
                    thumbnail=thumbnail,
                    duration=None,
                    formats=formats,
                    metadata={
                        "author": author,
                        "author_id": author_handle,
                        "tweet_id": tweet_id,
                        "like_count": likes,
                        "retweet_count": retweets,
                        "reply_count": replies,
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if is_video else ContentType.IMAGE,
                )
        except Exception as e:
            logger.warning(f"FxTwitter extraction fallback failed: {e}")
            return None
    
    async def _extract_info(self, url: str) -> VideoInfo:
        clean_url = url.split("#")[0].strip()
        
        ydl_opts = {
            **self.ydl_opts,
            "format": "bestvideo+bestaudio/best",
            "noplaylist": True,
        }
        
        loop = asyncio.get_running_loop()
        
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(clean_url, download=False))
                
                if info:
                    formats = self._parse_formats(info.get("formats", []))
                    if formats:
                        return VideoInfo(
                            id=info.get("id", ""),
                            title=info.get("title", "Twitter/X Post"),
                            thumbnail=info.get("thumbnail"),
                            duration=info.get("duration"),
                            formats=formats,
                            metadata={
                                "author": info.get("uploader"),
                                "author_id": info.get("uploader_id"),
                                "tweet_id": info.get("id"),
                                "like_count": info.get("like_count"),
                                "retweet_count": info.get("repost_count"),
                                "reply_count": info.get("comment_count"),
                            },
                            source=self.name,
                            content_type=ContentType.VIDEO if formats else ContentType.UNKNOWN,
                        )
        except Exception as e:
            logger.info(f"yt-dlp failed for Twitter URL, attempting FxTwitter fallback: {e}")

        # Try FxTwitter API fallback
        fallback_info = await self._fxtwitter_extract(clean_url)
        if fallback_info and fallback_info.formats:
            return fallback_info

        raise ExtractionError("Failed to extract Twitter/X post media. Please ensure the tweet exists and is public.")


ExtractorRegistry.register(TwitterExtractor())