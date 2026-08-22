from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import CheckOutcome, DayRequestStatus, RequestKind, ResolutionType, SessionType
from app.models import DayRequest, DayRequestSession, Employee, LeaveApplication
from app.schemas.leave import SessionInput
from app.services.approval_service import resolve_approver
from app.services.audit_service import write_audit_entry
from app.services.validation_engine.results import ValidationDecision

DAY_VALUE = {SessionType.FULL_DAY: 1.0, SessionType.FIRST_HALF: 0.5, SessionType.SECOND_HALF: 0.5}


def create_leave_application(
    db: Session,
    employee: Employee,
    leave_type_id: int,
    request_kind: RequestKind,
    sessions: list[SessionInput],
    reason: str | None,
    application_time: datetime,
    decision: ValidationDecision,
) -> LeaveApplication:
    """Creates day_request + day_request_sessions + leave_application for a PASS/CONVERT_TO_LOP
    decision. Row-locks the candidate (employee_id, session_date) slots -- both indexed columns --
    before inserting, closing the race window a plain INSERT would leave open; the generated-column
    unique index on day_request_sessions is the DB-level backstop if this lock is ever bypassed.
    """
    if decision.outcome == CheckOutcome.BLOCK:
        raise ValueError("Cannot create a leave application from a BLOCK decision")

    dates = sorted({s.date for s in sessions})
    db.execute(
        select(DayRequestSession)
        .where(
            DayRequestSession.employee_id == employee.id,
            DayRequestSession.session_date.in_(dates),
            DayRequestSession.is_active.is_(True),
        )
        .with_for_update()
    ).scalars().all()

    day_request = DayRequest(
        employee_id=employee.id,
        request_kind=request_kind,
        start_date=dates[0],
        end_date=dates[-1],
        status=DayRequestStatus.PENDING,
    )
    db.add(day_request)
    db.flush()

    # Only working days get an actual session row -- weekends/holidays inside the range (e.g. a
    # Friday-to-Monday drag-select) are never booked/deducted, they're just implicitly "off"
    # already. day_request.start_date/end_date above still spans the full selected range so the
    # UI can display "Fri - Mon" as one continuous period even though only 2 days are deducted.
    for s in decision.working_sessions:
        db.add(
            DayRequestSession(
                day_request_id=day_request.id,
                employee_id=employee.id,
                session_date=s.date,
                session=s.session,
                day_value=DAY_VALUE[s.session],
                is_active=True,
            )
        )

    applied_days = sum(DAY_VALUE[s.session] for s in decision.working_sessions)
    resolution_type = ResolutionType.LOP_CONVERTED if decision.is_lop else ResolutionType.PENDING_APPROVAL

    approver_id = resolve_approver(db, employee, dates[0])

    leave_application = LeaveApplication(
        day_request_id=day_request.id,
        leave_type_id=leave_type_id,
        applied_days=applied_days,
        sandwich_days_added=float(decision.sandwich_days_added),
        total_deducted_days=float(decision.total_deducted_days),
        is_lop=decision.is_lop,
        resolution_type=resolution_type,
        reason=reason,
        applied_at=application_time,
        policy_version_id=decision.policy_version_id,
        approver_employee_id=approver_id,
    )
    db.add(leave_application)
    db.flush()

    # One audit row per non-PASS check result, so every violation considered is traceable.
    for result in decision.violations:
        write_audit_entry(
            db,
            entity_type="leave_application",
            entity_id=leave_application.id,
            action=f"VALIDATION_{result.outcome.value}",
            actor_employee_id=employee.id,
            reason_code=result.reason_code,
            after_value={"message": result.message, "metadata": result.metadata},
        )

    if decision.is_lop:
        # Atomic two-part record: the triggering zero-balance check result (above) plus this
        # explicit LOP_AUTO_CONVERSION entry, both in the same transaction as the application write.
        write_audit_entry(
            db,
            entity_type="leave_application",
            entity_id=leave_application.id,
            action="LOP_AUTO_CONVERSION",
            actor_employee_id=None,
            before_value={"resolution_type": ResolutionType.PENDING_APPROVAL.value, "is_lop": False},
            after_value={"resolution_type": resolution_type.value, "is_lop": True},
            reason_code="ZERO_BALANCE",
        )
    else:
        write_audit_entry(
            db,
            entity_type="leave_application",
            entity_id=leave_application.id,
            action="LEAVE_APPLICATION_SUBMITTED",
            actor_employee_id=employee.id,
            after_value={"resolution_type": resolution_type.value},
        )

    return leave_application
