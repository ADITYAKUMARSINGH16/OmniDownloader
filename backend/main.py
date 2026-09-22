from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from core.config import settings
from core.limiter import limiter
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

    # Start background scheduler for delayed/scheduled downloads
    import asyncio
    scheduler_task = asyncio.create_task(queue_manager.start_scheduler())


    yield
    scheduler_task.cancel()
    await close_db()




openapi_tags = [
    {
        "name": "Analysis",
        "description": "Analyze multimedia URLs, query metadata, format streams, and audio/video tracks.",
    },
    {
        "name": "Downloads",
        "description": "Create, monitor, pause, resume, retry, cancel, and schedule downloads.",
    },
    {
        "name": "Queue",
        "description": "Inspect and control download execution queue, status, and active job counters.",
    },
    {
        "name": "History",
        "description": "Historical download records with full search, sorting, CSV/JSON export, and import.",
    },
    {
        "name": "Analytics",
        "description": "Aggregated bandwidth, platform distribution, success metrics, and daily trends.",
    },
    {
        "name": "Settings",
        "description": "Application configuration, storage directories, speed limits, and authentication cookies.",
    },
    {
        "name": "Extractors",
        "description": "List all active extractor engines and supported content providers.",
    },
    {
        "name": "System",
        "description": "Operating system desktop integration, file reveal, and directory exploration.",
    },
]

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Universal media download engine supporting 1000+ sources with real-time websocket progress, scheduling, format transcoding, and analytics.",
    openapi_tags=openapi_tags,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^(http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?|chrome-extension://.*|moz-extension://.*)$",
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