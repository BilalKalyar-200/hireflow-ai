"""
HireFlow AI — Health Check Route.

GET /health — returns API status for monitoring and deployment checks.
"""

from datetime import datetime

from fastapi import APIRouter

from app.config import get_settings
from app.utils.token_counter import token_counter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    """
    Return API health status and token usage summary.

    Input: none (HTTP GET)
    Output: JSON with status, app name, timestamp, and token counter summary
    """
    settings = get_settings()
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.app_env,
        "timestamp": datetime.utcnow().isoformat(),
        "mock_qwen": settings.mock_qwen,
        "token_usage": token_counter.get_summary(),
    }
