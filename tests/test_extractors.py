import pytest
from unittest.mock import patch
from extractors.base import ExtractorRegistry
from extractors.youtube import YouTubeExtractor, YouTubeMusicExtractor
from extractors.reddit import RedditExtractor
from extractors.twitter import TwitterExtractor
from extractors.instagram import InstagramExtractor
from extractors.facebook import FacebookExtractor
from extractors.terabox import TeraboxExtractor
from extractors.pinterest import PinterestExtractor
from extractors.jiosaavn import JioSaavnExtractor
from extractors.spotify import SpotifyExtractor
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
        ExtractorRegistry.register(JioSaavnExtractor())
        ExtractorRegistry.register(SpotifyExtractor())
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

    def test_parse_formats_combines_dash_video_and_best_audio_size(self):
        extractor = GenericExtractor()
        raw_formats = [
            {
                "format_id": "audio_low",
                "vcodec": "none",
                "acodec": "mp4a.40.2",
                "filesize": 1000000,
                "ext": "m4a",
                "abr": 128,
            },
            {
                "format_id": "audio_high",
                "vcodec": "none",
                "acodec": "mp4a.40.2",
                "filesize": 2880000,  # 2.88 MB
                "ext": "m4a",
                "abr": 320,
            },
            {
                "format_id": "video_1080p",
                "vcodec": "avc1.640028",
                "acodec": "none",
                "filesize": 200000000,  # 200 MB
                "height": 1080,
                "ext": "mp4",
                "fps": 30,
            },
            {
                "format_id": "video_4k_unknown_size",
                "vcodec": "vp09.00.51.08",
                "acodec": "none",
                "filesize": None,
                "filesize_approx": None,
                "height": 2160,
                "ext": "webm",
                "fps": 60,
            },
            {
                "format_id": "video_progressive_720p",
                "vcodec": "avc1.4d401f",
                "acodec": "mp4a.40.2",
                "filesize": 50000000,  # 50 MB
                "height": 720,
                "ext": "mp4",
                "fps": 30,
            },
        ]
        parsed = extractor._parse_formats(raw_formats)
        fmt_map = {f.format_id: f for f in parsed}

        # 1080p DASH video must combine its own size with the best audio size (200MB + 2.88MB)
        assert fmt_map["video_1080p"].filesize == 200000000 + 2880000
        # 4K DASH video with unknown size must remain None (must NOT fall back to 2.88MB audio size)
        assert fmt_map["video_4k_unknown_size"].filesize is None
        # Progressive 720p already has audio, so it retains its own filesize
        assert fmt_map["video_progressive_720p"].filesize == 50000000
        # Audio formats retain their original filesize
        assert fmt_map["audio_high"].filesize == 2880000
        assert fmt_map["audio_low"].filesize == 1000000

    @pytest.mark.asyncio
    async def test_extract_playlist_flat(self):
        from unittest.mock import patch
        from models.schemas import PlaylistAnalyzeResponse

        fake_playlist_data = {
            "id": "PL123456",
            "title": "My Awesome Playlist",
            "uploader": "Test Creator",
            "entries": [
                {
                    "id": "vid_1",
                    "url": "https://www.youtube.com/watch?v=vid_1",
                    "title": "Track 1",
                    "duration": 180,
                    "thumbnail": "https://example.com/thumb1.jpg",
                },
                {
                    "id": "vid_2",
                    "url": "https://www.youtube.com/watch?v=vid_2",
                    "title": "Track 2",
                    "duration": 240,
                    "thumbnail": "https://example.com/thumb2.jpg",
                },
            ],
        }

        class FakeYDL:
            def __init__(self, opts):
                pass
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def extract_info(self, url, download=False):
                return fake_playlist_data

        extractor = YouTubeExtractor()
        with patch("yt_dlp.YoutubeDL", FakeYDL):
            res = await extractor.extract_playlist("https://www.youtube.com/playlist?list=PL123456")

        assert isinstance(res, PlaylistAnalyzeResponse)
        assert res.id == "PL123456"
        assert res.title == "My Awesome Playlist"
        assert res.uploader == "Test Creator"
        assert res.entry_count == 2
        assert len(res.entries) == 2
        assert res.entries[0].title == "Track 1"
        assert res.entries[0].index == 1
        assert res.entries[1].title == "Track 2"
        assert res.entries[1].index == 2

    def test_jiosaavn_extractor_detection(self):
        extractor = ExtractorRegistry.get_extractor("https://www.jiosaavn.com/featured/chhath-puja-/qrWIQ3Gcmsc_")
        assert extractor is not None
        assert extractor.name == "jiosaavn"

        song_extractor = ExtractorRegistry.get_extractor("https://www.jiosaavn.com/song/hey-chathi-mayiya/KCoPAyZSZnI")
        assert song_extractor is not None
        assert song_extractor.name == "jiosaavn"

    def test_spotify_extractor_detection(self):
        track_ext = ExtractorRegistry.get_extractor("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")
        assert track_ext is not None
        assert track_ext.name == "spotify"

        album_ext = ExtractorRegistry.get_extractor("https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3")
        assert album_ext is not None
        assert album_ext.name == "spotify"

        playlist_ext = ExtractorRegistry.get_extractor("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
        assert playlist_ext is not None
        assert playlist_ext.name == "spotify"

    @pytest.mark.asyncio
    async def test_spotify_extractor_mocked_analysis(self):
        extractor = SpotifyExtractor()
        mock_entity = {
            "title": "Never Gonna Give You Up",
            "artists": [{"name": "Rick Astley"}],
            "duration": 213573,
            "visualIdentity": {"image": [{"url": "https://image.spotify.com/cover.jpg", "maxHeight": 640}]},
            "album": {"name": "Whenever You Need Somebody"},
            "releaseDate": "1987-11-12",
        }
        with patch.object(extractor, "_fetch_embed_entity", return_value=mock_entity):
            with patch.object(extractor, "match_youtube_stream", return_value={"url": "https://www.youtube.com/watch?v=mock123", "id": "mock123"}):
                info = await extractor.analyze("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")
                assert info.title == "Rick Astley - Never Gonna Give You Up"
                assert info.duration == 213.57
                assert info.thumbnail == "https://image.spotify.com/cover.jpg"
                assert info.metadata["matched_url"] == "https://www.youtube.com/watch?v=mock123"
                assert info.metadata["artist"] == "Rick Astley"
                assert info.metadata["album"] == "Whenever You Need Somebody"
                assert any(f.format_id == "audio_mp3_320" for f in info.formats)

    @pytest.mark.asyncio
    async def test_spotify_extractor_mocked_playlist(self):
        extractor = SpotifyExtractor()
        mock_pl = {
            "name": "Today's Top Hits",
            "subtitle": "Spotify",
            "trackList": [
                {"title": "Song One", "subtitle": "Artist A", "uri": "spotify:track:t1", "duration": 180000},
                {"title": "Song Two", "subtitle": "Artist B", "uri": "spotify:track:t2", "duration": 200000},
            ],
            "visualIdentity": {"image": [{"url": "https://image.spotify.com/pl_cover.jpg", "maxHeight": 640}]},
        }
        with patch.object(extractor, "_fetch_embed_entity", return_value=mock_pl):
            pl = await extractor.extract_playlist("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
            assert pl.title == "Today's Top Hits"
            assert pl.entry_count == 2
            assert len(pl.entries) == 2
            assert pl.entries[0].title == "Artist A - Song One"
            assert pl.entries[0].url == "https://open.spotify.com/track/t1"
            assert pl.entries[0].duration == 180.0
            assert pl.entries[1].title == "Artist B - Song Two"
