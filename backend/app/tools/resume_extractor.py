"""
HireFlow AI — Resume Extractor Tool.

Uses Qwen to convert unstructured resume text into structured candidate data.
"""

import json
import logging

from app.models.candidate import StructuredResume
from app.services.qwen_client import get_qwen_client
from app.utils.exceptions import ToolError

logger = logging.getLogger(__name__)

RESUME_EXTRACT_PROMPT = """Extract structured data from this resume text as JSON with these fields:
- name: full name string
- email: email address string (empty if not found)
- phone: phone string
- skills: list of skill strings
- experience_years: total years of professional experience as float
- education: list of education strings
- work_history: list of objects with company, role, years
- summary: brief professional summary string

Return ONLY valid JSON, no markdown fences.

Resume:
{resume_text}
"""


async def extract_resume_data(resume_text: str) -> tuple[StructuredResume, int]:
    """
    Structure raw resume text into candidate fields using Qwen.

    Input:
        resume_text: plain text extracted from PDF
    Output:
        tuple of (StructuredResume object, tokens_used)
    """
    client = get_qwen_client()
    prompt = RESUME_EXTRACT_PROMPT.format(resume_text=resume_text[:6000])
    response, tokens = await client.chat_completion(
        prompt=prompt,
        system="You extract resume data. Always return valid JSON only.",
    )

    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        data = json.loads(cleaned)
        structured = StructuredResume(**data)
        return structured, tokens
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Resume extract JSON error: %s", exc)
        raise ToolError("resume_extractor", f"Failed to parse resume JSON: {exc}") from exc
