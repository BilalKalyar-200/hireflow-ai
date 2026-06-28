"""
HireFlow AI — Pipeline State Machine.

Defines valid pipeline stages and which transitions are allowed.
"""

from enum import Enum
from typing import Set


class PipelineState(str, Enum):
    """
    All possible stages for a candidate in the hiring pipeline.

    Input: used as string values in MongoDB candidate.stage field
    Output: enum members for type-safe state checks
    """

    PENDING = "pending"
    PARSING = "parsing"
    PARSED = "parsed"
    SCORED = "scored"
    SHORTLISTED = "shortlisted"
    EMAIL_SENT = "email_sent"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"
    ERROR = "error"
    COMPLETED = "completed"


# Valid transitions: current state -> set of allowed next states
TRANSITIONS: dict[PipelineState, Set[PipelineState]] = {
    PipelineState.PENDING: {PipelineState.PARSING, PipelineState.ERROR},
    PipelineState.PARSING: {PipelineState.PARSED, PipelineState.ERROR, PipelineState.NEEDS_REVIEW},
    PipelineState.PARSED: {PipelineState.SCORED, PipelineState.ERROR},
    PipelineState.SCORED: {
        PipelineState.SHORTLISTED,
        PipelineState.NEEDS_REVIEW,
        PipelineState.REJECTED,
        PipelineState.ERROR,
    },
    PipelineState.NEEDS_REVIEW: {
        PipelineState.SHORTLISTED,
        PipelineState.REJECTED,
        PipelineState.SCORED,
    },
    PipelineState.SHORTLISTED: {PipelineState.EMAIL_SENT, PipelineState.ERROR},
    PipelineState.EMAIL_SENT: {PipelineState.INTERVIEW_SCHEDULED, PipelineState.ERROR},
    PipelineState.INTERVIEW_SCHEDULED: {PipelineState.COMPLETED},
    PipelineState.REJECTED: {PipelineState.COMPLETED},
    PipelineState.ERROR: {PipelineState.PENDING, PipelineState.NEEDS_REVIEW},
    PipelineState.COMPLETED: set(),
}


def can_transition(current: str, next_state: str) -> bool:
    """
    Check if moving from current stage to next_state is allowed.

    Input:
        current: current stage string
        next_state: proposed next stage string
    Output:
        True if transition is valid
    """
    try:
        current_enum = PipelineState(current)
        next_enum = PipelineState(next_state)
    except ValueError:
        return False
    return next_enum in TRANSITIONS.get(current_enum, set())


def score_to_stage(
    score: float,
    auto_shortlist: int,
    borderline_min: int,
) -> PipelineState:
    """
    Decide pipeline stage based on numeric score and thresholds.

    Input:
        score: final candidate score 0-100
        auto_shortlist: threshold for automatic shortlist (e.g. 75)
        borderline_min: minimum for borderline review (e.g. 50)
    Output:
        PipelineState.SHORTLISTED, NEEDS_REVIEW, or REJECTED
    """
    if score >= auto_shortlist:
        return PipelineState.SHORTLISTED
    if score >= borderline_min:
        return PipelineState.NEEDS_REVIEW
    return PipelineState.REJECTED
