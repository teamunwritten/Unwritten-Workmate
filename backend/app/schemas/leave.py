from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.enums import EmployeeRole, RequestKind, SessionType


class SessionInput(BaseModel):
    date: date
    session: SessionType


class LeaveApplicationCreate(BaseModel):
    leave_type_id: int
    request_kind: RequestKind = RequestKind.LEAVE
    sessions: list[SessionInput]
    reason: str | None = None

    @field_validator("sessions")
    @classmethod
    def sessions_not_empty(cls, v: list[SessionInput]) -> list[SessionInput]:
        if not v:
            raise ValueError("At least one session is required")
        return v


class ApprovalActionOut(BaseModel):
    id: int
    actor_employee_id: int
    actor_name: str | None = None
    action: str
    comment: str | None
    acted_at: datetime

    model_config = {"from_attributes": True}


class LeaveApplicationRead(BaseModel):
    id: int
    day_request_id: int
    leave_type_id: int
    leave_type_code: str | None = None
    status: str
    resolution_type: str
    is_lop: bool
    applied_days: float
    sandwich_days_added: float
    total_deducted_days: float
    reason: str | None
    applied_at: datetime
    start_date: date
    end_date: date
    approver_employee_id: int | None = None
    approver_name: str | None = None
    approver_picture_url: str | None = None
    pending_level: int | None = None
    employee_id: int | None = None
    employee_name: str | None = None
    employee_code: str | None = None
    employee_picture_url: str | None = None
    approval_history: list[ApprovalActionOut] = []

    model_config = {"from_attributes": True}


class CancelRequest(BaseModel):
    reason: str | None = None


class ApproveRejectRequest(BaseModel):
    comment: str | None = None


class CalendarEntryOut(BaseModel):
    """Response shape for /calendar/team. `leave_type_code` and `notes` are omitted entirely
    (not just blanked) for peer viewers — masking happens server-side before serialization."""

    employee_id: int
    employee_code: str
    employee_name: str
    picture_url: str | None = None
    date: date
    session: str
    request_kind: str
    status: str
    display_status: str = "On Leave"
    leave_type_code: str | None = None
    notes: str | None = None


def mask_calendar_entry(entry: dict, viewer_role: EmployeeRole, viewer_is_manager_of_employee: bool) -> CalendarEntryOut:
    can_see_detail = viewer_role == EmployeeRole.HR_ADMIN or viewer_is_manager_of_employee
    return CalendarEntryOut(
        employee_id=entry["employee_id"],
        employee_code=entry["employee_code"],
        employee_name=entry["employee_name"],
        picture_url=entry.get("picture_url"),
        date=entry["date"],
        session=entry["session"],
        request_kind=entry["request_kind"],
        status=entry["status"],
        display_status="On Leave" if entry["request_kind"] == "LEAVE" else entry["request_kind"],
        leave_type_code=entry.get("leave_type_code") if can_see_detail else None,
        notes=entry.get("notes") if can_see_detail else None,
    )
