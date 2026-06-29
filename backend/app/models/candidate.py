"""
HireFlow AI — Candidate Pydantic Models.

Schemas for candidate data, scores, pipeline stages, and review actions.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StructuredResume(BaseModel):
    """
    Structured candidate data extracted from resume text.

    Input: JSON from resume_extractor tool
    Output: validated StructuredResume object
    """

    name: str = ""
    email: str = ""
    phone: str = ""
    skills: List[str] = Field(default_factory=list)
    experience_years: float = 0.0
    education: List[str] = Field(default_factory=list)
    work_history: List[Dict[str, Any]] = Field(default_factory=list)
    summary: str = ""


class ScoreBreakdown(BaseModel):
    """
    Breakdown of how the final candidate score was calculated.

    Input: scorer tool output fields
    Output: ScoreBreakdown with weighted components
    """

    qwen_qualitative: float = 0.0
    semantic_similarity: float = 0.0
    skills_match_pct: float = 0.0
    experience_fit: float = 0.0
    final_score: float = 0.0


class CandidateResponse(BaseModel):
    """
    Candidate data returned by API endpoints.

    Input: MongoDB candidate document
    Output: JSON-serializable candidate response
    """

    id: str
    job_id: str
    name: str = ""
    email: str = ""
    stage: str = "pending"
    score: Optional[float] = None
    score_breakdown: Optional[ScoreBreakdown] = None
    reasoning: Optional[str] = None
    flagged_for_review: bool = False
    review_reason: Optional[str] = None
    structured_data: Optional[StructuredResume] = None
    report: Optional[str] = None
    calendar_event_id: Optional[str] = None
    interview_link: Optional[str] = None
    oss_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CandidateListResponse(BaseModel):
    """
    List of candidates for GET /candidates.

    Input: list of candidate documents for a job
    Output: wrapper with candidates array and count
    """

    candidates: List[CandidateResponse]
    count: int


class ReviewAction(BaseModel):
    """
    Request body for POST /candidates/{id}/review.

    Input: JSON with action (approve/reject) and optional override_score
    Output: ReviewAction schema for validation
    """

    action: str = Field(..., pattern="^(approve|reject|hire)$")
    override_score: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class UploadResponse(BaseModel):
    """
    Response after uploading resume PDFs.

    Input: created candidate IDs
    Output: upload summary with candidate IDs and count
    """

    job_id: str
    candidate_ids: List[str]
    uploaded_count: int
    message: str
