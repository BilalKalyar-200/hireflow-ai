"""
HireFlow AI — Agent Orchestrator.

Runs the full autonomous hiring workflow: parse JD, process resumes,
score candidates, send emails, schedule interviews, and log every step.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.agent.planner import generate_pipeline_plan
from app.agent.state_machine import PipelineState, score_to_stage
from app.config import get_settings
from app.models.job import ParsedRequirements
from app.services.mongodb import get_db
from app.services.oss_storage import get_storage
from app.services.websocket_manager import ws_manager
from app.tools.audit_logger import AuditTimer, log_action
from app.tools.calendar_scheduler import schedule_interview
from app.tools.candidate_scorer import score_candidate
from app.tools.email_sender import send_interview_confirmation, send_shortlist_email
from app.tools.embedding_service import generate_single_embedding
from app.tools.jd_parser import parse_job_description
from app.tools.pdf_parser import extract_text_from_pdf
from app.tools.report_generator import generate_evaluation_report
from app.tools.resume_extractor import extract_resume_data
from app.tools.semantic_matcher import store_and_match_resume, store_jd_embedding

logger = logging.getLogger(__name__)


async def _update_pipeline_run(job_id: str, updates: Dict[str, Any]) -> None:
    """
    Update pipeline_runs document for a job.

    Input: job_id and dict of fields to update
    Output: none
    """
    db = get_db()
    existing = await db.find_one("pipeline_runs", {"job_id": job_id})
    if existing:
        await db.update_one("pipeline_runs", existing["id"], updates)
    else:
        await db.insert_one(
            "pipeline_runs",
            {"id": job_id, "job_id": job_id, **updates, "created_at": datetime.utcnow()},
        )


async def _set_candidate_stage(candidate_id: str, stage: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """
    Update candidate pipeline stage in MongoDB.

    Input: candidate_id, new stage string, optional extra fields
    Output: none
    """
    db = get_db()
    updates: Dict[str, Any] = {"stage": stage}
    if extra:
        updates.update(extra)
    await db.update_one("candidates", candidate_id, updates)


async def run_pipeline(job_id: str, force_restart: bool = False) -> Dict[str, Any]:
    """
    Run the full autonomous hiring pipeline for one job.

    Input:
        job_id: job to process
        force_restart: if True, re-process candidates not in completed states
    Output:
        dict with status, processed count, and any errors
    """
    settings = get_settings()
    db = get_db()
    storage = get_storage()
    errors: list[str] = []

    job = await db.find_one("jobs", {"id": job_id})
    if not job:
        return {"status": "failed", "message": "Job not found"}

    candidates = await db.find_many("candidates", {"job_id": job_id})
    if not candidates:
        return {"status": "failed", "message": "No candidates uploaded for this job"}

    await _update_pipeline_run(
        job_id,
        {
            "status": "running",
            "started_at": datetime.utcnow(),
            "total_count": len(candidates),
            "processed_count": 0,
            "progress_pct": 0.0,
            "errors": [],
        },
    )
    await ws_manager.emit("pipeline_started", job_id, "Pipeline started", progress_pct=0.0)

  # Generate visible agent plan
    plan, plan_tokens = await generate_pipeline_plan(job_id, job["jd_text"], len(candidates))
    await _update_pipeline_run(job_id, {"plan": plan, "current_step": "plan_generated"})
    await ws_manager.emit("plan_generated", job_id, plan[:300], progress_pct=5.0, data={"plan": plan})

  # Parse JD if needed
    parsed_jd: ParsedRequirements
    if job.get("parsed_requirements") and not force_restart:
        parsed_jd = ParsedRequirements(**job["parsed_requirements"])
    else:
        timer = AuditTimer()
        try:
            parsed_jd, tokens = await parse_job_description(job["jd_text"])
            await db.update_one(
                "jobs",
                job["id"],
                {
                    "parsed_requirements": parsed_jd.model_dump(),
                    "title": parsed_jd.title or job.get("title", ""),
                    "status": "jd_parsed",
                },
            )
            await log_action(
                job_id=job_id,
                action="parse_jd",
                tool_used="jd_parser",
                input_summary=job["jd_text"][:200],
                output_summary=f"title={parsed_jd.title}",
                tokens_used=tokens,
                duration_ms=timer.elapsed_ms(),
            )
        except Exception as exc:
            errors.append(f"JD parse failed: {exc}")
            parsed_jd = ParsedRequirements(title=job.get("title", "Open Role"))

    # Embed and store JD
    jd_vector, jd_embed_tokens = await generate_single_embedding(job["jd_text"])
    await store_jd_embedding(job_id, jd_vector)
    await log_action(
        job_id=job_id,
        action="embed_jd",
        tool_used="embedding_service",
        output_summary=f"vector_dim={len(jd_vector)}",
        tokens_used=jd_embed_tokens,
    )

    semaphore = asyncio.Semaphore(settings.max_concurrent_resumes)
    processed = 0
    total = len(candidates)

    async def process_one(candidate: Dict[str, Any]) -> None:
        nonlocal processed
        cid = candidate["id"]
        stage = candidate.get("stage", PipelineState.PENDING.value)

        if stage in (PipelineState.COMPLETED.value, PipelineState.INTERVIEW_SCHEDULED.value):
            processed += 1
            return
        if stage == PipelineState.NEEDS_REVIEW.value and not force_restart:
            processed += 1
            return

        async with semaphore:
            try:
                await _process_candidate(
                    job_id=job_id,
                    candidate=candidate,
                    parsed_jd=parsed_jd,
                    jd_vector=jd_vector,
                    settings=settings,
                    storage=storage,
                )
            except Exception as exc:
                logger.error("Candidate %s failed: %s", cid, exc)
                errors.append(f"Candidate {cid}: {exc}")
                await _set_candidate_stage(cid, PipelineState.ERROR.value, {"error_message": str(exc)})
                await ws_manager.emit("error", job_id, str(exc), candidate_id=cid)

        processed += 1
        progress = round((processed / total) * 100, 1)
        await _update_pipeline_run(
            job_id,
            {"processed_count": processed, "progress_pct": progress, "current_step": "processing_resumes"},
        )
        await ws_manager.emit(
            "progress",
            job_id,
            f"Processed {processed}/{total}",
            progress_pct=progress,
        )

    await asyncio.gather(*[process_one(c) for c in candidates])

    final_status = "completed" if not errors else "completed_with_errors"
    await _update_pipeline_run(
        job_id,
        {
            "status": final_status,
            "completed_at": datetime.utcnow(),
            "progress_pct": 100.0,
            "errors": errors,
            "current_step": "done",
        },
    )
    await ws_manager.emit("pipeline_complete", job_id, final_status, progress_pct=100.0, data={"errors": errors})

    return {
        "status": final_status,
        "job_id": job_id,
        "processed": processed,
        "total": total,
        "errors": errors,
        "plan_tokens": plan_tokens,
    }


async def _process_candidate(
    job_id: str,
    candidate: Dict[str, Any],
    parsed_jd: ParsedRequirements,
    jd_vector: list[float],
    settings: Any,
    storage: Any,
) -> None:
    """
    Process one candidate through parse, score, and action branches.

    Input: job context, candidate doc, parsed JD, JD vector, settings, storage
    Output: none (candidate updated in MongoDB)
    """
    cid = candidate["id"]
    await _set_candidate_stage(cid, PipelineState.PARSING.value)
    await ws_manager.emit("stage_change", job_id, "Parsing resume", candidate_id=cid, stage="parsing")

    # Download PDF
    oss_path = candidate.get("oss_path")
    if not oss_path:
        raise ValueError("No resume file path on candidate")
    pdf_bytes = await storage.download_file(oss_path)

    # Parse PDF
    timer = AuditTimer()
    pdf_result = extract_text_from_pdf(pdf_bytes)
    resume_text = pdf_result["text"]
    await log_action(
        job_id=job_id,
        candidate_id=cid,
        action="parse_pdf",
        tool_used="pdf_parser",
        output_summary=f"pages={pdf_result['page_count']}, chars={len(resume_text)}",
        duration_ms=timer.elapsed_ms(),
    )

    # Extract structured data
    timer = AuditTimer()
    structured, extract_tokens = await extract_resume_data(resume_text)
    await _set_candidate_stage(
        cid,
        PipelineState.PARSED.value,
        {
            "resume_text": resume_text[:10000],
            "structured_data": structured.model_dump(),
            "name": structured.name,
            "email": structured.email,
        },
    )
    await log_action(
        job_id=job_id,
        candidate_id=cid,
        action="extract_resume",
        tool_used="resume_extractor",
        output_summary=f"name={structured.name}, email={structured.email}",
        tokens_used=extract_tokens,
        duration_ms=timer.elapsed_ms(),
    )

    # Missing email — flag for review
    if not structured.email or "@" not in structured.email:
        await _set_candidate_stage(
            cid,
            PipelineState.NEEDS_REVIEW.value,
            {
                "flagged_for_review": True,
                "review_reason": "Missing email address on resume",
            },
        )
        await ws_manager.emit(
            "needs_review",
            job_id,
            "Missing email — human review required",
            candidate_id=cid,
            stage=PipelineState.NEEDS_REVIEW.value,
        )
        return

    # Embeddings and semantic match
    resume_vector, embed_tokens = await generate_single_embedding(resume_text)
    semantic_score = await store_and_match_resume(cid, job_id, resume_vector, jd_vector)

    # Score candidate
    timer = AuditTimer()
    breakdown, reasoning, score_tokens = await score_candidate(structured, parsed_jd, semantic_score)
    next_stage = score_to_stage(
        breakdown.final_score,
        settings.score_auto_shortlist,
        settings.score_borderline_min,
    )

    await _set_candidate_stage(
        cid,
        PipelineState.SCORED.value,
        {
            "score": breakdown.final_score,
            "score_breakdown": breakdown.model_dump(),
            "reasoning": reasoning,
        },
    )
    await log_action(
        job_id=job_id,
        candidate_id=cid,
        action="score_candidate",
        tool_used="candidate_scorer",
        output_summary=f"score={breakdown.final_score}",
        qwen_reasoning=reasoning,
        tokens_used=score_tokens + embed_tokens,
        duration_ms=timer.elapsed_ms(),
    )
    await ws_manager.emit(
        "scored",
        job_id,
        f"Score: {breakdown.final_score}",
        candidate_id=cid,
        stage="scored",
        data={"score": breakdown.final_score},
    )

    if next_stage == PipelineState.REJECTED:
        await _set_candidate_stage(cid, PipelineState.REJECTED.value)
        await log_action(
            job_id=job_id,
            candidate_id=cid,
            action="auto_reject",
            tool_used="orchestrator",
            output_summary=f"score={breakdown.final_score} below threshold",
        )
        return

    if next_stage == PipelineState.NEEDS_REVIEW:
        await _set_candidate_stage(
            cid,
            PipelineState.NEEDS_REVIEW.value,
            {
                "flagged_for_review": True,
                "review_reason": f"Borderline score: {breakdown.final_score}",
            },
        )
        await ws_manager.emit(
            "needs_review",
            job_id,
            f"Borderline score {breakdown.final_score} — awaiting recruiter",
            candidate_id=cid,
            stage=PipelineState.NEEDS_REVIEW.value,
        )
        return

    # Auto-shortlist path
    await _run_shortlist_actions(job_id, cid, structured, parsed_jd, breakdown, reasoning)


async def _run_shortlist_actions(
    job_id: str,
    cid: str,
    structured: Any,
    parsed_jd: ParsedRequirements,
    breakdown: Any,
    reasoning: str,
) -> None:
    """
    Run shortlist actions: report, email, calendar for one candidate.

    Input: job/candidate ids, structured resume, JD, scores
    Output: none (candidate updated to interview_scheduled or completed)
    """
    await _set_candidate_stage(cid, PipelineState.SHORTLISTED.value)
    await ws_manager.emit("shortlisted", job_id, "Candidate shortlisted", candidate_id=cid, stage="shortlisted")

    report, report_tokens = await generate_evaluation_report(structured, parsed_jd, breakdown, reasoning)
    await get_db().update_one("candidates", cid, {"report": report})

    email_result = await send_shortlist_email(
        structured.email,
        structured.name,
        parsed_jd.title,
        breakdown.final_score,
    )
    await _set_candidate_stage(cid, PipelineState.EMAIL_SENT.value)
    await log_action(
        job_id=job_id,
        candidate_id=cid,
        action="send_shortlist_email",
        tool_used="email_sender",
        output_summary=email_result.get("status", ""),
        tokens_used=report_tokens,
    )

    cal_result = await schedule_interview(
        structured.email,
        structured.name,
        parsed_jd.title,
    )
    updates: Dict[str, Any] = {
        "stage": PipelineState.INTERVIEW_SCHEDULED.value,
        "calendar_event_id": cal_result.get("event_id"),
        "interview_link": cal_result.get("meet_link"),
    }
    if cal_result.get("status") == "scheduled":
        await send_interview_confirmation(
            structured.email,
            structured.name,
            parsed_jd.title,
            cal_result.get("start_time") or "See calendar",
            cal_result.get("meet_link"),
        )
        updates["stage"] = PipelineState.COMPLETED.value

    await get_db().update_one("candidates", cid, updates)
    await log_action(
        job_id=job_id,
        candidate_id=cid,
        action="schedule_interview",
        tool_used="calendar_scheduler",
        output_summary=cal_result.get("status", ""),
    )
    await ws_manager.emit(
        "interview_scheduled",
        job_id,
        cal_result.get("message", ""),
        candidate_id=cid,
        stage=updates["stage"],
    )


async def continue_after_review(
    job_id: str,
    candidate_id: str,
    action: str,
    override_score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Resume pipeline for a candidate after human review (approve/reject).

    Input:
        job_id: job id
        candidate_id: candidate id
        action: "approve" or "reject"
        override_score: optional recruiter override score
    Output:
        dict with new stage and message
    """
    db = get_db()
    settings = get_settings()
    candidate = await db.find_one("candidates", {"id": candidate_id})
    job = await db.find_one("jobs", {"id": job_id})

    if not candidate or not job:
        return {"status": "failed", "message": "Candidate or job not found"}

    if action == "reject":
        await _set_candidate_stage(
            candidate_id,
            PipelineState.REJECTED.value,
            {"flagged_for_review": False, "review_reason": None},
        )
        from app.tools.feedback_learner import record_feedback

        await record_feedback(
            job_id,
            candidate_id,
            expected_score=0,
            actual_score=candidate.get("score") or 0,
            action="reject",
        )
        return {"status": "rejected", "stage": PipelineState.COMPLETED.value}

    # Approve — continue shortlist flow
    score = override_score or candidate.get("score") or settings.score_auto_shortlist
    await db.update_one(
        "candidates",
        candidate_id,
        {
            "score": score,
            "flagged_for_review": False,
            "review_reason": None,
        },
    )

    parsed_jd = ParsedRequirements(**job["parsed_requirements"])
    from app.models.candidate import ScoreBreakdown, StructuredResume

    structured = StructuredResume(**candidate.get("structured_data", {}))
    breakdown = ScoreBreakdown(**candidate.get("score_breakdown", {"final_score": score}))
    reasoning = candidate.get("reasoning") or "Approved by recruiter"

    from app.tools.feedback_learner import record_feedback

    await record_feedback(
        job_id,
        candidate_id,
        expected_score=score,
        actual_score=candidate.get("score") or 0,
        action="approve",
    )

    await _run_shortlist_actions(job_id, candidate_id, structured, parsed_jd, breakdown, reasoning)
    updated = await db.find_one("candidates", {"id": candidate_id})
    return {"status": "approved", "stage": updated.get("stage"), "message": "Pipeline continued after approval"}
