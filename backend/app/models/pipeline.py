"""
HireFlow AI — Pipeline Run Pydantic Models.

Schemas for pipeline status, progress tracking, and WebSocket events.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PipelineRunResponse(BaseModel):
    """
    Current pipeline run status for a job.

    Input: pipeline_runs MongoDB document
    Output: JSON-serializable pipeline status
    """

    job_id: str
    status: str = "idle"
    plan: Optional[str] = None
    progress_pct: float = 0.0
    current_step: Optional[str] = None
    processed_count: int = 0
    total_count: int = 0
    errors: List[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PipelineEvent(BaseModel):
    """
    Real-time event sent over WebSocket to the dashboard.

    Input: orchestrator step updates
    Output: JSON message for frontend WebSocket handler
    """

    event_type: str
    job_id: str
    candidate_id: Optional[str] = None
    stage: Optional[str] = None
    message: str = ""
    progress_pct: float = 0.0
    timestamp: datetime
    data: Dict[str, Any] = Field(default_factory=dict)


class PipelineRunRequest(BaseModel):
    """
    Optional body for POST /pipeline/run.

    Input: optional flags for pipeline execution
    Output: PipelineRunRequest schema
    """

    force_restart: bool = False
