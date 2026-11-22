import pytest
from extractors.torrent import TorrentExtractor
from extractors.base import ExtractorRegistry
from models.schemas import ContentType
from core.exceptions import ExtractionError


class TestTorrentExtractor:
    def setup_method(self):
        self.extractor = TorrentExtractor()
        if not any(e.name == "torrent" for e in ExtractorRegistry.get_all_extractors()):
            ExtractorRegistry.register(self.extractor)

    def test_supports_magnet_uri(self):
        magnet = "magnet:?xt=urn:btih:d6b63c7b7e87b7a702b8d002f23cf9b2a64c483a&dn=Ubuntu+22.04"
        assert self.extractor.supports(magnet) is True

    def test_supports_torrent_file_url(self):
        url = "https://releases.ubuntu.com/22.04/ubuntu-22.04-desktop-amd64.iso.torrent"
        assert self.extractor.supports(url) is True

    def test_does_not_support_normal_url(self):
        assert self.extractor.supports("https://youtube.com/watch?v=123") is False
        assert self.extractor.supports("https://example.com/file.mp4") is False

    @pytest.mark.asyncio
    async def test_extract_magnet_metadata(self):
        magnet = "magnet:?xt=urn:btih:d6b63c7b7e87b7a702b8d002f23cf9b2a64c483a&dn=Ubuntu-22.04-Desktop&tr=http%3A%2F%2Ftorrent.ubuntu.com%3A6969%2Fannounce"
        info = await self.extractor._extract_info(magnet)

        assert info.title == "Ubuntu-22.04-Desktop"
        assert info.content_type == ContentType.TORRENT
        assert info.source == "torrent"
        assert info.metadata["info_hash"] == "D6B63C7B7E87B7A702B8D002F23CF9B2A64C483A"
        assert "http://torrent.ubuntu.com:6969/announce" in info.metadata["trackers"]
        assert len(info.formats) == 1
        assert info.formats[0].protocol == "bittorrent"

    @pytest.mark.asyncio
    async def test_extract_torrent_url(self):
        url = "https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso.torrent"
        info = await self.extractor._extract_info(url)

        assert "ubuntu-24.04-live-server-amd64.iso.torrent" in info.title
        assert info.content_type == ContentType.TORRENT
        assert info.metadata["is_torrent_file"] is True

    def test_extractor_registered_in_registry(self):
        extractor = ExtractorRegistry.get_extractor("magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678")
        assert extractor is not None
        assert extractor.name == "torrent"
