import pytest
from queue.manager import DownloadQueue, QueueItem
from models.database import Download, DownloadStatus as DBDownloadStatus
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio


class TestDownloadQueue:
    def setup_method(self):
        self.queue = DownloadQueue()
        self.queue.max_concurrent = 2
    
    def test_add_to_queue(self):
        self.queue.queue.clear()
        asyncio.run(self.queue.add("download_1", priority=0))
        assert len(self.queue.queue) == 1
        assert self.queue.queue[0].download_id == "download_1"
    
    def test_priority_ordering(self):
        self.queue.queue.clear()
        asyncio.run(self.queue.add("low_priority", priority=0))
        asyncio.run(self.queue.add("high_priority", priority=10))
        asyncio.run(self.queue.add("medium_priority", priority=5))
        
        assert self.queue.queue[0].download_id == "high_priority"
        assert self.queue.queue[1].download_id == "medium_priority"
        assert self.queue.queue[2].download_id == "low_priority"
    
    def test_remove_from_queue(self):
        self.queue.queue.clear()
        asyncio.run(self.queue.add("download_1"))
        asyncio.run(self.queue.add("download_2"))
        
        result = asyncio.run(self.queue.remove("download_1"))
        assert result is True
        assert len(self.queue.queue) == 1
        assert self.queue.queue[0].download_id == "download_2"
    
    def test_remove_nonexistent(self):
        self.queue.queue.clear()
        asyncio.run(self.queue.add("download_1"))
        
        result = asyncio.run(self.queue.remove("nonexistent"))
        assert result is False
        assert len(self.queue.queue) == 1


class TestQueueItem:
    def test_creation(self):
        item = QueueItem(download_id="test_1", priority=5)
        assert item.download_id == "test_1"
        assert item.priority == 5
        assert isinstance(item.created_at, datetime)
    
    def test_default_priority(self):
        item = QueueItem(download_id="test_1")
        assert item.priority == 0