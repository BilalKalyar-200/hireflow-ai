"""
HireFlow AI — Agent Planner.

Calls Qwen to generate a visible execution plan before the pipeline runs.
"""

import logging

from app.services.qwen_client import get_qwen_client
from app.tools.audit_logger import AuditTimer, log_action

logger = logging.getLogger(__name__)

PLAN_PROMPT = """You are HireFlow AI, an autonomous HR recruitment agent.

A recruiter has submitted:
- Job description (first 2000 chars): {jd_preview}
- Number of resumes to process: {resume_count}

Write a clear 4-6 step execution plan in plain English for what you will do.
Include: parse JD, process each resume, score, shortlist/review/reject, email, schedule interviews.
Do not use JSON — return plain text bullet points.
"""


async def generate_pipeline_plan(
    job_id: str,
    jd_text: str,
    resume_count: int,
) -> tuple[str, int]:
    """
    Generate an agent execution plan using Qwen.

    Input:
        job_id: job id for audit logging
        jd_text: full job description text
        resume_count: number of resumes to process
    Output:
        tuple of (plan text string, tokens_used)
    """
    timer = AuditTimer()
    client = get_qwen_client()
    prompt = PLAN_PROMPT.format(
        jd_preview=jd_text[:2000],
        resume_count=resume_count,
    )
    plan, tokens = await client.chat_completion(
        prompt=prompt,
        system="You plan autonomous recruitment workflows clearly and concisely.",
        max_tokens=800,
    )

    await log_action(
        job_id=job_id,
        action="generate_plan",
        tool_used="planner",
        input_summary=f"JD length={len(jd_text)}, resumes={resume_count}",
        output_summary=plan[:200],
        qwen_reasoning=plan,
        model_used=client.model,
        tokens_used=tokens,
        duration_ms=timer.elapsed_ms(),
    )
    logger.info("Pipeline plan generated for job %s", job_id)
    return plan.strip(), tokens
