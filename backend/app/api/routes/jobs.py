"""
HireFlow AI — Job Routes.

POST /jobs — create job with job description
GET /jobs — list all jobs
GET /jobs/{id} — get single job with parsed requirements
"""

from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.job import JobCreate, JobListResponse, JobResponse, ParsedRequirements
from app.services.mongodb import get_db

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _to_job_response(doc: dict) -> JobResponse:
    """
    Convert MongoDB job document to JobResponse model.

    Input: job document dict from MongoDB
    Output: JobResponse pydantic model
    """
    parsed = None
    if doc.get("parsed_requirements"):
        parsed = ParsedRequirements(**doc["parsed_requirements"])
    return JobResponse(
        id=doc["id"],
        title=doc.get("title", ""),
        jd_text=doc["jd_text"],
        parsed_requirements=parsed,
        status=doc.get("status", "created"),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at", doc["created_at"]),
    )


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(body: JobCreate) -> JobResponse:
    """
    Create a new job posting with a job description.

    Input: JobCreate JSON body with jd_text and optional title
    Output: JobResponse with new job id and timestamps
    """
    db = get_db()
    now = datetime.utcnow()
    job_id = str(uuid4())
    document = {
        "id": job_id,
        "title": body.title or "New Position",
        "jd_text": body.jd_text,
        "parsed_requirements": None,
        "status": "created",
        "created_at": now,
        "updated_at": now,
    }
    await db.insert_one("jobs", document)
    return _to_job_response(document)


@router.get("", response_model=JobListResponse)
async def list_jobs() -> JobListResponse:
    """
    List all job postings ordered by creation date.

    Input: none (HTTP GET)
    Output: JobListResponse with jobs array and count
    """
    db = get_db()
    docs = await db.find_many("jobs", {}, limit=50)
    jobs: List[JobResponse] = [_to_job_response(d) for d in docs]
    return JobListResponse(jobs=jobs, count=len(jobs))


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    """
    Get one job by id.

    Input: job_id path parameter
    Output: JobResponse or 404 if not found
    """
    db = get_db()
    doc = await db.find_one("jobs", {"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_job_response(doc)
