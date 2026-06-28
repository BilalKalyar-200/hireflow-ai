"""
HireFlow AI — Email Sender Tool.

Sends shortlist and interview confirmation emails via Gmail SMTP.
Uses App Password authentication — no OAuth required.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> dict[str, str]:
    """
    Send an email via Gmail SMTP.

    Input:
        to_email: recipient email address
        subject: email subject line
        html_body: HTML content of the email
        text_body: optional plain text fallback
    Output:
        dict with status ("sent" or "skipped") and message
    """
    settings = get_settings()

    if not settings.is_gmail_configured():
        logger.warning("Gmail not configured — email skipped for %s", to_email)
        return {"status": "skipped", "message": "Gmail SMTP not configured"}

    if not to_email or "@" not in to_email:
        logger.warning("Invalid email address — skipped: %s", to_email)
        return {"status": "skipped", "message": "Invalid or missing recipient email"}

    try:
        import aiosmtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.gmail_from_name} <{settings.gmail_user}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=settings.gmail_user,
            password=settings.gmail_app_password,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
        return {"status": "sent", "message": f"Email sent to {to_email}"}
    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        return {"status": "failed", "message": str(exc)}


async def send_shortlist_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    score: float,
) -> dict[str, str]:
    """
    Send shortlist notification email to a candidate.

    Input:
        to_email: candidate email
        candidate_name: candidate full name
        job_title: job title string
        score: final match score
    Output:
        dict with send status and message
    """
    subject = f"Congratulations! You've been shortlisted for {job_title}"
    html = f"""
    <html><body>
    <p>Dear {candidate_name},</p>
    <p>Great news! Your application for <strong>{job_title}</strong> has been shortlisted.</p>
    <p>Your match score: <strong>{score}/100</strong></p>
    <p>We will contact you shortly with interview details.</p>
    <p>Best regards,<br>HireFlow AI Recruitment Team</p>
    </body></html>
    """
    text = f"Dear {candidate_name}, you have been shortlisted for {job_title}. Score: {score}/100."
    return await send_email(to_email, subject, html, text)


async def send_interview_confirmation(
    to_email: str,
    candidate_name: str,
    job_title: str,
    interview_time: str,
    meet_link: Optional[str] = None,
) -> dict[str, str]:
    """
    Send interview confirmation email with calendar details.

    Input:
        to_email: candidate email
        candidate_name: candidate name
        job_title: job title
        interview_time: formatted datetime string
        meet_link: optional Google Meet URL
    Output:
        dict with send status and message
    """
    link_line = f"<p>Meeting link: <a href='{meet_link}'>{meet_link}</a></p>" if meet_link else ""
    subject = f"Interview Scheduled — {job_title}"
    html = f"""
    <html><body>
    <p>Dear {candidate_name},</p>
    <p>Your interview for <strong>{job_title}</strong> is scheduled.</p>
    <p><strong>Time:</strong> {interview_time}</p>
    {link_line}
    <p>Best regards,<br>HireFlow AI Recruitment Team</p>
    </body></html>
    """
    return await send_email(to_email, subject, html)
