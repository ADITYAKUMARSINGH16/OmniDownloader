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
        self._scheduler_task: Optional[asyncio.Task] = None
        self._lock: Optional[asyncio.Lock] = None

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def set_engine(self, engine: Any):
        self._engine = engine
        try:
            loop = asyncio.get_running_loop()
            if self._scheduler_task is None or self._scheduler_task.done():
                self._scheduler_task = loop.create_task(self.start_scheduler())
        except RuntimeError:
            pass

    def stop_scheduler(self):
        """Cleanly cancel the scheduler task if running."""
        if self._scheduler_task and not self._scheduler_task.done():
            self._scheduler_task.cancel()
            self._scheduler_task = None

    async def start_scheduler(self):
        """Polls every 5 seconds for scheduled downloads whose trigger time has arrived."""
        while True:
            try:
                await self.check_scheduled()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler check: {e}")
            try:
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                break

    async def check_scheduled(self):
        from core.database import get_scoped_session
        from models.database import Download, DownloadStatus
        from sqlalchemy import select

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        due_items = []
        try:
            async with get_scoped_session() as session:
                stmt = select(Download).where(
                    Download.status == DownloadStatus.SCHEDULED,
                    Download.scheduled_at <= now,
                )
                result = await session.execute(stmt)
                downloads = result.scalars().all()
                for d in downloads:
                    # Skip if already active or queued
                    if d.id in self.active_downloads or any(q.download_id == d.id for q in self.queue):
                        continue
                    due_items.append((d.id, d.priority or 0))
                    d.status = DownloadStatus.QUEUED
        except Exception as err:
            logger.debug(f"DB scheduler check error: {err}")
            return

        for download_id, priority in due_items:
            logger.info(f"Promoting scheduled download {download_id} to active queue")
            await self.add(download_id, priority=priority)

    async def add(self, download_id: str, priority: int = 0) -> None:
        if download_id in self.active_downloads:
            logger.info(f"Download {download_id} is already actively running, skipping duplicate queue add")
            return
        if self._engine and download_id in self._engine.active_downloads:
            task = self._engine.active_downloads[download_id]
            if not task.done():
                logger.info(f"Download {download_id} is already running in engine, skipping duplicate queue add")
                return

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
        lock = self._get_lock()
        async with lock:
            removed = False
            for idx, item in enumerate(self.queue):
                if item.download_id == download_id:
                    self.queue.pop(idx)
                    removed = True
                    break
            if download_id in self.active_downloads:
                self.active_downloads.discard(download_id)
                removed = True
            if removed:
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(self.process_queue())
                except RuntimeError:
                    pass
            return removed

    async def get_next(self) -> Optional[str]:
        if self.queue:
            item = self.queue.pop(0)
            return item.download_id
        return None

    async def process_queue(self) -> None:
        if not self._engine:
            return

        lock = self._get_lock()
        async with lock:
            while len(self.active_downloads) < self.max_concurrent and self.queue:
                item = self.queue.pop(0)
                if item.download_id in self.active_downloads:
                    continue
                if self._engine and item.download_id in self._engine.active_downloads:
                    task = self._engine.active_downloads[item.download_id]
                    if not task.done():
                        continue
                self.active_downloads.add(item.download_id)
                try:
                    await self._engine.resume_or_start(item.download_id)
                except Exception as e:
                    logger.error(f"Failed to start queued download {item.download_id}: {e}")
                    self.active_downloads.discard(item.download_id)
                    # Loop continues so subsequent tasks in queue are not stalled

    async def on_download_finished(self, download_id: str) -> None:
        try:
            self.active_downloads.discard(download_id)
        finally:
            try:
                await self.process_queue()
            except Exception as e:
                logger.error(f"Error in on_download_finished queue dispatch: {e}")


queue_manager = DownloadQueue()

