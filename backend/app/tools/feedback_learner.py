"""
HireFlow AI — Feedback Learner Tool.

Adjusts scoring weights in MongoDB based on recruiter overrides.
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from app.services.mongodb import get_db

logger = logging.getLogger(__name__)

LEARNING_RATE = 0.05


async def record_feedback(
    job_id: str,
    candidate_id: str,
    expected_score: float,
    actual_score: float,
    action: str,
    notes: Optional[str] = None,
) -> dict[str, float]:
    """
    Store recruiter feedback and nudge scoring weights toward expected scores.

    Input:
        job_id: job id
        candidate_id: candidate id
        expected_score: score recruiter thinks is correct (override)
        actual_score: score the agent gave
        action: approve or reject
        notes: optional recruiter notes
    Output:
        updated scoring weights dict
    """
    db = get_db()
    await db.insert_one(
        "feedback",
        {
            "id": str(uuid4()),
            "job_id": job_id,
            "candidate_id": candidate_id,
            "expected_score": expected_score,
            "actual_score": actual_score,
            "action": action,
            "notes": notes,
            "created_at": datetime.utcnow(),
        },
    )

    weights = await db.get_scoring_weights()
    delta = expected_score - actual_score

    if action == "approve" and delta > 0:
        weights["qwen_qualitative"] = min(0.6, weights["qwen_qualitative"] + LEARNING_RATE)
    elif action == "reject" and delta < 0:
        weights["semantic_similarity"] = min(0.5, weights["semantic_similarity"] + LEARNING_RATE)

    weight_doc = {
        "id": "default",
        **weights,
        "updated_at": datetime.utcnow(),
    }
    existing = await db.find_one("scoring_weights", {"id": "default"})
    if existing:
        await db.update_one("scoring_weights", "default", weight_doc)
    else:
        await db.insert_one("scoring_weights", weight_doc)

    logger.info("Feedback recorded for %s — weights updated", candidate_id)
    return weights
