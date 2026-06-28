"""
HireFlow AI — Audit Log Routes.

GET /audit — query audit logs with optional filters
GET /audit/job/{job_id} — all audit entries for one job
"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.models.audit_log import AuditLogEntry, AuditLogResponse
from app.services.mongodb import get_db

router = APIRouter(prefix="/audit", tags=["Audit"])


def _to_audit_entry(doc: dict) -> AuditLogEntry:
    """
    Convert MongoDB audit log document to AuditLogEntry model.

    Input: audit log document dict
    Output: AuditLogEntry pydantic model
    """
    return AuditLogEntry(
        id=doc["id"],
        timestamp=doc["timestamp"],
        job_id=doc["job_id"],
        candidate_id=doc.get("candidate_id"),
        action=doc["action"],
        tool_used=doc["tool_used"],
        input_summary=doc.get("input_summary", ""),
        output_summary=doc.get("output_summary", ""),
        qwen_reasoning=doc.get("qwen_reasoning"),
        model_used=doc.get("model_used"),
        tokens_used=doc.get("tokens_used", 0),
        duration_ms=doc.get("duration_ms", 0),
        status=doc.get("status", "success"),
        metadata=doc.get("metadata", {}),
    )


@router.get("", response_model=AuditLogResponse)
async def query_audit_logs(
    job_id: Optional[str] = Query(None),
    candidate_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
) -> AuditLogResponse:
    """
    Query audit logs with optional filters.

    Input:
        job_id: optional filter by job
        candidate_id: optional filter by candidate
        action: optional filter by action name
        limit: max results (default 100)
    Output:
        AuditLogResponse with matching logs
    """
    db = get_db()
    query: dict = {}
    if job_id:
        query["job_id"] = job_id
    if candidate_id:
        query["candidate_id"] = candidate_id
    if action:
        query["action"] = action

    docs = await db.find_many("audit_logs", query, limit=limit)
    logs: List[AuditLogEntry] = [_to_audit_entry(d) for d in docs]
    return AuditLogResponse(logs=logs, count=len(logs))


@router.get("/job/{job_id}", response_model=AuditLogResponse)
async def get_job_audit_logs(job_id: str, limit: int = Query(200, le=500)) -> AuditLogResponse:
    """
    Get all audit log entries for one job.

    Input: job_id path parameter and optional limit
    Output: AuditLogResponse for that job
    """
    db = get_db()
    docs = await db.find_many("audit_logs", {"job_id": job_id}, limit=limit)
    logs = [_to_audit_entry(d) for d in docs]
    return AuditLogResponse(logs=logs, count=len(logs))
