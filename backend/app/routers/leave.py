from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentEmployee, DbSession, require_role
from app.enums import ApprovalActionType, CheckOutcome, DayRequestStatus, EmployeeRole
from app.models import ApprovalAction, DayRequest, Employee, EmployeeLeaveBalance, Holiday, LeaveApplication, LeaveType
from app.schemas.balance_adjustment import LeaveBalanceOut
from app.schemas.common import CheckResultOut, ValidationErrorResponse
from app.schemas.holidays import HolidayOut
from app.schemas.leave import (
    ApprovalActionOut,
    ApproveRejectRequest,
    CancelRequest,
    LeaveApplicationCreate,
    LeaveApplicationRead,
)
from app.services.accrual_service import compute_available_balance
from app.services.approval_service import cancel_leave_application, record_approval_action
from app.services.day_request_service import create_leave_application
from app.services.email_service import send_leave_applied_email, send_leave_cancelled_email
from app.services.slack_service import notify_leave_applied, notify_leave_cancelled
from app.services.validation_engine.orchestrator import validate_leave_application

router = APIRouter(prefix="/leave", tags=["leave"])


def _to_read_model(
    db: DbSession,
    application: LeaveApplication,
    day_request: DayRequest,
    leave_type_code: str | None,
    *,
    include_detail: bool = True,
) -> LeaveApplicationRead:
    approver_name = None
    approver_picture_url = None
    approval_history: list[ApprovalActionOut] = []

    if include_detail:
        if application.approver_employee_id:
            approver = db.get(Employee, application.approver_employee_id)
            if approver:
                approver_name = approver.full_name
                approver_picture_url = approver.google_picture_url
        actions = db.execute(
            select(ApprovalAction, Employee.full_name)
            .join(Employee, Employee.id == ApprovalAction.actor_employee_id)
            .where(ApprovalAction.leave_application_id == application.id)
            .order_by(ApprovalAction.acted_at.asc())
        ).all()
        approval_history = [
            ApprovalActionOut(
                id=a.id,
                actor_employee_id=a.actor_employee_id,
                actor_name=name,
                action=a.action.value,
                comment=a.comment,
                acted_at=a.acted_at,
            )
            for a, name in actions
        ]

    return LeaveApplicationRead(
        id=application.id,
        day_request_id=application.day_request_id,
        leave_type_id=application.leave_type_id,
        leave_type_code=leave_type_code,
        status=day_request.status.value,
        resolution_type=application.resolution_type.value,
        is_lop=application.is_lop,
        applied_days=float(application.applied_days),
        sandwich_days_added=float(application.sandwich_days_added),
        total_deducted_days=float(application.total_deducted_days),
        reason=application.reason,
        applied_at=application.applied_at,
        start_date=day_request.start_date,
        end_date=day_request.end_date,
        approver_employee_id=application.approver_employee_id,
        approver_name=approver_name,
        approver_picture_url=approver_picture_url,
        approval_history=approval_history,
    )


@router.post("/applications", status_code=status.HTTP_201_CREATED)
def create_application(payload: LeaveApplicationCreate, db: DbSession, current: CurrentEmployee):
    now = datetime.now(timezone.utc)
    try:
        decision = validate_leave_application(db, current.id, payload.leave_type_id, payload.sessions, payload.reason, now)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if decision.outcome == CheckOutcome.BLOCK:
        db.commit()  # persist audit trail rows for the block, if the orchestrator wrote any
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ValidationErrorResponse(
                outcome=decision.outcome.value,
                violations=[
                    CheckResultOut(
                        check_name=r.check_name,
                        outcome=r.outcome.value,
                        reason_code=r.reason_code,
                        message=r.message,
                        metadata=r.metadata,
                    )
                    for r in decision.violations
                ],
            ).model_dump(),
        )

    application = create_leave_application(
        db, current, payload.leave_type_id, payload.request_kind, payload.sessions, payload.reason, now, decision
    )
    db.commit()
    db.refresh(application)

    leave_type = db.get(LeaveType, application.leave_type_id)
    day_request = db.get(DayRequest, application.day_request_id)

    if application.approver_employee_id and leave_type:
        approver = db.get(Employee, application.approver_employee_id)
        if approver:
            try:
                send_leave_applied_email(db, approver, current, application, day_request, leave_type)
            except Exception:  # noqa: BLE001 -- email delivery must never break the application itself
                pass
            try:
                notify_leave_applied(current, approver, application, day_request, leave_type)
            except Exception:  # noqa: BLE001 -- Slack delivery must never break the application itself
                pass

    return _to_read_model(db, application, day_request, leave_type.code if leave_type else None)


