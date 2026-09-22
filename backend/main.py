from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from core.database import init_db, close_db
from api.routes import router as api_router
from api.websocket import manager, websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    import json
    import logging
    from sqlalchemy import select
    from core.database import AsyncSessionLocal
    from models.database import Settings as DBSettings
    from queue.manager import queue_manager
    from core.security import sanitize_folder_path

    await init_db()

    # Restore persisted user settings from database
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(DBSettings))
            rows = result.scalars().all()
            for row in rows:
                try:
                    val = json.loads(row.value)
                    if row.key == "download_dir" and isinstance(val, str) and val.strip():
                        settings.download_dir = sanitize_folder_path(val)
                    elif row.key == "max_concurrent_downloads" and isinstance(val, int) and val > 0:
                        queue_manager.max_concurrent = val
                except Exception as inner_e:
                    logging.getLogger("main").warning(f"Error restoring setting {row.key}: {inner_e}")
    except Exception as e:
        logging.getLogger("main").warning(f"Could not load persisted settings on startup: {e}")

    # Ensure directories exist
    try:
        settings.download_dir = sanitize_folder_path(settings.download_dir)
        os.makedirs(settings.download_dir, exist_ok=True)
    except Exception as e:
        logging.getLogger("main").error(f"Error creating download_dir '{settings.download_dir}': {e}")

    try:
        os.makedirs(settings.temp_dir, exist_ok=True)
    except Exception as e:
        logging.getLogger("main").error(f"Error creating temp_dir: {e}")

    yield
    await close_db()



app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.websocket("/ws/{client_id}")
async def websocket_route(websocket: WebSocket, client_id: str):
    await websocket_endpoint(websocket, client_id)


@app.websocket("/api/ws/{client_id}")
async def websocket_api_route(websocket: WebSocket, client_id: str):
    await websocket_endpoint(websocket, client_id)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.app_version}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)