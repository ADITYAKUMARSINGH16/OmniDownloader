from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from contextlib import asynccontextmanager
import os

from core.config import settings
from models.database import Base


if "sqlite" in settings.database_url:
    try:
        db_path = settings.database_url.split(":///")[-1]
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    except Exception:
        pass

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in settings.database_url:
            from sqlalchemy import text
            try:
                res = await conn.execute(text("PRAGMA table_info(downloads)"))
                columns = [row[1] for row in res.fetchall()]
                if "scheduled_at" not in columns:
                    await conn.execute(text("ALTER TABLE downloads ADD COLUMN scheduled_at DATETIME"))
            except Exception:
                pass


async def close_db():
    await engine.dispose()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        return session