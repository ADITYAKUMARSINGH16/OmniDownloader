import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.tagger import AudioTagger, audio_tagger
import os


class TestAudioTaggerTitleParsing:
    def test_clean_standard_artist_dash_title(self):
        artist, title = AudioTagger.clean_title_and_artist("Coldplay - Yellow")
        assert artist == "Coldplay"
        assert title == "Yellow"

    def test_clean_youtube_video_noise(self):
        cases = [
            ("Coldplay - Yellow (Official Video)", "Coldplay", "Yellow"),
            ("Queen - Bohemian Rhapsody [Official HD Video]", "Queen", "Bohemian Rhapsody"),
            ("Adele - Rolling in the Deep (Lyric Video)", "Adele", "Rolling in the Deep"),
            ("Imagine Dragons - Believer (Audio)", "Imagine Dragons", "Believer"),
            ("The Weeknd - Blinding Lights [4K Remastered]", "The Weeknd", "Blinding Lights"),
            ("Dua Lipa - Levitating [Visualizer]", "Dua Lipa", "Levitating"),
            ("Stromae - Papaoutai (Clip Officiel)", "Stromae", "Papaoutai"),
        ]
        for raw, expected_artist, expected_title in cases:
            a, t = AudioTagger.clean_title_and_artist(raw)
            assert a == expected_artist, f"Failed on raw: {raw}"
            assert t == expected_title, f"Failed on raw: {raw}"

    def test_clean_different_separators(self):
        a1, t1 = AudioTagger.clean_title_and_artist("Artist – Track Name")  # En-dash
        assert a1 == "Artist"
        assert t1 == "Track Name"

        a2, t2 = AudioTagger.clean_title_and_artist("Artist — Track Name")  # Em-dash
        assert a2 == "Artist"
        assert t2 == "Track Name"

        a3, t3 = AudioTagger.clean_title_and_artist("Artist | Track Name")  # Pipe
        assert a3 == "Artist"
        assert t3 == "Track Name"

    def test_uploader_fallback(self):
        # When no separator is in the title, use uploader
        a, t = AudioTagger.clean_title_and_artist("Track Only Without Separator", uploader="Dua Lipa - Topic")
        assert a == "Dua Lipa"
        assert t == "Track Only Without Separator"

        a2, t2 = AudioTagger.clean_title_and_artist("Track Only", uploader="TaylorSwiftVEVO")
        assert a2 == "TaylorSwift"
        assert t2 == "Track Only"

    def test_empty_title_edge_case(self):
        a, t = AudioTagger.clean_title_and_artist("")
        assert a == "Unknown Artist"
        assert t == "Unknown Track"


class TestAudioTaggerMusicBrainz:
    @pytest.mark.asyncio
    async def test_fetch_musicbrainz_success(self):
        mock_response_data = {
            "recordings": [
                {
                    "title": "Yellow",
                    "first-release-date": "2000-06-26",
                    "releases": [
                        {
                            "id": "release-uuid-1234",
                            "title": "Parachutes",
                            "date": "2000-07-10",
                        }
                    ],
                }
            ]
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_response_data

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            tagger = AudioTagger()
            meta = await tagger.fetch_musicbrainz_metadata("Coldplay", "Yellow")

            assert meta is not None
            assert meta["album"] == "Parachutes"
            assert meta["year"] == "2000"
            assert "release-uuid-1234" in meta["cover_art_url"]

    @pytest.mark.asyncio
    async def test_fetch_musicbrainz_no_recordings(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"recordings": []}

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            tagger = AudioTagger()
            meta = await tagger.fetch_musicbrainz_metadata("Unknown Artist", "Unknown Track")
            assert meta is None

    @pytest.mark.asyncio
    async def test_fetch_musicbrainz_http_error(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 503

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            tagger = AudioTagger()
            meta = await tagger.fetch_musicbrainz_metadata("Coldplay", "Yellow")
            assert meta is None

    @pytest.mark.asyncio
    async def test_fetch_musicbrainz_timeout(self):
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timeout")):
            tagger = AudioTagger()
            meta = await tagger.fetch_musicbrainz_metadata("Coldplay", "Yellow")
            assert meta is None


class TestAudioTaggerCoverArt:
    @pytest.mark.asyncio
    async def test_fetch_image_bytes_success(self):
        fake_bytes = b"\x89PNG\r\n\x1a\n" + (b"\x00" * 2000)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = fake_bytes

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            tagger = AudioTagger()
            result = await tagger.fetch_image_bytes("https://example.com/cover.png")
            assert result == fake_bytes

    @pytest.mark.asyncio
    async def test_fetch_image_bytes_too_small(self):
        # Less than 1000 bytes is considered invalid/placeholder
        fake_bytes = b"tiny"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = fake_bytes

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_resp
            tagger = AudioTagger()
            result = await tagger.fetch_image_bytes("https://example.com/small.jpg")
            assert result is None

    @pytest.mark.asyncio
    async def test_fetch_image_bytes_network_error(self):
        with patch("httpx.AsyncClient.get", side_effect=Exception("Network error")):
            tagger = AudioTagger()
            result = await tagger.fetch_image_bytes("https://example.com/cover.jpg")
            assert result is None


class TestAudioTaggerApplication:
    def test_apply_tags_nonexistent_file(self):
        tagger = AudioTagger()
        res = tagger.apply_tags("/path/to/nonexistent/file.mp3", "Title", "Artist")
        assert res is False

    def test_apply_tags_unsupported_format(self, tmp_path):
        dummy_file = tmp_path / "test.txt"
        dummy_file.write_text("not audio")
        tagger = AudioTagger()
        res = tagger.apply_tags(str(dummy_file), "Title", "Artist")
        assert res is False

    @pytest.mark.asyncio
    async def test_tag_audio_file_orchestration(self, tmp_path):
        dummy_mp3 = tmp_path / "test_song.mp3"
        dummy_mp3.write_bytes(b"dummy audio content")

        tagger = AudioTagger()
        with patch.object(tagger, "fetch_musicbrainz_metadata", new_callable=AsyncMock) as mock_mb, \
             patch.object(tagger, "fetch_image_bytes", new_callable=AsyncMock) as mock_img, \
             patch.object(tagger, "apply_tags") as mock_apply:

            mock_mb.return_value = {
                "album": "A Rush of Blood to the Head",
                "year": "2002",
                "cover_art_url": "https://coverartarchive.org/release/123/front-500",
            }
            mock_img.return_value = b"image_data_bytes"
            mock_apply.return_value = True

            success = await tagger.tag_audio_file(
                file_path=str(dummy_mp3),
                metadata={"title": "Coldplay - Clocks (Official Video)", "uploader": "Coldplay"},
                thumbnail_url="https://youtube.com/thumb.jpg",
                embed_art=True,
            )

            assert success is True
            mock_apply.assert_called_once()
            args = mock_apply.call_args[0]
            assert args[0] == str(dummy_mp3)
            assert args[1] == "Clocks"
            assert args[2] == "Coldplay"
            assert args[3] == "A Rush of Blood to the Head"
            assert args[4] == "2002"
            assert args[5] == b"image_data_bytes"
