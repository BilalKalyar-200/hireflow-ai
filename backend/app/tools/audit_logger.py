"""
HireFlow AI — Audit Logger Tool.

Writes every agent decision to MongoDB with reasoning and token metadata.
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from app.services.mongodb import get_db

logger = logging.getLogger(__name__)


async def log_action(
    job_id: str,
    action: str,
    tool_used: str,
    input_summary: str = "",
    output_summary: str = "",
    candidate_id: Optional[str] = None,
    qwen_reasoning: Optional[str] = None,
    model_used: Optional[str] = None,
    tokens_used: int = 0,
    duration_ms: int = 0,
    status: str = "success",
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Record one agent action in the audit_logs collection.

    Input:
        job_id: related job id
        action: action name e.g. score_candidate
        tool_used: tool module name
        input_summary: short description of input
        output_summary: short description of output
        candidate_id: optional candidate id
        qwen_reasoning: optional LLM reasoning text
        model_used: Qwen model name
        tokens_used: tokens consumed for this action
        duration_ms: how long the action took
        status: success, failed, or skipped
        metadata: optional extra dict
    Output:
        audit log document id string
    """
    db = get_db()
    log_id = str(uuid4())
    document = {
        "id": log_id,
        "timestamp": datetime.utcnow(),
        "job_id": job_id,
        "candidate_id": candidate_id,
        "action": action,
        "tool_used": tool_used,
        "input_summary": input_summary[:500],
        "output_summary": output_summary[:500],
        "qwen_reasoning": (qwen_reasoning or "")[:2000],
        "model_used": model_used,
        "tokens_used": tokens_used,
        "duration_ms": duration_ms,
        "status": status,
        "metadata": metadata or {},
    }
    await db.insert_one("audit_logs", document)
    logger.info("[AUDIT] %s | %s | %s", action, tool_used, output_summary[:80])
    return log_id


class AuditTimer:
    """
    Context helper to measure duration_ms for audit logs.

    Input: none at init
    Output: elapsed milliseconds via elapsed_ms()
    """

    def __init__(self) -> None:
        self._start = time.perf_counter()

    def elapsed_ms(self) -> int:
        """
        Return milliseconds since timer was created.

        Input: none
        Output: integer milliseconds
        """
        return int((time.perf_counter() - self._start) * 1000)
