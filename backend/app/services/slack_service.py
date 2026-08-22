"""Slack notifications for leave lifecycle events, via a single Incoming Webhook.

Best-effort by design, same pattern as email_service.py / google_calendar_service.py: every call
here is wrapped by the caller in a try/except so a Slack hiccup never blocks or rolls back the
leave transaction itself.

The Approve/Reject buttons are plain link buttons to signed, single-purpose action tokens (see
action_tokens.py) resolved by the frontend's /approve and /reject pages -- not Slack's
Interactivity API, so no Slack App/signing secret/bot token is needed beyond the webhook URL.
"""
import requests

from app.config import settings
from app.models import DayRequest, Employee, LeaveApplication, LeaveType
from app.services.action_tokens import create_leave_action_token

REQUEST_TIMEOUT_SECONDS = 8


def _post(text_fallback: str, blocks: list[dict]) -> None:
    if not settings.slack_webhook_url:
        return  # Slack not configured -- silently skip rather than raise.
    requests.post(
        settings.slack_webhook_url,
        json={"text": text_fallback, "blocks": blocks},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def _duration_text(day_request: DayRequest, application: LeaveApplication) -> str:
    date_range = day_request.start_date.strftime("%d %b %Y")
    if day_request.end_date != day_request.start_date:
        date_range += f" – {day_request.end_date.strftime('%d %b %Y')}"
    days = float(application.total_deducted_days)
    day_word = "day" if days == 1 else "days"
    return f"{date_range} ({days:g} {day_word})"


def notify_leave_applied(
    applicant: Employee,
    approver: Employee,
    application: LeaveApplication,
    day_request: DayRequest,
    leave_type: LeaveType,
) -> None:
    text = f"New leave request from {applicant.full_name} — pending {approver.full_name}'s review"
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "📥 New Leave Request", "emoji": True}},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Employee*\n{applicant.full_name} ({applicant.employee_code})"},
                {"type": "mrkdwn", "text": f"*Approver*\n{approver.full_name}"},
                {"type": "mrkdwn", "text": f"*Leave Type*\n{leave_type.name}"},
                {"type": "mrkdwn", "text": f"*Duration*\n{_duration_text(day_request, application)}"},
            ],
        },
    ]
    if application.reason:
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"*Reason*\n{application.reason}"}})

    approve_token = create_leave_action_token(application.id, approver.id, "approve")
    reject_token = create_leave_action_token(application.id, approver.id, "reject")
    blocks.append(
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "✅ Approve", "emoji": True},
                    "style": "primary",
                    "url": f"{settings.app_base_url}/approve?token={approve_token}",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "❌ Reject", "emoji": True},
                    "style": "danger",
                    "url": f"{settings.app_base_url}/reject?token={reject_token}",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Review in portal", "emoji": True},
                    "url": f"{settings.app_base_url}/approvals",
                },
            ],
        }
    )
    _post(text, blocks)


def notify_leave_cancelled(
    applicant: Employee,
    approver: Employee,
    application: LeaveApplication,
    day_request: DayRequest,
    leave_type: LeaveType,
) -> None:
    text = f"{applicant.full_name} cancelled an approved leave"
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "🚫 Approved Leave Cancelled", "emoji": True}},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Employee*\n{applicant.full_name} ({applicant.employee_code})"},
                {"type": "mrkdwn", "text": f"*Approver*\n{approver.full_name}"},
                {"type": "mrkdwn", "text": f"*Leave Type*\n{leave_type.name}"},
                {"type": "mrkdwn", "text": f"*Duration*\n{_duration_text(day_request, application)}"},
            ],
        },
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"<{settings.app_base_url}/leave/history|View in portal>"}],
        },
    ]
    _post(text, blocks)
