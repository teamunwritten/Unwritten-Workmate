"""Public (unauthenticated) endpoint backing the one-click Approve/Reject links sent to Slack.

Trust comes entirely from the signed token (see action_tokens.py), not a login session -- the
token itself encodes exactly one decision (which application, which approver, which action) and
expires after 72h, so it can't be replayed for anything beyond what it was minted for.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.deps import DbSession
from app.enums import ApprovalActionType, DayRequestStatus
from app.models import DayRequest, Employee, LeaveApplication
from app.services.action_tokens import decode_leave_action_token
from app.services.approval_service import record_approval_action

router = APIRouter(prefix="/actions", tags=["actions"])


class LeaveActionResult(BaseModel):
    ok: bool
    title: str
    message: str


@router.post("/leave", response_model=LeaveActionResult)
def act_on_leave(token: str, db: DbSession) -> LeaveActionResult:
    payload = decode_leave_action_token(token)
    if not payload:
        return LeaveActionResult(ok=False, title="Link expired or invalid", message="This action link is no longer valid.")

    application = db.get(LeaveApplication, payload["app_id"])
    day_request = db.get(DayRequest, application.day_request_id) if application else None
    if not application or not day_request:
        return LeaveActionResult(ok=False, title="Not found", message="This leave request no longer exists.")

    approver = db.get(Employee, payload["approver_id"])
    if not approver or application.approver_employee_id != approver.id:
        return LeaveActionResult(ok=False, title="Not authorized", message="This link is no longer valid for this request.")

    applicant = db.get(Employee, day_request.employee_id)
    applicant_name = applicant.full_name if applicant else "the employee"

    if day_request.status != DayRequestStatus.PENDING:
        already = day_request.status.value.title()
        return LeaveActionResult(
            ok=day_request.status == DayRequestStatus.APPROVED,
            title=f"Already {already}",
            message=f"This request was already {already.lower()} -- no action was taken.",
        )

    action_type = ApprovalActionType.APPROVED if payload["action"] == "approve" else ApprovalActionType.REJECTED
    record_approval_action(db, application, approver.id, action_type, comment=None)
    db.commit()

    if action_type == ApprovalActionType.APPROVED:
        return LeaveActionResult(ok=True, title="Leave approved", message=f"You approved {applicant_name}'s leave request.")
    return LeaveActionResult(ok=False, title="Leave rejected", message=f"You rejected {applicant_name}'s leave request.")
