from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    DayRequestSession,
    Employee,
    EmployeeLeaveBalance,
    EmployeeOptionalHolidayCap,
    Holiday,
    LeavePolicy,
    LeaveType,
    LeaveTypeEligibilityRule,
    LeaveTypeRestriction,
    OptionalHolidayPick,
    PolicyVersion,
)
from app.schemas.leave import SessionInput
from app.services.calendar_service import filter_working_sessions

LOOKAROUND_DAYS = 7


@dataclass
class ValidationContext:
    db: Session
    employee: Employee
    leave_type: LeaveType
    policy_version: PolicyVersion
    policy: LeavePolicy
    balance: EmployeeLeaveBalance | None
    requested_sessions: list[SessionInput]
    # requested_sessions filtered to actual working days (weekends/holidays dropped) -- this is
    # what gets balance-checked, persisted as day_request_sessions, and deducted. Not filtered
    # for OL (Optional Holiday): those requests are deliberately FOR a holiday date.
    working_sessions: list[SessionInput]
    start_date: date
    end_date: date
    application_time: datetime
    existing_active_sessions: list[DayRequestSession]
    eligibility_rule: LeaveTypeEligibilityRule | None
    restrictions: list[LeaveTypeRestriction]
    holiday_dates: set[date]
    optional_pick_count: int
    optional_pick_cap: Decimal
    year: int = field(init=False)

    def __post_init__(self) -> None:
        self.year = self.start_date.year


def _resolve_policy_version(db: Session, as_of: date) -> PolicyVersion:
    stmt = (
        select(PolicyVersion)
        .where(PolicyVersion.effective_from <= as_of)
        .where((PolicyVersion.effective_to.is_(None)) | (PolicyVersion.effective_to > as_of))
        .order_by(PolicyVersion.effective_from.desc())
    )
    version = db.execute(stmt).scalars().first()
    if version is None:
        raise ValueError("No active policy version found for the given date")
    return version


def build_validation_context(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    sessions: list[SessionInput],
    application_time: datetime,
) -> ValidationContext:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise ValueError("Employee not found")

    leave_type = db.get(LeaveType, leave_type_id)
    if leave_type is None:
        raise ValueError("Leave type not found")

    ordered = sorted(sessions, key=lambda s: s.date)
    start_date, end_date = ordered[0].date, ordered[-1].date

    policy_version = _resolve_policy_version(db, application_time.date())

    policy = db.execute(
        select(LeavePolicy).where(
            LeavePolicy.policy_version_id == policy_version.id,
            LeavePolicy.leave_type_id == leave_type_id,
        )
    ).scalars().first()
    if policy is None:
        raise ValueError("No leave policy configured for this leave type in the active policy version")

    balance = db.execute(
        select(EmployeeLeaveBalance).where(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type_id == leave_type_id,
            EmployeeLeaveBalance.year == start_date.year,
        )
    ).scalars().first()

    window_start = start_date - timedelta(days=LOOKAROUND_DAYS)
    window_end = end_date + timedelta(days=LOOKAROUND_DAYS)
    existing_sessions = db.execute(
        select(DayRequestSession).where(
            DayRequestSession.employee_id == employee_id,
            DayRequestSession.is_active.is_(True),
            DayRequestSession.session_date >= window_start,
            DayRequestSession.session_date <= window_end,
        )
    ).scalars().all()

    eligibility_rule = db.execute(
        select(LeaveTypeEligibilityRule).where(
            LeaveTypeEligibilityRule.policy_version_id == policy_version.id,
            LeaveTypeEligibilityRule.employment_status == employee.employment_status,
            LeaveTypeEligibilityRule.leave_type_id == leave_type_id,
        )
    ).scalars().first()

    restrictions = db.execute(
        select(LeaveTypeRestriction).where(
            LeaveTypeRestriction.policy_version_id == policy_version.id,
            (LeaveTypeRestriction.leave_type_a_id == leave_type_id)
            | (LeaveTypeRestriction.leave_type_b_id == leave_type_id),
        )
    ).scalars().all()

    holiday_rows = db.execute(
        select(Holiday.date).where(Holiday.year.in_({window_start.year, window_end.year}))
    ).scalars().all()
    holiday_dates = set(holiday_rows)

    optional_pick_count = db.execute(
        select(OptionalHolidayPick).where(
            OptionalHolidayPick.employee_id == employee_id,
            OptionalHolidayPick.year == start_date.year,
        )
    ).scalars().all()

    cap_row = db.get(EmployeeOptionalHolidayCap, employee_id)
    optional_pick_cap = Decimal(str(cap_row.annual_cap)) if cap_row else Decimal("6")

    working_sessions = ordered if leave_type.code == "OL" else filter_working_sessions(ordered, holiday_dates)

    return ValidationContext(
        db=db,
        employee=employee,
        leave_type=leave_type,
        policy_version=policy_version,
        policy=policy,
        balance=balance,
        requested_sessions=ordered,
        working_sessions=working_sessions,
        start_date=start_date,
        end_date=end_date,
        application_time=application_time,
        existing_active_sessions=list(existing_sessions),
        eligibility_rule=eligibility_rule,
        restrictions=list(restrictions),
        holiday_dates=holiday_dates,
        optional_pick_count=len(optional_pick_count),
        optional_pick_cap=optional_pick_cap,
    )
