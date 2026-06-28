"""
HireFlow AI — FastAPI Application Entry Point.

Creates the FastAPI app, registers routes, CORS, logging,
and WebSocket handlers. Run with:

    cd backend
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import audit, candidates, health, jobs, pipeline
from app.config import get_settings
from app.services.mongodb import get_db
from app.services.oss_storage import get_storage
from app.services.qdrant_service import get_qdrant
from app.services.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Startup and shutdown lifecycle for database and service connections.

    Input: FastAPI app instance
    Output: yields control during app runtime, then cleans up on shutdown
    """
    settings = get_settings()
    logger.info("Starting %s [%s]", settings.app_name, settings.app_env)
    logger.info("Qwen model: %s | MOCK_QWEN=%s", settings.qwen_model, settings.mock_qwen)

    db = get_db()
    await db.connect()
    await get_qdrant().connect()
    await get_storage().connect()

    yield

    await db.disconnect()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application.

    Input: none
    Output: configured FastAPI app instance
    """
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        description="Autonomous HR recruitment agent powered by Qwen AI",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(jobs.router)
    application.include_router(candidates.router)
    application.include_router(pipeline.router)
    application.include_router(audit.router)

    @application.websocket("/ws/pipeline")
    async def pipeline_websocket(websocket: WebSocket) -> None:
        """
        WebSocket endpoint for real-time pipeline events at /ws/pipeline.

        Input: WebSocket connection from React dashboard
        Output: streams PipelineEvent JSON until client disconnects
        """
        await ws_manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)

    return application


app = create_app()
