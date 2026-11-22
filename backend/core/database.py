from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text
from contextlib import asynccontextmanager
import os
import asyncio
import logging
import sqlite3

from core.config import settings
from models.database import Base

logger = logging.getLogger(__name__)

is_sqlite = "sqlite" in settings.database_url

if is_sqlite:
    try:
        db_path = settings.database_url.split(":///")[-1]
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    except Exception:
        pass

connect_args = {}
if is_sqlite:
    connect_args = {"check_same_thread": False, "timeout": 30.0}

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
    connect_args=connect_args,
)

if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.close()
        except Exception as e:
            logger.debug(f"SQLite PRAGMA configuration notice: {e}")

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        if is_sqlite:
            try:
                await conn.execute(text("PRAGMA journal_mode=WAL"))
                await conn.execute(text("PRAGMA busy_timeout=30000"))
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)
        if is_sqlite:
            try:
                res = await conn.execute(text("PRAGMA table_info(downloads)"))
                columns = [row[1] for row in res.fetchall()]
                if "scheduled_at" not in columns:
                    await conn.execute(text("ALTER TABLE downloads ADD COLUMN scheduled_at DATETIME"))
            except Exception:
                pass


async def close_db():
    await engine.dispose()


@asynccontextmanager
async def get_scoped_session(max_retries: int = 3, retry_delay: float = 0.2):
    """
    Context manager providing an isolated AsyncSession with automatic
    retry on SQLite 'database is locked' OperationalErrors.
    """
    session = AsyncSessionLocal()
    try:
        yield session
        # Attempt commit with retry on database lock
        for attempt in range(max_retries):
            try:
                await session.commit()
                break
            except Exception as e:
                is_locked = "locked" in str(e).lower() or "busy" in str(e).lower()
                if is_locked and attempt < max_retries - 1:
                    await session.rollback()
                    await asyncio.sleep(retry_delay * (2 ** attempt))
                else:
                    await session.rollback()
                    raise
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_db():
    """FastAPI route dependency yielding an active database session."""
    async with get_scoped_session() as session:
        yield session


async def get_db_session() -> AsyncSession:
    """Helper returning a fresh standalone session (caller responsible for closing)."""
    return AsyncSessionLocal()