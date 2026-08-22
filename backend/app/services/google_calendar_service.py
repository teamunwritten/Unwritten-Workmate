"""Auto-syncs approved leave to the employee's Google Calendar as an all-day "On leave" event.

Best-effort by design: every call here is wrapped by the caller in a try/except so a Calendar
API hiccup (revoked consent, expired refresh token, transient network error) never blocks or
rolls back the approval/cancellation itself -- the leave record is always the source of truth,
the calendar event is a convenience mirror of it.
"""
from datetime import date, timedelta

import requests

from app.config import settings
from app.models import Employee

TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
EVENT_SUMMARY = "On leave"
REQUEST_TIMEOUT_SECONDS = 8


def _get_access_token(refresh_token: str) -> str | None:
    res = requests.post(
        TOKEN_ENDPOINT,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not res.ok:
        return None
    return res.json().get("access_token")


def create_leave_event(employee: Employee, start_date: date, end_date: date) -> str | None:
    """Creates an all-day event spanning [start_date, end_date] inclusive. Returns the created
    event's id (to allow later deletion) or None if sync wasn't possible."""
    if not employee.google_calendar_refresh_token:
        return None

    access_token = _get_access_token(employee.google_calendar_refresh_token)
    if not access_token:
        return None

    # Google's all-day event end date is exclusive.
    end_exclusive = end_date + timedelta(days=1)

    res = requests.post(
        EVENTS_ENDPOINT,
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "summary": EVENT_SUMMARY,
            "start": {"date": start_date.isoformat()},
            "end": {"date": end_exclusive.isoformat()},
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not res.ok:
        return None
    return res.json().get("id")


def delete_leave_event(employee: Employee, event_id: str) -> None:
    if not employee.google_calendar_refresh_token or not event_id:
        return

    access_token = _get_access_token(employee.google_calendar_refresh_token)
    if not access_token:
        return

    requests.delete(
        f"{EVENTS_ENDPOINT}/{event_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