@router.get("/applications", response_model=list[LeaveApplicationRead])
def list_applications(db: DbSession, current: CurrentEmployee, status_filter: str | None = None, year: int | None = None):
    stmt = (
        select(LeaveApplication, DayRequest, LeaveType.code)
        .join(DayRequest, DayRequest.id == LeaveApplication.day_request_id)
        .join(LeaveType, LeaveType.id == LeaveApplication.leave_type_id)
        .where(DayRequest.employee_id == current.id)
        .order_by(LeaveApplication.applied_at.desc())
    )
    rows = db.execute(stmt).all()
    results = []
    for application, day_request, leave_type_code in rows:
        if status_filter and day_request.status.value != status_filter:
            continue
        if year and day_request.start_date.year != year:
            continue
        results.append(_to_read_model(db, application, day_request, leave_type_code, include_detail=False))
    return results


@router.get("/leave-types")
def list_leave_types_for_employees(db: DbSession, _: CurrentEmployee):
    leave_types = db.execute(select(LeaveType).where(LeaveType.is_active.is_(True))).scalars().all()
    return [
        {
            "id": lt.id,
            "code": lt.code,
            "name": lt.name,
            "default_annual_days": float(lt.default_annual_days),
            "accrual_mode": lt.accrual_mode.value,
            "allow_lop_conversion": lt.allow_lop_conversion,
            "is_active": lt.is_active,
        }
        for lt in leave_types
    ]


@router.get("/colleagues")
def list_colleagues(db: DbSession, _: CurrentEmployee):
    """Minimal directory (id/name/email only) any employee can read -- used to pick a
    file-sharing target without exposing the full /admin/employees record set."""
    employees = db.execute(select(Employee).where(Employee.is_active.is_(True)).order_by(Employee.full_name)).scalars().all()
    return [{"id": e.id, "full_name": e.full_name, "email": e.email, "picture_url": e.google_picture_url} for e in employees]


@router.get("/holidays", response_model=list[HolidayOut])
def list_holidays_for_employees(db: DbSession, _: CurrentEmployee, year: int | None = None):
    stmt = select(Holiday)
    if year:
        stmt = stmt.where(Holiday.year == year)
    return db.execute(stmt.order_by(Holiday.date)).scalars().all()


@router.get("/balances", response_model=list[LeaveBalanceOut])
def get_own_balances(db: DbSession, current: CurrentEmployee, year: int | None = None):
    target_year = year or datetime.now(timezone.utc).year
    leave_types = db.execute(select(LeaveType).where(LeaveType.is_active.is_(True))).scalars().all()
    out = []
    for lt in leave_types:
        balance = db.execute(
            select(EmployeeLeaveBalance).where(
                EmployeeLeaveBalance.employee_id == current.id,
                EmployeeLeaveBalance.leave_type_id == lt.id,
                EmployeeLeaveBalance.year == target_year,
            )
        ).scalars().first()
        available = compute_available_balance(current, lt, balance, datetime.now(timezone.utc).date())
        out.append(
            LeaveBalanceOut(
                leave_type_id=lt.id,
                leave_type_code=lt.code,
                year=target_year,
                entitled_days=float(balance.entitled_days) if balance else 0.0,
                accrued_days=float(balance.accrued_days) if balance else 0.0,
                used_days=float(balance.used_days) if balance else 0.0,
                carried_forward_days=float(balance.carried_forward_days) if balance else 0.0,
                available_days=float(available),
            )
        )
    return out


