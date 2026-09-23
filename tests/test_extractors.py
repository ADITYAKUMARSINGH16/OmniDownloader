import pytest
from extractors.base import ExtractorRegistry
from extractors.youtube import YouTubeExtractor, YouTubeMusicExtractor
from extractors.reddit import RedditExtractor
from extractors.twitter import TwitterExtractor
from extractors.instagram import InstagramExtractor
from extractors.facebook import FacebookExtractor
from extractors.terabox import TeraboxExtractor
from extractors.pinterest import PinterestExtractor
from extractors.generic import GenericExtractor
from core.exceptions import ExtractionError


class TestExtractorRegistry:
    def setup_method(self):
        ExtractorRegistry.clear()
        ExtractorRegistry.register(YouTubeExtractor())
        ExtractorRegistry.register(YouTubeMusicExtractor())
        ExtractorRegistry.register(RedditExtractor())
        ExtractorRegistry.register(TwitterExtractor())
        ExtractorRegistry.register(InstagramExtractor())
        ExtractorRegistry.register(FacebookExtractor())
        ExtractorRegistry.register(TeraboxExtractor())
        ExtractorRegistry.register(PinterestExtractor())
        ExtractorRegistry.register(GenericExtractor())
    
    @classmethod
    def teardown_class(cls):
        import extractors
        from extractors.torrent import TorrentExtractor
        if not any(e.name == "torrent" for e in ExtractorRegistry.get_all_extractors()):
            ExtractorRegistry.register(TorrentExtractor())
    
    def test_youtube_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "youtube" in names
        assert "youtube_music" in names
    
    def test_reddit_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "reddit" in names
    
    def test_twitter_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "twitter" in names
    
    def test_instagram_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "instagram" in names
    
    def test_facebook_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "facebook" in names
    
    def test_terabox_extractor_registered(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "terabox" in names
    
    def test_generic_extractor_is_fallback(self):
        extractors = ExtractorRegistry.get_all_extractors()
        names = [e.name for e in extractors]
        assert "generic" in names
        # Generic should be last (fallback)
        assert extractors[-1].name == "generic"
    
    def test_youtube_url_detection(self):
        urls = [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://youtube.com/watch?v=dQw4w9WgXcQ",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtube-nocookie.com/embed/dQw4w9WgXcQ",
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name in ["youtube", "youtube_music"]
    
    def test_reddit_url_detection(self):
        urls = [
            "https://www.reddit.com/r/videos/comments/test/video_title/",
            "https://reddit.com/r/test/comments/abc/video/",
            "https://old.reddit.com/r/test/comments/abc/video/",
            "https://v.redd.it/abc123",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "reddit"
    
    def test_twitter_url_detection(self):
        urls = [
            "https://twitter.com/user/status/123456789",
            "https://x.com/user/status/123456789",
            "https://mobile.twitter.com/user/status/123456789",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "twitter"
    
    def test_instagram_url_detection(self):
        urls = [
            "https://www.instagram.com/p/ABC123/",
            "https://instagram.com/reel/ABC123/",
            "https://instagr.am/p/ABC123/",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "instagram"
    
    def test_facebook_url_detection(self):
        urls = [
            "https://www.facebook.com/watch/?v=123456789",
            "https://facebook.com/watch/?v=123456789",
            "https://fb.watch/abc123/",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "facebook"
    
    def test_terabox_url_detection(self):
        urls = [
            "https://terabox.com/s/abc123",
            "https://www.teraboxapp.com/s/abc123",
            "https://1024terabox.com/s/abc123",
            "https://freeterabox.com/s/abc123",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "terabox"
    
    def test_pinterest_url_detection(self):
        urls = [
            "https://www.pinterest.com/pin/123456789/",
            "https://in.pinterest.com/pin/123456789/",
            "https://pin.it/abc1234",
        ]
        for url in urls:
            extractor = ExtractorRegistry.get_extractor(url)
            assert extractor is not None
            assert extractor.name == "pinterest"

    @pytest.mark.asyncio
    async def test_pinterest_homepage_error(self):
        extractor = ExtractorRegistry.get_extractor("https://in.pinterest.com/")
        assert extractor is not None
        assert extractor.name == "pinterest"
        with pytest.raises(ExtractionError, match="rather than the Pinterest homepage"):
            await extractor._extract_info("https://in.pinterest.com/")

    def test_generic_fallback_for_unknown(self):
        url = "https://unknown-site.com/file.mp4"
        extractor = ExtractorRegistry.get_extractor(url)
        assert extractor is not None
        assert extractor.name == "generic"