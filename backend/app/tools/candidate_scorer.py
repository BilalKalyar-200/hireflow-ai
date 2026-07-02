"""
HireFlow AI — Candidate Scorer Tool.

Combines Qwen qualitative scoring with semantic similarity,
skills match, and experience fit into a final 0-100 score.
"""

import json
import logging
from typing import Any, Dict

from app.models.candidate import ScoreBreakdown, StructuredResume
from app.models.job import ParsedRequirements
from app.services.mongodb import get_db
from app.services.qwen_client import get_qwen_client
from app.utils.exceptions import ToolError

logger = logging.getLogger(__name__)


SCORE_PROMPT = """You are a very strict resume evaluator. Your job is to score this candidate ONLY against the exact job requirements provided below.

CRITICAL RULES:
- Do NOT add requirements that are not in the job description
- Do NOT penalize for missing technologies not mentioned in the JD
- Do NOT assume what a typical role of this type requires
- ONLY evaluate against what is explicitly stated in the job requirements below
- If a requirement is not in the JD, it cannot affect the score

Job Requirements (evaluate ONLY against these):
{jd_json}

Candidate Profile:
{candidate_json}

Semantic similarity score (0-1): {semantic_score}
Skills match percentage (required skills only): {skills_pct}%
Experience fit percentage: {exp_pct}%

Return JSON with exactly these fields:
- qwen_qualitative: your score 0-100 based ONLY on the above JD
- reasoning: 2-3 sentences explaining the score referencing only the JD requirements
Return ONLY valid JSON, no extra text.
"""


def _skills_match_pct(candidate_skills: list[str], required_skills: list[str]) -> float:
    """
    Calculate percentage of required skills found in candidate skills.

    Input: candidate skill list and required skill list
    Output: match percentage 0-100
    """
    if not required_skills:
        return 100.0
    candidate_lower = {s.lower().strip() for s in candidate_skills}
    matched = sum(1 for req in required_skills if req.lower().strip() in candidate_lower)
    return round((matched / len(required_skills)) * 100, 1)


def _experience_fit_pct(candidate_years: float, required_years: float) -> float:
    """
    Calculate how well candidate experience matches JD requirement.

    Input: candidate years and required minimum years
    Output: fit percentage 0-100
    """
    if required_years <= 0:
        return 100.0
    if candidate_years >= required_years:
        return min(100.0, 70.0 + (candidate_years - required_years) * 10)
    ratio = candidate_years / required_years
    return round(max(0.0, ratio * 70), 1)


async def score_candidate(
    structured: StructuredResume,
    parsed_jd: ParsedRequirements,
    semantic_similarity: float,
) -> tuple[ScoreBreakdown, str, int]:
    """
    Score a candidate and return breakdown plus Qwen reasoning.

    Input:
        structured: StructuredResume from resume extractor
        parsed_jd: ParsedRequirements from JD parser
        semantic_similarity: float 0-1 from semantic matcher
    Output:
        tuple of (ScoreBreakdown, reasoning text, tokens_used)
    """
    skills_pct = _skills_match_pct(structured.skills, parsed_jd.required_skills)
    exp_pct = _experience_fit_pct(structured.experience_years, parsed_jd.min_experience_years)

    client = get_qwen_client()
    prompt = SCORE_PROMPT.format(
        jd_json=json.dumps(parsed_jd.model_dump()),
        candidate_json=json.dumps(structured.model_dump()),
        semantic_score=semantic_similarity,
        skills_pct=skills_pct,
        exp_pct=exp_pct,
    )
    response, tokens = await client.chat_completion(
        prompt=prompt,
        system="You are an expert technical recruiter. Return valid JSON only.",
    )

    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        qwen_data = json.loads(cleaned)
        qwen_qualitative = float(qwen_data.get("qwen_qualitative", 70))
        reasoning = qwen_data.get("reasoning", "Score based on profile match.")
    except (json.JSONDecodeError, ValueError):
        qwen_qualitative = 70.0
        reasoning = response[:500]

    db = get_db()
    weights = await db.get_scoring_weights()

    final = (
        weights["qwen_qualitative"] * qwen_qualitative
        + weights["semantic_similarity"] * semantic_similarity * 100
        + weights["skills_match"] * skills_pct
        + weights["experience_fit"] * exp_pct
    )
    final = round(min(100.0, max(0.0, final)), 1)

    breakdown = ScoreBreakdown(
        qwen_qualitative=round(qwen_qualitative, 1),
        semantic_similarity=round(semantic_similarity * 100, 1),
        skills_match_pct=skills_pct,
        experience_fit=exp_pct,
        final_score=final,
    )
    return breakdown, reasoning, tokens
