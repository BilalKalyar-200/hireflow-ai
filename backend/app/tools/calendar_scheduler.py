"""
HireFlow AI — Calendar Scheduler Tool.

Creates Google Calendar interview events using a Service Account JSON file.
No OAuth or user consent screens required.
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


def _get_calendar_service() -> Any:
    """
    Build Google Calendar API service from service account file.

    Input: none (reads settings)
    Output: googleapiclient discovery Resource for calendar v3
    """
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    settings = get_settings()
    sa_path = Path(settings.google_service_account_file)
    if not sa_path.is_absolute():
        sa_path = Path(__file__).resolve().parents[3] / sa_path

    credentials = service_account.Credentials.from_service_account_file(
        str(sa_path),
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    return build("calendar", "v3", credentials=credentials, cache_discovery=False)


async def schedule_interview(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    duration_minutes: int = 60,
    days_from_now: int = 3,
) -> Dict[str, Optional[str]]:
    """
    Create a Google Calendar event for an interview.

    Input:
        candidate_email: attendee email (added if valid)
        candidate_name: used in event title
        job_title: used in event title
        duration_minutes: interview length in minutes
        days_from_now: schedule N days from today at 10:00 UTC
    Output:
        dict with event_id, meet_link, start_time, status, message
    """
    settings = get_settings()

    if not settings.is_calendar_configured():
        logger.warning("Google Calendar not configured — interview scheduling skipped")
        return {
            "event_id": None,
            "meet_link": None,
            "start_time": None,
            "status": "skipped",
            "message": "Google Calendar not configured",
        }

    try:
        service = _get_calendar_service()
        start = datetime.utcnow() + timedelta(days=days_from_now)
        start = start.replace(hour=10, minute=0, second=0, microsecond=0)
        end = start + timedelta(minutes=duration_minutes)

        event_body: Dict[str, Any] = {
            "summary": f"Interview: {candidate_name} — {job_title}",
            "description": f"HireFlow AI automated interview scheduling for {job_title}.",
            "start": {"dateTime": start.isoformat() + "Z", "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat() + "Z", "timeZone": "UTC"},
            "conferenceData": {
                "createRequest": {"requestId": f"hireflow-{candidate_name[:20]}"},
            },
        }

        if candidate_email and "@" in candidate_email:
            event_body["attendees"] = [{"email": candidate_email}]

        event = service.events().insert(
            calendarId=settings.google_calendar_id,
            body=event_body,
            conferenceDataVersion=1,
            sendUpdates="none",
        ).execute()

        meet_link = event.get("hangoutLink") or event.get("htmlLink")
        logger.info("Calendar event created: %s", event.get("id"))
        return {
            "event_id": event.get("id"),
            "meet_link": meet_link,
            "start_time": start.isoformat() + "Z",
            "status": "scheduled",
            "message": "Interview scheduled successfully",
        }
    except Exception as exc:
        logger.error("Calendar scheduling failed: %s", exc)
        return {
            "event_id": None,
            "meet_link": None,
            "start_time": None,
            "status": "failed",
            "message": str(exc),
        }
