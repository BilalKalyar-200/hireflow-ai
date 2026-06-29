"""
HireFlow AI — Candidate Routes.

POST /candidates/upload — upload resume PDFs for a job
GET /candidates — list candidates for a job
GET /candidates/{id} — candidate detail
POST /candidates/{id}/review — approve or reject flagged candidates
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.agent.orchestrator import continue_after_review
from app.config import get_settings
from app.models.candidate import (
    CandidateListResponse,
    CandidateResponse,
    ReviewAction,
    ScoreBreakdown,
    StructuredResume,
    UploadResponse,
)
from app.services.mongodb import get_db
from app.services.oss_storage import get_storage

router = APIRouter(prefix="/candidates", tags=["Candidates"])


def _to_candidate_response(doc: dict) -> CandidateResponse:
    """
    Convert MongoDB candidate document to CandidateResponse.

    Input: candidate document dict
    Output: CandidateResponse pydantic model
    """
    structured = None
    if doc.get("structured_data"):
        structured = StructuredResume(**doc["structured_data"])
    breakdown = None
    if doc.get("score_breakdown"):
        breakdown = ScoreBreakdown(**doc["score_breakdown"])
    return CandidateResponse(
        id=doc["id"],
        job_id=doc["job_id"],
        name=doc.get("name", ""),
        email=doc.get("email", ""),
        stage=doc.get("stage", "pending"),
        score=doc.get("score"),
        score_breakdown=breakdown,
        reasoning=doc.get("reasoning"),
        flagged_for_review=doc.get("flagged_for_review", False),
        review_reason=doc.get("review_reason"),
        structured_data=structured,
        report=doc.get("report"),
        calendar_event_id=doc.get("calendar_event_id"),
        interview_link=doc.get("interview_link"),
        oss_path=doc.get("oss_path"),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at", doc["created_at"]),
    )


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_resumes(
    job_id: str = Form(...),
    files: List[UploadFile] = File(...),
) -> UploadResponse:
    """
    Upload one or more resume PDFs for a job.

    Input:
        job_id: form field with job id
        files: multipart PDF file uploads
    Output:
        UploadResponse with created candidate ids
    """
    settings = get_settings()
    db = get_db()
    storage = get_storage()

    job = await db.find_one("jobs", {"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    max_bytes = settings.max_pdf_size_mb * 1024 * 1024
    candidate_ids: List[str] = []

    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Only PDF files allowed: {upload.filename}")

        data = await upload.read()
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File {upload.filename} exceeds {settings.max_pdf_size_mb}MB limit",
            )

        cid = str(uuid4())
        oss_path = storage.build_resume_path(job_id, cid)
        await storage.upload_file(oss_path, data)

        now = datetime.utcnow()
        await db.insert_one(
            "candidates",
            {
                "id": cid,
                "job_id": job_id,
                "name": "",
                "email": "",
                "stage": "pending",
                "oss_path": oss_path,
                "original_filename": upload.filename,
                "flagged_for_review": False,
                "created_at": now,
                "updated_at": now,
            },
        )
        candidate_ids.append(cid)

    return UploadResponse(
        job_id=job_id,
        candidate_ids=candidate_ids,
        uploaded_count=len(candidate_ids),
        message=f"Uploaded {len(candidate_ids)} resume(s) successfully",
    )


@router.get("", response_model=CandidateListResponse)
async def list_candidates(job_id: str) -> CandidateListResponse:
    """
    List all candidates for a job.

    Input: job_id query parameter
    Output: CandidateListResponse with candidates and count
    """
    db = get_db()
    docs = await db.find_many("candidates", {"job_id": job_id}, limit=200)
    candidates = [_to_candidate_response(d) for d in docs]
    return CandidateListResponse(candidates=candidates, count=len(candidates))


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str) -> CandidateResponse:
    """
    Get one candidate by id.

    Input: candidate_id path parameter
    Output: CandidateResponse or 404
    """
    db = get_db()
    doc = await db.find_one("candidates", {"id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _to_candidate_response(doc)


@router.post("/{candidate_id}/review")
async def review_candidate(candidate_id: str, body: ReviewAction) -> dict:
    """
    Approve or reject a candidate flagged for human review.

    Input:
        candidate_id: path parameter
        body: ReviewAction with action approve/reject and optional override_score
    Output:
        dict with status and new pipeline stage
    """
    db = get_db()
    candidate = await db.find_one("candidates", {"id": candidate_id})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not candidate.get("flagged_for_review") and body.action != "hire":
        raise HTTPException(status_code=400, detail="Candidate is not flagged for review")

    result = await continue_after_review(
        job_id=candidate["job_id"],
        candidate_id=candidate_id,
        action=body.action,
        override_score=body.override_score,
    )
    return result
