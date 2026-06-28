"""
HireFlow AI — Report Generator Tool.

Uses Qwen to generate a markdown evaluation report for a candidate.
"""

import logging

from app.models.candidate import ScoreBreakdown, StructuredResume
from app.models.job import ParsedRequirements
from app.services.qwen_client import get_qwen_client

logger = logging.getLogger(__name__)

REPORT_PROMPT = """Write a professional candidate evaluation report in Markdown.

Job Title: {title}
Candidate: {name}
Final Score: {score}/100
Score Breakdown: Qwen={qwen}, Semantic={semantic}, Skills={skills}%, Experience={exp}%

Reasoning: {reasoning}

Include sections: Summary, Strengths, Gaps, Recommendation (Shortlist/Reject/Review).
Keep it concise (under 300 words).
"""


async def generate_evaluation_report(
    structured: StructuredResume,
    parsed_jd: ParsedRequirements,
    breakdown: ScoreBreakdown,
    reasoning: str,
) -> tuple[str, int]:
    """
    Generate a markdown evaluation report for one candidate.

    Input:
        structured: candidate structured resume
        parsed_jd: parsed job requirements
        breakdown: ScoreBreakdown with component scores
        reasoning: Qwen reasoning from scorer
    Output:
        tuple of (markdown report string, tokens_used)
    """
    client = get_qwen_client()
    prompt = REPORT_PROMPT.format(
        title=parsed_jd.title,
        name=structured.name,
        score=breakdown.final_score,
        qwen=breakdown.qwen_qualitative,
        semantic=breakdown.semantic_similarity,
        skills=breakdown.skills_match_pct,
        exp=breakdown.experience_fit,
        reasoning=reasoning,
    )
    response, tokens = await client.chat_completion(
        prompt=prompt,
        system="You write clear HR evaluation reports in Markdown.",
        max_tokens=1500,
    )
    return response.strip(), tokens
