"""
HireFlow AI — Job Pydantic Models.

Schemas for creating jobs, parsed job descriptions, and API responses.
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class ParsedRequirements(BaseModel):
    """
    Structured job requirements extracted from raw JD text by Qwen.

    Input: JSON from jd_parser tool
    Output: validated ParsedRequirements object
    """

    title: str = ""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    min_experience_years: float = 0.0
    education: str = ""
    responsibilities: List[str] = Field(default_factory=list)
    location: str = ""
    employment_type: str = ""


class JobCreate(BaseModel):
    """
    Request body for POST /jobs.

    Input: JSON with jd_text (job description) and optional title
    Output: JobCreate schema for validation
    """

    jd_text: str = Field(..., min_length=10, description="Full job description text")
    title: Optional[str] = Field(None, description="Optional job title override")


class JobResponse(BaseModel):
    """
    Job data returned by API endpoints.

    Input: MongoDB job document fields
    Output: JSON-serializable job response
    """

    id: str
    title: str
    jd_text: str
    parsed_requirements: Optional[ParsedRequirements] = None
    status: str = "created"
    created_at: datetime
    updated_at: datetime


class JobListResponse(BaseModel):
    """
    List of jobs for GET /jobs.

    Input: list of job documents
    Output: wrapper with jobs array and count
    """

    jobs: List[JobResponse]
    count: int
