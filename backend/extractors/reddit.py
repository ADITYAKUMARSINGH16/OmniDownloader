import html
import logging
import urllib.parse
import asyncio
import yt_dlp
import httpx
from typing import List, Dict, Any, Optional

from extractors.base import BaseExtractor, VideoInfo, ExtractorRegistry
from models.schemas import ContentType, FormatModel
from core.exceptions import ExtractionError
from core.config import settings

logger = logging.getLogger(__name__)


class RedditExtractor(BaseExtractor):
    name = "reddit"
    domains = [
        "reddit.com",
        "www.reddit.com",
        "old.reddit.com",
        "v.redd.it",
        "redd.it",
        "i.redd.it",
        "preview.redd.it",
    ]

    def supports(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.domains)

    async def _get_remote_size(self, url: str) -> Optional[int]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
                resp = await client.head(url)
                if resp.status_code == 200:
                    cl = resp.headers.get("content-length")
                    return int(cl) if cl and cl.isdigit() else None
        except Exception:
            pass
        return None

    def _sync_fetch_reddit_post(self, clean_url: str):
        """Fetch Reddit post JSON using RedditIE's established session to bypass 403."""
        opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ie = yt_dlp.extractor.reddit.RedditIE(ydl)
            match = ie._match_valid_url(clean_url)
            if not match:
                return None, None, None
            slug, video_id = match.group("slug", "id")
            ie._request_webpage("https://old.reddit.com/login", video_id)
            data = ie._download_json(f"https://www.reddit.com/{slug}/.json", video_id)
            return data, slug, video_id

    async def _extract_info(self, url: str) -> VideoInfo:
        # Strip fragment like #lightbox and clean URL
        clean_url = url.split("#")[0].strip()

        # Handle direct i.redd.it or preview.redd.it links
        parsed = urllib.parse.urlparse(clean_url)
        domain = parsed.netloc.lower()
        if domain in ["i.redd.it", "preview.redd.it"]:
            parsed_path = parsed.path
            ext = parsed_path.split(".")[-1].lower() if "." in parsed_path else "bin"
            size = await self._get_remote_size(clean_url)
            is_gif = ext == "gif"
            quality = "Original Animated GIF" if is_gif else f"Original Image ({ext.upper()})"
            format_item = FormatModel(
                format_id=clean_url,
                quality=quality,
                extension=ext,
                filesize=size,
                is_video=is_gif,
                is_audio=False,
                protocol="https",
            )
            return VideoInfo(
                id=urllib.parse.quote_plus(clean_url[:40]),
                title=f"Reddit Media ({ext.upper()})",
                thumbnail=clean_url,
                duration=None,
                formats=[format_item],
                metadata={"url": clean_url},
                source=self.name,
                content_type=ContentType.VIDEO if is_gif else ContentType.IMAGE,
            )

        ydl_opts = {
            **self.ydl_opts,
            "format": "bestvideo+bestaudio/best",
            "noplaylist": True,
        }

        loop = asyncio.get_running_loop()

        # Check Reddit post JSON to see if it's a native video or an image/gif/media post
        try:
            data, slug, video_id = await loop.run_in_executor(None, self._sync_fetch_reddit_post, clean_url)
        except Exception as err:
            logger.warning(f"Failed to fetch Reddit post JSON via RedditIE: {err}")
            data, slug, video_id = None, None, None

        if data and isinstance(data, list) and data[0].get("data", {}).get("children"):
            post = data[0]["data"]["children"][0]["data"]
            title = post.get("title", "Reddit Post")
            post_url = post.get("url", "")
            subreddit = post.get("subreddit")
            author = post.get("author")
            score = post.get("ups")
            num_comments = post.get("num_comments")

            # Check if this post contains a native Reddit video (v.redd.it)
            has_reddit_video = False
            if post.get("media") and post["media"].get("reddit_video"):
                has_reddit_video = True
            elif post.get("secure_media") and post["secure_media"].get("reddit_video"):
                has_reddit_video = True
            elif post.get("crosspost_parent_list") and len(post["crosspost_parent_list"]) > 0:
                parent = post["crosspost_parent_list"][0]
                if parent.get("secure_media") and parent["secure_media"].get("reddit_video"):
                    has_reddit_video = True

            if has_reddit_video:
                # Use yt-dlp to extract the native video formats
                try:
                    with self._create_ydl(ydl_opts) as ydl:
                        info = await loop.run_in_executor(None, lambda: ydl.extract_info(clean_url, download=False))
                        if info:
                            formats = self._parse_formats(info.get("formats", []))
                            return VideoInfo(
                                id=info.get("id", video_id or ""),
                                title=info.get("title", title),
                                thumbnail=info.get("thumbnail"),
                                duration=info.get("duration"),
                                formats=formats,
                                metadata={
                                    "subreddit": subreddit,
                                    "author": author,
                                    "score": score,
                                    "num_comments": num_comments,
                                    "permalink": f"https://www.reddit.com/{slug}/" if slug else clean_url,
                                },
                                source=self.name,
                                content_type=ContentType.VIDEO,
                            )
                except Exception as ydl_err:
                    logger.warning(f"yt-dlp failed on Reddit video: {ydl_err}, falling back to manual extraction")

            # Check if post links to an external video site (YouTube, Imgur, RedGIFs, etc.)
            ext_domain = post.get("domain", "").lower()
            if any(s in ext_domain for s in ["youtube.com", "youtu.be", "redgifs.com", "imgur.com", "streamable.com", "gfycat.com"]):
                try:
                    with self._create_ydl(ydl_opts) as ydl:
                        info = await loop.run_in_executor(None, lambda: ydl.extract_info(post_url, download=False))
                        if info:
                            formats = self._parse_formats(info.get("formats", []))
                            return VideoInfo(
                                id=info.get("id", video_id or ""),
                                title=title or info.get("title", "Reddit Post"),
                                thumbnail=info.get("thumbnail"),
                                duration=info.get("duration"),
                                formats=formats,
                                metadata={
                                    "subreddit": subreddit,
                                    "author": author,
                                    "score": score,
                                    "num_comments": num_comments,
                                    "permalink": f"https://www.reddit.com/{slug}/" if slug else clean_url,
                                },
                                source=self.name,
                                content_type=ContentType.VIDEO,
                            )
                except Exception as ext_err:
                    logger.warning(f"Failed external video extraction: {ext_err}")

            # Non-video post: animated GIF, image, or preview variant
            formats: List[FormatModel] = []
            preview_image = None

            preview = post.get("preview", {})
            images = preview.get("images", []) if preview else []
            variants = {}
            if images:
                first_img = images[0]
                src = first_img.get("source", {})
                preview_image = html.unescape(src.get("url", "")) if src.get("url") else None
                variants = first_img.get("variants", {})

            # 1. MP4 Video variant (if available, e.g. for animated GIFs)
            if "mp4" in variants:
                mp4_source = variants["mp4"].get("source", {})
                if mp4_source.get("url"):
                    mp4_url = html.unescape(mp4_source["url"])
                    w = mp4_source.get("width")
                    h = mp4_source.get("height")
                    size = await self._get_remote_size(mp4_url)
                    quality_label = f"{h}p MP4 (Video)" if h else "MP4 Video"
                    formats.append(
                        FormatModel(
                            format_id=mp4_url,
                            quality=quality_label,
                            extension="mp4",
                            filesize=size,
                            width=w,
                            height=h,
                            is_video=True,
                            is_audio=False,
                            protocol="https",
                        )
                    )

            # 2. Original file (GIF, PNG, JPG, WebP)
            if post_url:
                parsed_path = urllib.parse.urlparse(post_url).path
                ext = parsed_path.split(".")[-1].lower() if "." in parsed_path else "bin"
                if ext not in ["gif", "png", "jpg", "jpeg", "webp", "mp4"]:
                    ext = "gif" if "gif" in post_url.lower() else "jpg"

                size = await self._get_remote_size(post_url)
                is_gif = ext == "gif"
                quality_label = "Original Animated GIF" if is_gif else f"Original Image ({ext.upper()})"

                formats.append(
                    FormatModel(
                        format_id=post_url,
                        quality=quality_label,
                        extension=ext,
                        filesize=size,
                        is_video=is_gif,
                        is_audio=False,
                        protocol="https",
                    )
                )

            # 3. Handle galleries (multiple images)
            if post.get("media_metadata"):
                meta = post["media_metadata"]
                for item_id, item_data in meta.items():
                    if item_data.get("status") == "valid" and item_data.get("s"):
                        s = item_data["s"]
                        img_url = html.unescape(s.get("u", ""))
                        if img_url:
                            size = await self._get_remote_size(img_url)
                            w = s.get("x")
                            h = s.get("y")
                            formats.append(
                                FormatModel(
                                    format_id=img_url,
                                    quality=f"Gallery Image ({w}x{h})" if w and h else "Gallery Image",
                                    extension="jpg",
                                    filesize=size,
                                    width=w,
                                    height=h,
                                    is_video=False,
                                    is_audio=False,
                                    protocol="https",
                                )
                            )

            thumbnail = preview_image or post.get("thumbnail")
            if thumbnail and not thumbnail.startswith("http"):
                thumbnail = None

            content_type = ContentType.VIDEO if any(f.is_video for f in formats) else ContentType.IMAGE

            if formats:
                return VideoInfo(
                    id=video_id or "reddit_post",
                    title=title,
                    thumbnail=thumbnail,
                    duration=None,
                    formats=formats,
                    metadata={
                        "subreddit": subreddit,
                        "author": author,
                        "score": score,
                        "num_comments": num_comments,
                        "permalink": f"https://www.reddit.com/{slug}/" if slug else clean_url,
                    },
                    source=self.name,
                    content_type=content_type,
                )

        # Fallback to standard yt-dlp extraction if post data parsing didn't return
        try:
            with self._create_ydl(ydl_opts) as ydl:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(clean_url, download=False))
                if not info:
                    raise ExtractionError("Failed to extract Reddit post info")

                formats = self._parse_formats(info.get("formats", []))
                return VideoInfo(
                    id=info.get("id", ""),
                    title=info.get("title", "Reddit Post"),
                    thumbnail=info.get("thumbnail"),
                    duration=info.get("duration"),
                    formats=formats,
                    metadata={
                        "subreddit": info.get("subreddit"),
                        "author": info.get("uploader"),
                        "score": info.get("like_count"),
                        "num_comments": info.get("comment_count"),
                        "permalink": info.get("webpage_url") or clean_url,
                    },
                    source=self.name,
                    content_type=ContentType.VIDEO if formats else ContentType.UNKNOWN,
                )
        except yt_dlp.utils.DownloadError as e:
            raise ExtractionError(f"Reddit extraction failed: {str(e)}")


ExtractorRegistry.register(RedditExtractor())