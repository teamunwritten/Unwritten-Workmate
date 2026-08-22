"""Signed, expiring one-click action tokens for Approve/Reject links sent to Slack (and email).

Deliberately not a session/login JWT -- typ="leave_action" keeps it from ever being accepted by
the normal auth dependency by mistake, and it encodes exactly one decision (which application,
which approver, approve-or-reject) rather than an identity, so it can't be reused for anything
else even if intercepted.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal

from jose import JWTError, jwt

from app.config import settings

TOKEN_TYPE = "leave_action"
ALGORITHM = "HS256"
EXPIRE_HOURS = 72  # generous -- a manager may not open Slack/email same-day

ActionLiteral = Literal["approve", "reject"]


def create_leave_action_token(application_id: int, approver_id: int, action: ActionLiteral) -> str:
    payload = {
        "typ": TOKEN_TYPE,
        "app_id": application_id,
        "approver_id": approver_id,
        "action": action,
        "exp": datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_leave_action_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if payload.get("typ") != TOKEN_TYPE:
        return None
    return payload
