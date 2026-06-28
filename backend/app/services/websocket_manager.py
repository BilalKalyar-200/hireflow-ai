"""
HireFlow AI — WebSocket Connection Manager.

Broadcasts real-time pipeline events to connected dashboard clients.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import WebSocket

from app.models.pipeline import PipelineEvent

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages active WebSocket connections and broadcasts pipeline events.

    Input: WebSocket connections from dashboard
    Output: broadcast messages to all connected clients
    """

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """
        Accept and register a new WebSocket connection.

        Input: FastAPI WebSocket instance
        Output: none (connection added to active list)
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket connected — %d active", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket from the active connection list.

        Input: WebSocket to remove
        Output: none
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("WebSocket disconnected — %d active", len(self.active_connections))

    async def broadcast_event(self, event: PipelineEvent) -> None:
        """
        Send a pipeline event to all connected WebSocket clients.

        Input: PipelineEvent pydantic model
        Output: none (message sent to all clients)
        """
        message = event.model_dump(mode="json")
        dead: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.warning("WebSocket send failed: %s", exc)
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def emit(
        self,
        event_type: str,
        job_id: str,
        message: str = "",
        candidate_id: str | None = None,
        stage: str | None = None,
        progress_pct: float = 0.0,
        data: Dict[str, Any] | None = None,
    ) -> None:
        """
        Build and broadcast a pipeline event with common fields.

        Input:
            event_type: e.g. stage_change, pipeline_complete, error
            job_id: job id
            message: human-readable message
            candidate_id: optional candidate id
            stage: optional new pipeline stage
            progress_pct: 0-100 progress
            data: optional extra dict
        Output: none
        """
        event = PipelineEvent(
            event_type=event_type,
            job_id=job_id,
            candidate_id=candidate_id,
            stage=stage,
            message=message,
            progress_pct=progress_pct,
            timestamp=datetime.utcnow(),
            data=data or {},
        )
        await self.broadcast_event(event)


ws_manager = WebSocketManager()
