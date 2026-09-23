import os
import shutil
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from download.segmented import SegmentedDownloader, DEFAULT_SEGMENTS


class TestSegmentedDownloader:
    def setup_method(self):
        self.downloader = SegmentedDownloader(connections=4)

    def test_initialization(self):
        assert self.downloader.connections == 4
        dl_clamp = SegmentedDownloader(connections=32)
        assert dl_clamp.connections == 16
        dl_min = SegmentedDownloader(connections=0)
        assert dl_min.connections == 1

    @pytest.mark.asyncio
    async def test_probe_range_support(self):
        with patch("httpx.AsyncClient.head") as mock_head:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.headers = {
                "content-length": "104857600",
                "accept-ranges": "bytes",
                "content-disposition": 'attachment; filename="archive.zip"',
            }
            mock_head.return_value = mock_resp

            supports_range, total_size, headers, filename = await self.downloader.probe(
                "https://example.com/archive.zip"
            )
            assert supports_range is True
            assert total_size == 104857600
            assert filename == "archive.zip"

    @pytest.mark.asyncio
    async def test_probe_no_range_fallback(self):
        with patch("httpx.AsyncClient.head") as mock_head, patch("httpx.AsyncClient.get") as mock_get:
            head_resp = MagicMock()
            head_resp.status_code = 405  # Method not allowed
            mock_head.return_value = head_resp

            get_resp = MagicMock()
            get_resp.status_code = 200  # Doesn't support range, returns full content
            get_resp.headers = {"content-length": "1000", "content-disposition": ""}
            mock_get.return_value = get_resp

            supports_range, total_size, headers, filename = await self.downloader.probe(
                "https://example.com/file.bin"
            )
            assert supports_range is False
            assert total_size == 1000

    @pytest.mark.asyncio
    async def test_segmented_download_flow(self, tmp_path):
        target_dir = str(tmp_path / "downloads")
        os.makedirs(target_dir, exist_ok=True)

        # Mock probe
        with patch.object(
            self.downloader,
            "probe",
            new_callable=AsyncMock,
            return_value=(True, 8 * 1024 * 1024, {"content-type": "application/zip"}, "test_archive.zip"),
        ), patch.object(
            self.downloader,
            "_download_segmented",
            new_callable=AsyncMock,
            return_value=os.path.join(target_dir, "test_archive.zip"),
        ) as mock_seg:
            out_file = await self.downloader.download(
                download_id="test1234",
                url="https://example.com/test_archive.zip",
                target_dir=target_dir,
                connections=4,
            )
            assert out_file == os.path.join(target_dir, "test_archive.zip")
            mock_seg.assert_called_once()