def _get_owned_application(db: DbSession, current: Employee, application_id: int) -> tuple[LeaveApplication, DayRequest]:
    application = db.get(LeaveApplication, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave application not found")
    day_request = db.get(DayRequest, application.day_request_id)
    is_owner = day_request.employee_id == current.id
    is_privileged = current.role in (EmployeeRole.MANAGER, EmployeeRole.HR_ADMIN)
    if not is_owner and not is_privileged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave application not found")
    return application, day_request


def _require_can_approve(application: LeaveApplication, current: Employee) -> None:
    """Approve/reject is restricted to the request's actual assigned approver (its manager, or
    the manager's delegate at submission time) or HR_ADMIN as an override -- being *a* manager
    somewhere in the org isn't enough, otherwise any manager could act on any other team's leave."""
    if current.role == EmployeeRole.HR_ADMIN:
        return
    if application.approver_employee_id == current.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the assigned approver for this request")


@router.get("/applications/{application_id}", response_model=LeaveApplicationRead)
def get_application(application_id: int, db: DbSession, current: CurrentEmployee):
    application, day_request = _get_owned_application(db, current, application_id)
    leave_type = db.get(LeaveType, application.leave_type_id)
    return _to_read_model(db, application, day_request, leave_type.code if leave_type else None)


@router.post("/applications/{application_id}/cancel", response_model=LeaveApplicationRead)
def cancel_application(application_id: int, payload: CancelRequest, db: DbSession, current: CurrentEmployee):
    application, day_request = _get_owned_application(db, current, application_id)
    if day_request.employee_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the applicant can cancel this request")
    if day_request.status not in (DayRequestStatus.PENDING, DayRequestStatus.APPROVED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending or approved requests can be cancelled")
    if day_request.start_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a leave that has already started or passed")

    was_approved = day_request.status == DayRequestStatus.APPROVED
    cancel_leave_application(db, application, current.id, payload.reason)
    db.commit()
    db.refresh(application)
    db.refresh(day_request)
    leave_type = db.get(LeaveType, application.leave_type_id)

    if was_approved and leave_type:
        approver = db.get(Employee, application.approver_employee_id) if application.approver_employee_id else None
        if approver:
            try:
                send_leave_cancelled_email(db, approver, current, application, day_request, leave_type)
            except Exception:  # noqa: BLE001 -- email delivery must never break the cancellation itself
                pass
            try:
                notify_leave_cancelled(current, approver, application, day_request, leave_type)
            except Exception:  # noqa: BLE001 -- Slack delivery must never break the cancellation itself
                pass

    return _to_read_model(db, application, day_request, leave_type.code if leave_type else None)


@router.post("/applications/{application_id}/approve", response_model=LeaveApplicationRead)
def approve_application(
    application_id: int,
    payload: ApproveRejectRequest,
    db: DbSession,
    current: Employee = Depends(require_role(EmployeeRole.MANAGER, EmployeeRole.HR_ADMIN)),
):
    application, day_request = _get_owned_application(db, current, application_id)
    _require_can_approve(application, current)
    record_approval_action(db, application, current.id, ApprovalActionType.APPROVED, payload.comment)
    db.commit()
    db.refresh(application)
    db.refresh(day_request)
    leave_type = db.get(LeaveType, application.leave_type_id)
    return _to_read_model(db, application, day_request, leave_type.code if leave_type else None)


@router.post("/applications/{application_id}/reject", response_model=LeaveApplicationRead)
def reject_application(
    application_id: int,
    payload: ApproveRejectRequest,
    db: DbSession,
    current: Employee = Depends(require_role(EmployeeRole.MANAGER, EmployeeRole.HR_ADMIN)),
):
    application, day_request = _get_owned_application(db, current, application_id)
    _require_can_approve(application, current)
    record_approval_action(db, application, current.id, ApprovalActionType.REJECTED, payload.comment)
    db.commit()
    db.refresh(application)
    db.refresh(day_request)
    leave_type = db.get(LeaveType, application.leave_type_id)
    return _to_read_model(db, application, day_request, leave_type.code if leave_type else None)


@router.get("/approvals/pending", response_model=list[LeaveApplicationRead])
def list_pending_approvals(
    db: DbSession,
    current: Employee = Depends(require_role(EmployeeRole.MANAGER, EmployeeRole.HR_ADMIN)),
):
    stmt = (
        select(LeaveApplication, DayRequest, LeaveType.code)
        .join(DayRequest, DayRequest.id == LeaveApplication.day_request_id)
        .join(LeaveType, LeaveType.id == LeaveApplication.leave_type_id)
        .where(LeaveApplication.approver_employee_id == current.id, DayRequest.status == "PENDING")
        .order_by(LeaveApplication.applied_at.asc())
    )
    rows = db.execute(stmt).all()
    return [_to_read_model(db, application, day_request, code, include_detail=False) for application, day_request, code in rows]
