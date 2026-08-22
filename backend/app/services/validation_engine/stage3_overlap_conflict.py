from datetime import date, timedelta

from sqlalchemy import select

from app.enums import CheckOutcome, RestrictionAdjacency, SessionType
from app.models import DayRequest, DayRequestSession, LeaveApplication
from app.services.validation_engine.context import ValidationContext
from app.services.validation_engine.results import CheckResult

MAX_SANDWICH_LOOKAROUND = 10


def check_wfh_od_leave_collision(ctx: ValidationContext) -> CheckResult:
    """Row-locks the candidate slots and checks them against already-active sessions.

    The actual row lock (SELECT ... FOR UPDATE) happens in day_request_service.py at write
    time, scoped to the indexed (employee_id, session_date) columns; this check re-validates
    against the context's already-loaded active-session window for a fast pre-check.
    """
    existing_by_slot = {(s.session_date, s.session) for s in ctx.existing_active_sessions}
    existing_full_day_dates = {s.session_date for s in ctx.existing_active_sessions if s.session == SessionType.FULL_DAY}
    existing_dates = {s.session_date for s in ctx.existing_active_sessions}

    # Weekends/holidays never become actual sessions (see working_sessions), so there's nothing
    # to collide with there -- only check the days that will actually be booked.
    for requested in ctx.working_sessions:
        if requested.date in existing_full_day_dates:
            return _collision_result(requested.date)
        if requested.session == SessionType.FULL_DAY and requested.date in existing_dates:
            return _collision_result(requested.date)
        if (requested.date, requested.session) in existing_by_slot:
            return _collision_result(requested.date)

    return CheckResult(check_name="check_wfh_od_leave_collision", outcome=CheckOutcome.PASS)


def _collision_result(collision_date: date) -> CheckResult:
    return CheckResult(
        check_name="check_wfh_od_leave_collision",
        outcome=CheckOutcome.BLOCK,
        reason_code="SESSION_ALREADY_BOOKED",
        message=f"An active WFH/OD/Leave request already exists for {collision_date}.",
        metadata={"date": str(collision_date)},
    )


def _is_non_working_day(d: date, ctx: ValidationContext) -> bool:
    return d.weekday() >= 5 or d in ctx.holiday_dates


def _employee_has_active_leave_on(ctx: ValidationContext, d: date) -> bool:
    return any(s.session_date == d for s in ctx.existing_active_sessions)


def _internal_sandwich_days(ctx: ValidationContext) -> int:
    """Weekend/holiday days strictly between two selected working days within THIS SAME request
    -- e.g. a single Friday-to-Monday drag-select. working_sessions already excludes the
    weekend itself from deduction; this is what adds it back when sandwich policy is on."""
    working_dates = sorted({s.date for s in ctx.working_sessions})
    gap_days = 0
    for prev, nxt in zip(working_dates, working_dates[1:]):
        gap = (nxt - prev).days - 1
        if gap <= 0:
            continue
        between = [prev + timedelta(days=i) for i in range(1, gap + 1)]
        if all(_is_non_working_day(d, ctx) for d in between):
            gap_days += len(between)
    return gap_days


def check_sandwich_policy(ctx: ValidationContext) -> CheckResult:
    """Non-blocking: annotates `sandwich_days_added` when the leave brackets a weekend/holiday
    on both sides -- either within this single request (e.g. Fri+Mon selected together) or via
    an adjacent existing request (e.g. Friday applied separately from Monday). Explicitly
    inspects the actual preceding/succeeding calendar days (holidays table + weekend) rather
    than assuming only Sat/Sun are non-working."""
    if not ctx.policy.sandwich_policy_enabled:
        return CheckResult(check_name="check_sandwich_policy", outcome=CheckOutcome.PASS, metadata={"sandwich_days_added": 0})

    sandwich_days = _internal_sandwich_days(ctx)

    cursor = ctx.end_date + timedelta(days=1)
    trailing = []
    for _ in range(MAX_SANDWICH_LOOKAROUND):
        if not _is_non_working_day(cursor, ctx):
            break
        trailing.append(cursor)
        cursor += timedelta(days=1)
    if trailing and _employee_has_active_leave_on(ctx, cursor):
        sandwich_days += len(trailing)

    cursor = ctx.start_date - timedelta(days=1)
    leading = []
    for _ in range(MAX_SANDWICH_LOOKAROUND):
        if not _is_non_working_day(cursor, ctx):
            break
        leading.append(cursor)
        cursor -= timedelta(days=1)
    if leading and _employee_has_active_leave_on(ctx, cursor):
        sandwich_days += len(leading)

    return CheckResult(
        check_name="check_sandwich_policy",
        outcome=CheckOutcome.PASS,
        metadata={"sandwich_days_added": sandwich_days},
    )


def _adjacent_leave_type_id(ctx: ValidationContext, d: date) -> int | None:
    row = ctx.db.execute(
        select(LeaveApplication.leave_type_id)
        .join(DayRequest, DayRequest.id == LeaveApplication.day_request_id)
        .join(DayRequestSession, DayRequestSession.day_request_id == DayRequest.id)
        .where(
            DayRequestSession.employee_id == ctx.employee.id,
            DayRequestSession.session_date == d,
            DayRequestSession.is_active.is_(True),
        )
    ).scalars().first()
    return row


def check_restricted_leave_combination(ctx: ValidationContext) -> CheckResult:
    if not ctx.restrictions:
        return CheckResult(check_name="check_restricted_leave_combination", outcome=CheckOutcome.PASS)

    day_before = ctx.start_date - timedelta(days=1)
    day_after = ctx.end_date + timedelta(days=1)
    before_type_id = _adjacent_leave_type_id(ctx, day_before)
    after_type_id = _adjacent_leave_type_id(ctx, day_after)

    for rule in ctx.restrictions:
        if not rule.is_blocked:
            continue
        if rule.adjacency == RestrictionAdjacency.IMMEDIATELY_AFTER:
            # current leave_type_b immediately after leave_type_a
            if rule.leave_type_b_id == ctx.leave_type.id and rule.leave_type_a_id == before_type_id:
                return _restriction_blocked(rule.leave_type_a_id, ctx.leave_type.id)
        elif rule.adjacency == RestrictionAdjacency.IMMEDIATELY_BEFORE:
            if rule.leave_type_a_id == ctx.leave_type.id and rule.leave_type_b_id == after_type_id:
                return _restriction_blocked(ctx.leave_type.id, rule.leave_type_b_id)
        elif rule.adjacency == RestrictionAdjacency.SAME_DAY:
            continue  # same-day combination handled by check_wfh_od_leave_collision

    return CheckResult(check_name="check_restricted_leave_combination", outcome=CheckOutcome.PASS)


def _restriction_blocked(type_a_id: int, type_b_id: int) -> CheckResult:
    return CheckResult(
        check_name="check_restricted_leave_combination",
        outcome=CheckOutcome.BLOCK,
        reason_code="RESTRICTED_LEAVE_COMBINATION",
        message="This leave type combination is blocked by an admin-configured restriction rule.",
        metadata={"leave_type_a_id": type_a_id, "leave_type_b_id": type_b_id},
    )


CHECKS = [check_wfh_od_leave_collision, check_sandwich_policy, check_restricted_leave_combination]
