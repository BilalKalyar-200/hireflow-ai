"""
HireFlow AI — Pipeline Routes.

POST /pipeline/run/{job_id} — trigger autonomous pipeline
GET /pipeline/status/{job_id} — get pipeline progress
WebSocket /ws/pipeline — real-time updates
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.agent.orchestrator import run_pipeline
from app.models.pipeline import PipelineRunRequest, PipelineRunResponse
from app.services.mongodb import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


async def _background_run_pipeline(job_id: str, force_restart: bool) -> None:
    """
    Run pipeline in background task (non-blocking for HTTP response).

    Input: job_id and force_restart flag
    Output: none (pipeline runs asynchronously)
    """
    try:
        await run_pipeline(job_id, force_restart=force_restart)
    except Exception as exc:
        logger.exception("Background pipeline failed for job %s: %s", job_id, exc)


@router.post("/run/{job_id}")
async def trigger_pipeline(
    job_id: str,
    background_tasks: BackgroundTasks,
    body: PipelineRunRequest | None = None,
) -> dict:
    """
    Start the autonomous hiring pipeline for a job in the background.

    Input:
        job_id: path parameter
        body: optional PipelineRunRequest with force_restart flag
    Output:
        dict confirming pipeline started
    """
    db = get_db()
    job = await db.find_one("jobs", {"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    candidates = await db.find_many("candidates", {"job_id": job_id}, limit=1)
    if not candidates:
        raise HTTPException(status_code=400, detail="Upload resumes before running pipeline")

    force = body.force_restart if body else False
    background_tasks.add_task(_background_run_pipeline, job_id, force)

    return {
        "status": "started",
        "job_id": job_id,
        "message": "Autonomous pipeline started. Connect to WebSocket /ws/pipeline for live updates.",
    }


@router.get("/status/{job_id}", response_model=PipelineRunResponse)
async def get_pipeline_status(job_id: str) -> PipelineRunResponse:
    """
    Get current pipeline run status for a job.

    Input: job_id path parameter
    Output: PipelineRunResponse with progress and plan
    """
    db = get_db()
    run = await db.find_one("pipeline_runs", {"job_id": job_id})
    if not run:
        return PipelineRunResponse(job_id=job_id, status="idle")

    return PipelineRunResponse(
        job_id=job_id,
        status=run.get("status", "idle"),
        plan=run.get("plan"),
        progress_pct=run.get("progress_pct", 0.0),
        current_step=run.get("current_step"),
        processed_count=run.get("processed_count", 0),
        total_count=run.get("total_count", 0),
        errors=run.get("errors", []),
        started_at=run.get("started_at"),
        completed_at=run.get("completed_at"),
    )
