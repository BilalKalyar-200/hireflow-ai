"""
HireFlow AI — Audit Log Pydantic Models.

Schemas for audit log entries that record every agent decision.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AuditLogEntry(BaseModel):
    """
    One audit log record stored in MongoDB.

    Input: fields from audit_logger tool
    Output: AuditLogEntry document shape
    """

    id: str
    timestamp: datetime
    job_id: str
    candidate_id: Optional[str] = None
    action: str
    tool_used: str
    input_summary: str = ""
    output_summary: str = ""
    qwen_reasoning: Optional[str] = None
    model_used: Optional[str] = None
    tokens_used: int = 0
    duration_ms: int = 0
    status: str = "success"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AuditLogResponse(BaseModel):
    """
    Audit log list for GET /audit endpoints.

    Input: list of audit log documents
    Output: wrapper with logs array and count
    """

    logs: List[AuditLogEntry]
    count: int
