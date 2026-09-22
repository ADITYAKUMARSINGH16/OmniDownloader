import os
import sys
import queue
import pytest
import asyncio

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

backend_queue = os.path.join(backend_path, "queue")
if hasattr(queue, "__path__"):
    if backend_queue not in queue.__path__:
        queue.__path__.append(backend_queue)
else:
    queue.__path__ = [backend_queue]

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models.database import Base


@pytest.fixture(scope="function")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    session = async_session()
    
    yield session
    
    await session.close()
    await engine.dispose()


@pytest.fixture
def mock_yt_dlp():
    with pytest.MonkeyPatch().context() as mp:
        mock_ydl = MagicMock()
        mock_ydl.extract_info.return_value = {
            "id": "test123",
            "title": "Test Video",
            "thumbnail": "https://example.com/thumb.jpg",
            "duration": 120,
            "formats": [
                {
                    "format_id": "1080p",
                    "format_note": "1080p",
                    "ext": "mp4",
                    "filesize": 100000000,
                    "vcodec": "avc1.640028",
                    "acodec": "mp4a.40.2",
                    "fps": 30,
                    "width": 1920,
                    "height": 1080,
                    "tbr": 5000,
                    "protocol": "https",
                }
            ],
            "uploader": "Test Channel",
            "view_count": 100000,
        }
        mp.setattr("yt_dlp.YoutubeDL", lambda opts: mock_ydl)
        yield mock_ydl