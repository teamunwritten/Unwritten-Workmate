from decimal import Decimal

from app.enums import CheckOutcome, SessionType
from app.services.accrual_service import compute_available_balance
from app.services.validation_engine.context import ValidationContext
from app.services.validation_engine.results import CheckResult


def _requested_total_days(ctx: ValidationContext) -> Decimal:
    """Sums only working_sessions (weekends/holidays already excluded) -- a leave request that
    happens to span a weekend must not deduct balance for the weekend itself."""
    total = Decimal("0")
    for s in ctx.working_sessions:
        total += Decimal("1.0") if s.session == SessionType.FULL_DAY else Decimal("0.5")
    return total


def check_at_least_one_working_day(ctx: ValidationContext) -> CheckResult:
    if not ctx.working_sessions:
        return CheckResult(
            check_name="check_at_least_one_working_day",
            outcome=CheckOutcome.BLOCK,
            reason_code="NO_WORKING_DAYS_SELECTED",
            message="The selected date(s) fall entirely on weekends or holidays -- there are no working days to apply leave for.",
        )
    return CheckResult(check_name="check_at_least_one_working_day", outcome=CheckOutcome.PASS)


def check_balance_as_of_application_date(ctx: ValidationContext) -> CheckResult:
    requested = _requested_total_days(ctx)
    available = compute_available_balance(ctx.employee, ctx.leave_type, ctx.balance, ctx.application_time.date())

    if available <= 0:
        # Exactly-zero (or negative/over-drawn) balance is handled by check_zero_balance in stage 2,
        # which resolves BLOCK vs CONVERT_TO_LOP per the admin-configured zero_balance_action.
        return CheckResult(check_name="check_balance_as_of_application_date", outcome=CheckOutcome.PASS)

    if requested > available:
        return CheckResult(
            check_name="check_balance_as_of_application_date",
            outcome=CheckOutcome.BLOCK,
            reason_code="INSUFFICIENT_ACCRUED_BALANCE",
            message=f"Requested {requested} day(s) but only {available} day(s) are accrued/available as of the application date.",
            metadata={"requested": float(requested), "available": float(available)},
        )
    return CheckResult(check_name="check_balance_as_of_application_date", outcome=CheckOutcome.PASS)


def check_half_day_session_alignment(ctx: ValidationContext) -> CheckResult:
    """Reject internally-inconsistent requests (e.g. FIRST_HALF listed twice for the same date,
    or FULL_DAY combined with a half-session on the same date). Does NOT check against other
    existing requests -- that's stage 3's job (check_wfh_od_leave_collision)."""
    seen: dict = {}
    for s in ctx.requested_sessions:
        existing = seen.get(s.date)
        if existing is None:
            seen[s.date] = {s.session}
            continue
        if SessionType.FULL_DAY in existing or s.session == SessionType.FULL_DAY or s.session in existing:
            return CheckResult(
                check_name="check_half_day_session_alignment",
                outcome=CheckOutcome.BLOCK,
                reason_code="SESSION_CONFLICT",
                message=f"Conflicting sessions requested for {s.date}.",
                metadata={"date": str(s.date)},
            )
        existing.add(s.session)

    return CheckResult(check_name="check_half_day_session_alignment", outcome=CheckOutcome.PASS)


CHECKS = [check_at_least_one_working_day, check_balance_as_of_application_date, check_half_day_session_alignment]
