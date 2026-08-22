from datetime import date

from sqlalchemy.orm import Session

from app.enums import ApprovalActionType, DayRequestStatus, EmployeeRole, RequestKind, ResolutionType
from app.models import ApprovalAction, DayRequest, Employee, EmployeeLeaveBalance, LeaveApplication
from app.services import google_calendar_service
from app.services.audit_service import write_audit_entry
from app.services.delegation_service import find_active_delegate, manager_is_on_leave
from app.services.org_settings_service import get_org_settings


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


def resolve_level2_approver(db: Session, level1_approver_id: int) -> int | None:
    """Walks the org chart above the level-1 approver looking for the nearest HR_ADMIN ancestor
    (HR_ADMIN employees always have manager_id=None, so this is a bounded walk). Returns None if
    the level-1 approver has no manager chain at all, or is already the top of it -- in either
    case there's nobody left to escalate to, so the level-1 decision stays final."""
    cursor_id = level1_approver_id
    for _ in range(1000):  # generous bound; a real org chart is never this deep
        cursor = db.get(Employee, cursor_id)
        if cursor is None or cursor.manager_id is None:
            return None
        manager = db.get(Employee, cursor.manager_id)
        if manager is None:
            return None
        if manager.role == EmployeeRole.HR_ADMIN:
            return manager.id
        cursor_id = manager.id
    return None


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
    """Records one approve/reject decision. An APPROVED decision at level 1 only finalizes the
    request if org_settings.requires_second_level_approval is off, or no HR_ADMIN ancestor exists
    to escalate to -- otherwise it's recorded as ESCALATED and reassigned to that admin instead,
    leaving the request PENDING for their decision. A REJECTED decision always finalizes
    immediately, at either level -- rejection is never overridable by a later escalation."""
    before_resolution = leave_application.resolution_type
    day_request = db.get(DayRequest, leave_application.day_request_id)

    recorded_action = action
    if action == ApprovalActionType.APPROVED:
        escalate_to = None
        if leave_application.pending_level == 1 and get_org_settings(db).requires_second_level_approval:
            candidate = resolve_level2_approver(db, actor_employee_id)
            if candidate is not None and candidate != actor_employee_id:
                escalate_to = candidate

        if escalate_to is not None:
            recorded_action = ApprovalActionType.ESCALATED
            leave_application.approver_employee_id = escalate_to
            leave_application.pending_level = 2
        else:
            leave_application.resolution_type = ResolutionType.APPROVED
            day_request.status = DayRequestStatus.APPROVED
            finalize_approval(db, leave_application, day_request)
    elif action == ApprovalActionType.REJECTED:
        leave_application.resolution_type = ResolutionType.BLOCKED
        day_request.status = DayRequestStatus.REJECTED
        for session in day_request.sessions:
            session.is_active = False

    approval_action = ApprovalAction(
        leave_application_id=leave_application.id,
        actor_employee_id=actor_employee_id,
        action=recorded_action,
        comment=comment,
    )
    db.add(approval_action)

    write_audit_entry(
        db,
        entity_type="leave_application",
        entity_id=leave_application.id,
        action=f"APPROVAL_{recorded_action.value}",
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
