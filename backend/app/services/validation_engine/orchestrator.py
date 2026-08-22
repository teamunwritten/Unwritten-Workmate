from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.enums import CheckOutcome
from app.schemas.leave import SessionInput
from app.services.validation_engine import stage1_dates_accrual, stage2_policy_boundary, stage3_overlap_conflict
from app.services.validation_engine.context import ValidationContext, build_validation_context
from app.services.validation_engine.results import CheckResult, ValidationDecision
from app.services.validation_engine.stage1_dates_accrual import _requested_total_days

ALL_STAGE_CHECKS = [
    *stage1_dates_accrual.CHECKS,
    *stage2_policy_boundary.CHECKS,
    *stage3_overlap_conflict.CHECKS,
]


def validate_leave_application(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    sessions: list[SessionInput],
    reason: str | None,
    application_time: datetime,
) -> ValidationDecision:
    ctx = build_validation_context(db, employee_id, leave_type_id, sessions, application_time)

    # Every check always runs to completion (no short-circuit) so the caller gets a full
    # diagnostic list of every violation at once, not just the first one encountered.
    results: list[CheckResult] = [check(ctx) for check in ALL_STAGE_CHECKS]

    return _aggregate_decision(ctx, results)


def _aggregate_decision(ctx: ValidationContext, results: list[CheckResult]) -> ValidationDecision:
    block_results = [r for r in results if r.outcome == CheckOutcome.BLOCK]
    convert_results = [r for r in results if r.outcome == CheckOutcome.CONVERT_TO_LOP]

    sandwich_days = Decimal("0")
    for r in results:
        if r.check_name == "check_sandwich_policy":
            sandwich_days = Decimal(str(r.metadata.get("sandwich_days_added", 0)))

    requested_days = _requested_total_days(ctx)
    requires_hr_admin_approval = any(r.metadata.get("requires_hr_admin_approval") for r in results)

    if block_results:
        return ValidationDecision(
            outcome=CheckOutcome.BLOCK,
            results=results,
            is_lop=False,
            total_deducted_days=Decimal("0"),
            sandwich_days_added=Decimal("0"),
            policy_version_id=ctx.policy_version.id,
            working_sessions=[],
            requires_hr_admin_approval=requires_hr_admin_approval,
        )

    if convert_results:
        return ValidationDecision(
            outcome=CheckOutcome.CONVERT_TO_LOP,
            results=results,
            is_lop=True,
            total_deducted_days=requested_days + sandwich_days,
            sandwich_days_added=sandwich_days,
            policy_version_id=ctx.policy_version.id,
            working_sessions=ctx.working_sessions,
            requires_hr_admin_approval=requires_hr_admin_approval,
        )

    return ValidationDecision(
        outcome=CheckOutcome.PASS,
        results=results,
        is_lop=False,
        total_deducted_days=requested_days + sandwich_days,
        sandwich_days_added=sandwich_days,
        policy_version_id=ctx.policy_version.id,
        working_sessions=ctx.working_sessions,
        requires_hr_admin_approval=requires_hr_admin_approval,
    )
