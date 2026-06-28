"""
HireFlow AI — Job Description Parser Tool.

Uses Qwen to extract structured requirements from raw job description text.
"""

import json
import logging
from typing import Any, Dict

from app.models.job import ParsedRequirements
from app.services.qwen_client import get_qwen_client
from app.utils.exceptions import ToolError

logger = logging.getLogger(__name__)

JD_PARSE_PROMPT = """Parse this job description into structured JSON with exactly these fields:
- title: job title string
- required_skills: list of required skill strings
- preferred_skills: list of nice-to-have skills
- min_experience_years: number (float)
- education: education requirement string
- responsibilities: list of responsibility strings
- location: location string
- employment_type: e.g. Full-time, Contract

Return ONLY valid JSON, no markdown fences.

Job Description:
{jd_text}
"""


async def parse_job_description(jd_text: str) -> tuple[ParsedRequirements, int]:
    """
    Parse raw JD text into structured requirements using Qwen.

    Input:
        jd_text: full job description as plain text
    Output:
        tuple of (ParsedRequirements object, tokens_used)
    """
    client = get_qwen_client()
    prompt = JD_PARSE_PROMPT.format(jd_text=jd_text[:8000])
    response, tokens = await client.chat_completion(
        prompt=prompt,
        system="You extract structured job requirements. Always return valid JSON only.",
    )

    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        data = json.loads(cleaned)
        parsed = ParsedRequirements(**data)
        return parsed, tokens
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("JD parse JSON error: %s | response: %s", exc, response[:200])
        raise ToolError("jd_parser", f"Failed to parse Qwen JD response: {exc}") from exc
