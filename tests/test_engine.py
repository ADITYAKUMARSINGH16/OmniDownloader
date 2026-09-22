import pytest
from download.engine import DownloadEngine, ProgressCallback
from models.schemas import FormatModel, ContentType
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio


class TestProgressCallback:
    def test_initialization(self):
        callback = ProgressCallback("test_id")
        assert callback.download_id == "test_id"
        assert callback.callback is None
    
    def test_with_callback(self):
        async def test_callback(download_id, progress, downloaded, total, speed, eta):
            pass
        
        callback = ProgressCallback("test_id", test_callback)
        assert callback.callback == test_callback


class TestDownloadEngine:
    def setup_method(self):
        self.engine = DownloadEngine()
    
    def test_initialization(self):
        assert self.engine.active_downloads == {}
        assert self.engine.progress_callbacks == {}
    
    @pytest.mark.asyncio
    async def test_start_download_creates_task(self):
        with patch('download.engine.DownloadEngine._download_task', new_callable=AsyncMock) as mock_task:
            mock_task.return_value = None
            
            format_model = FormatModel(
                format_id="test",
                quality="720p",
                extension="mp4",
                filesize=1000000,
            )
            
            download_id = await self.engine.start_download(
                "test_download",
                "https://example.com/video.mp4",
                format_model,
            )
            
            assert download_id == "test_download"
            assert download_id in self.engine.active_downloads
            assert download_id in self.engine.progress_callbacks
    
    @pytest.mark.asyncio
    async def test_pause_download(self):
        mock_task = AsyncMock()
        self.engine.active_downloads["test_id"] = mock_task
        
        await self.engine.pause_download("test_id")
        
        mock_task.cancel.assert_called_once()
        assert "test_id" not in self.engine.active_downloads
    
    @pytest.mark.asyncio
    async def test_cancel_download(self):
        mock_task = AsyncMock()
        self.engine.active_downloads["test_id"] = mock_task
        
        with patch('download.engine.AsyncSessionLocal') as mock_session:
            mock_db = AsyncMock()
            mock_session.return_value = mock_db
            
            await self.engine.cancel_download("test_id")
            
            mock_task.cancel.assert_called_once()
            assert "test_id" not in self.engine.active_downloads