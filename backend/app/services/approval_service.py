from datetime import date

from sqlalchemy.orm import Session

from app.enums import ApprovalActionType, DayRequestStatus, RequestKind, ResolutionType
from app.models import ApprovalAction, DayRequest, Employee, EmployeeLeaveBalance, LeaveApplication
from app.services import google_calendar_service
from app.services.audit_service import write_audit_entry
from app.services.delegation_service import find_active_delegate, manager_is_on_leave


def resolve_approver(db: Session, employee: Employee, on_date: date) -> int | None:
    """Returns the manager, or the manager's active proxy delegate if the manager is themselves
    on leave that day."""
    if employee.manager_id is None:
        return None
    if manager_is_on_leave(db, employee.manager_id, on_date):
        delegate_id = find_active_delegate(db, employee.manager_id, on_date)
        if delegate_id is not None:
            return delegate_id
    return employee.manager_id


def finalize_approval(db: Session, leave_application: LeaveApplication, day_request: DayRequest) -> None:
    """Applies the balance deduction and calendar sync side effects of an APPROVED resolution.
    Shared by the manager-approval path (record_approval_action) and the HR_ADMIN auto-approve
    path (day_request_service.create_leave_application), which never goes through an approver.
    """
    if not leave_application.is_lop:
        balance = (
            db.query(EmployeeLeaveBalance)
            .filter(
                EmployeeLeaveBalance.employee_id == day_request.employee_id,
                EmployeeLeaveBalance.leave_type_id == leave_application.leave_type_id,
                EmployeeLeaveBalance.year == day_request.start_date.year,
            )
            .first()
        )
        if balance is not None:
            balance.used_days = float(balance.used_days) + float(leave_application.total_deducted_days)

    if day_request.request_kind == RequestKind.LEAVE:
        employee = db.get(Employee, day_request.employee_id)
        try:
            event_id = google_calendar_service.create_leave_event(employee, day_request.start_date, day_request.end_date)
        except Exception:  # noqa: BLE001 -- calendar sync must never break the approval itself
            event_id = None
        if event_id:
            leave_application.google_calendar_event_id = event_id
            write_audit_entry(
                db,
                entity_type="leave_application",
                entity_id=leave_application.id,
                action="GOOGLE_CALENDAR_SYNCED",
                actor_employee_id=None,
                after_value={"google_calendar_event_id": event_id},
            )


def record_approval_action(
    db: Session,
    leave_application: LeaveApplication,
    actor_employee_id: int,
    action: ApprovalActionType,
    comment: str | None,
) -> ApprovalAction:
    approval_action = ApprovalAction(
        leave_application_id=leave_application.id,
        actor_employee_id=actor_employee_id,
        action=action,
        comment=comment,
    )
    db.add(approval_action)

    before_resolution = leave_application.resolution_type
    day_request = db.get(DayRequest, leave_application.day_request_id)

    if action == ApprovalActionType.APPROVED:
        leave_application.resolution_type = ResolutionType.APPROVED
        day_request.status = DayRequestStatus.APPROVED
        finalize_approval(db, leave_application, day_request)
    elif action == ApprovalActionType.REJECTED:
        leave_application.resolution_type = ResolutionType.BLOCKED
        day_request.status = DayRequestStatus.REJECTED
        for session in day_request.sessions:
            session.is_active = False

    write_audit_entry(
        db,
        entity_type="leave_application",
        entity_id=leave_application.id,
        action=f"APPROVAL_{action.value}",
        actor_employee_id=actor_employee_id,
        before_value={"resolution_type": before_resolution.value},
        after_value={"resolution_type": leave_application.resolution_type.value},
        reason_code=comment,
    )
    return approval_action


def cancel_leave_application(db: Session, leave_application: LeaveApplication, actor_employee_id: int, reason: str | None) -> None:
    day_request = db.get(DayRequest, leave_application.day_request_id)
    before_resolution = leave_application.resolution_type

    day_request.status = DayRequestStatus.CANCELLED
    for session in day_request.sessions:
        session.is_active = False

    if leave_application.resolution_type == ResolutionType.APPROVED and not leave_application.is_lop:
        balance = db.query(EmployeeLeaveBalance).filter(
            EmployeeLeaveBalance.employee_id == day_request.employee_id,
            EmployeeLeaveBalance.leave_type_id == leave_application.leave_type_id,
            EmployeeLeaveBalance.year == day_request.start_date.year,
        ).first()
        if balance is not None:
            balance.used_days = max(0.0, float(balance.used_days) - float(leave_application.total_deducted_days))

    if leave_application.google_calendar_event_id:
        employee = db.get(Employee, day_request.employee_id)
        try:
            google_calendar_service.delete_leave_event(employee, leave_application.google_calendar_event_id)
        except Exception:  # noqa: BLE001 -- calendar sync must never break cancellation itself
            pass
        leave_application.google_calendar_event_id = None

    write_audit_entry(
        db,
        entity_type="leave_application",
        entity_id=leave_application.id,
        action="CANCELLED",
        actor_employee_id=actor_employee_id,
        before_value={"resolution_type": before_resolution.value},
        after_value={"resolution_type": "CANCELLED"},
        reason_code=reason,
    )
