from decimal import Decimal

from app.enums import CheckOutcome, EmploymentStatus, ZeroBalanceAction
from app.services.accrual_service import compute_available_balance
from app.services.validation_engine.context import ValidationContext
from app.services.validation_engine.results import CheckResult


def check_notice_buffer(ctx: ValidationContext) -> CheckResult:
    """Evaluates the TOTAL requested span (not per-day) against the configured trigger/required-notice pair."""
    trigger = ctx.policy.notice_buffer_trigger_days
    required = ctx.policy.notice_buffer_required_days
    if trigger is None or required is None:
        return CheckResult(check_name="check_notice_buffer", outcome=CheckOutcome.PASS)

    span_days = (ctx.end_date - ctx.start_date).days + 1
    notice_given_days = (ctx.start_date - ctx.application_time.date()).days

    if Decimal(span_days) > Decimal(str(trigger)) and notice_given_days < required:
        return CheckResult(
            check_name="check_notice_buffer",
            outcome=CheckOutcome.BLOCK,
            reason_code="NOTICE_BUFFER_NOT_MET",
            message=f"Leaves longer than {trigger} day(s) require {required} day(s) advance notice.",
            metadata={"span_days": span_days, "notice_given_days": notice_given_days, "required": required},
        )
    return CheckResult(check_name="check_notice_buffer", outcome=CheckOutcome.PASS)


def check_optional_holiday_quota(ctx: ValidationContext) -> CheckResult:
    if ctx.leave_type.code != "OL":
        return CheckResult(check_name="check_optional_holiday_quota", outcome=CheckOutcome.PASS)

    picks_after = ctx.optional_pick_count + len(ctx.requested_sessions)
    if Decimal(picks_after) > ctx.optional_pick_cap:
        return CheckResult(
            check_name="check_optional_holiday_quota",
            outcome=CheckOutcome.BLOCK,
            reason_code="OPTIONAL_HOLIDAY_QUOTA_EXCEEDED",
            message=f"Optional holiday cap of {ctx.optional_pick_cap} day(s)/year would be exceeded.",
            metadata={"current_picks": ctx.optional_pick_count, "cap": float(ctx.optional_pick_cap)},
        )
    return CheckResult(check_name="check_optional_holiday_quota", outcome=CheckOutcome.PASS)


def check_probation_notice_restriction(ctx: ValidationContext) -> CheckResult:
    if ctx.employee.employment_status not in (EmploymentStatus.PROBATION, EmploymentStatus.NOTICE_PERIOD):
        return CheckResult(check_name="check_probation_notice_restriction", outcome=CheckOutcome.PASS)

    rule = ctx.eligibility_rule
    if rule is None or not rule.is_allowed:
        return CheckResult(
            check_name="check_probation_notice_restriction",
            outcome=CheckOutcome.BLOCK,
            reason_code="LEAVE_TYPE_NOT_ALLOWED_FOR_STATUS",
            message=f"{ctx.leave_type.code} is not permitted while employment status is {ctx.employee.employment_status.value}.",
            metadata={"employment_status": ctx.employee.employment_status.value},
        )

    if rule.requires_hr_admin_approval:
        return CheckResult(
            check_name="check_probation_notice_restriction",
            outcome=CheckOutcome.PASS,
            metadata={"requires_hr_admin_approval": True},
        )
    return CheckResult(check_name="check_probation_notice_restriction", outcome=CheckOutcome.PASS)


def check_zero_balance(ctx: ValidationContext) -> CheckResult:
    available = compute_available_balance(ctx.employee, ctx.leave_type, ctx.balance, ctx.application_time.date())
    if available > 0:
        return CheckResult(check_name="check_zero_balance", outcome=CheckOutcome.PASS)

    outcome = (
        CheckOutcome.CONVERT_TO_LOP
        if ctx.policy.zero_balance_action == ZeroBalanceAction.CONVERT_TO_LOP and ctx.leave_type.allow_lop_conversion
        else CheckOutcome.BLOCK
    )
    return CheckResult(
        check_name="check_zero_balance",
        outcome=outcome,
        reason_code="ZERO_BALANCE",
        message=f"No {ctx.leave_type.code} balance remaining.",
        metadata={"available": float(available)},
    )


def check_backdate_limit(ctx: ValidationContext) -> CheckResult:
    application_date = ctx.application_time.date()
    if application_date <= ctx.start_date:
        return CheckResult(check_name="check_backdate_limit", outcome=CheckOutcome.PASS)

    days_late = (application_date - ctx.start_date).days
    if days_late > ctx.policy.max_backdate_days:
        return CheckResult(
            check_name="check_backdate_limit",
            outcome=CheckOutcome.BLOCK,
            reason_code="BACKDATE_LIMIT_EXCEEDED",
            message=f"Filed {days_late} day(s) after the leave date; the limit is {ctx.policy.max_backdate_days} day(s).",
            metadata={"days_late": days_late, "max_backdate_days": ctx.policy.max_backdate_days},
        )
    return CheckResult(check_name="check_backdate_limit", outcome=CheckOutcome.PASS)


def check_same_day_cutoff(ctx: ValidationContext) -> CheckResult:
    cutoff = ctx.policy.same_day_cutoff_time
    if cutoff is None or ctx.start_date != ctx.application_time.date():
        return CheckResult(check_name="check_same_day_cutoff", outcome=CheckOutcome.PASS)

    if ctx.application_time.time() > cutoff:
        return CheckResult(
            check_name="check_same_day_cutoff",
            outcome=CheckOutcome.BLOCK,
            reason_code="SAME_DAY_CUTOFF_EXCEEDED",
            message=f"Same-day requests must be filed before {cutoff.strftime('%H:%M')}.",
            metadata={"cutoff": cutoff.strftime("%H:%M")},
        )
    return CheckResult(check_name="check_same_day_cutoff", outcome=CheckOutcome.PASS)


CHECKS = [
    check_notice_buffer,
    check_optional_holiday_quota,
    check_probation_notice_restriction,
    check_zero_balance,
    check_backdate_limit,
    check_same_day_cutoff,
]
