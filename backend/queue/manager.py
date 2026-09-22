from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional, Set, Any
import asyncio
import logging

from core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class QueueItem:
    download_id: str
    priority: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class DownloadQueue:
    def __init__(self, max_concurrent: Optional[int] = None):
        self.queue: List[QueueItem] = []
        self.max_concurrent: int = max_concurrent or settings.max_concurrent_downloads
        self.active_downloads: Set[str] = set()
        self._engine: Optional[Any] = None

    def set_engine(self, engine: Any):
        self._engine = engine

    async def add(self, download_id: str, priority: int = 0) -> None:
        # Remove if already in queue
        self.queue = [item for item in self.queue if item.download_id != download_id]
        
        item = QueueItem(download_id=download_id, priority=priority)
        self.queue.append(item)
        # Higher priority first; earlier created_at first for ties
        self.queue.sort(key=lambda x: (-x.priority, x.created_at))
        
        # Trigger processing if engine is available
        if self._engine:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.process_queue())
            except RuntimeError:
                pass

    async def remove(self, download_id: str) -> bool:
        for idx, item in enumerate(self.queue):
            if item.download_id == download_id:
                self.queue.pop(idx)
                return True
        return False

    async def get_next(self) -> Optional[str]:
        if self.queue:
            item = self.queue.pop(0)
            return item.download_id
        return None

    async def process_queue(self) -> None:
        if not self._engine:
            return

        while len(self.active_downloads) < self.max_concurrent and self.queue:
            item = self.queue.pop(0)
            self.active_downloads.add(item.download_id)
            try:
                await self._engine.resume_or_start(item.download_id)
            except Exception as e:
                logger.error(f"Failed to start queued download {item.download_id}: {e}")
                self.active_downloads.discard(item.download_id)

    async def on_download_finished(self, download_id: str) -> None:
        self.active_downloads.discard(download_id)
        await self.process_queue()


queue_manager = DownloadQueue()
