"""
HireFlow AI — Semantic Matcher Tool.

Stores embeddings in Qdrant and computes resume-to-JD similarity.
"""

import logging
from typing import Any, Dict

from app.services.qdrant_service import get_qdrant

logger = logging.getLogger(__name__)


async def store_and_match_resume(
    candidate_id: str,
    job_id: str,
    resume_vector: list[float],
    jd_vector: list[float],
) -> float:
    """
    Store resume embedding and compute similarity against JD vector.

    Input:
        candidate_id: unique candidate id
        job_id: job id for payload metadata
        resume_vector: embedding of resume text
        jd_vector: embedding of job description
    Output:
        semantic similarity score between 0.0 and 1.0
    """
    qdrant = get_qdrant()
    await qdrant.upsert_vector(
        "resumes",
        candidate_id,
        resume_vector,
        payload={"job_id": job_id, "candidate_id": candidate_id},
    )
    similarity = await qdrant.compute_pair_similarity(resume_vector, jd_vector)
    logger.info("Semantic similarity for %s: %.3f", candidate_id, similarity)
    return similarity


async def store_jd_embedding(job_id: str, jd_vector: list[float]) -> None:
    """
    Store job description embedding in Qdrant for future queries.

    Input:
        job_id: unique job id
        jd_vector: embedding of full JD text
    Output: none (vector stored)
    """
    qdrant = get_qdrant()
    await qdrant.upsert_vector(
        "jds",
        job_id,
        jd_vector,
        payload={"job_id": job_id},
    )
