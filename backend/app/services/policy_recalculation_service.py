from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import RecalculationMode, YearEndBehavior
from app.models import EmployeeLeaveBalance, LeavePolicy, PolicyVersion
from app.services.audit_service import write_audit_entry


def recalculate_balances_for_version(db: Session, policy_version: PolicyVersion, actor_employee_id: int) -> None:
    """Retroactive recalculation stub.

    When `policy_version.recalculation_mode == RETROSPECTIVE_RECALC`, a real implementation would,
    for every employee/leave_type covered by this version:
      1. Re-run `accrual_service.compute_accrued_as_of()` for the version's `effective_from` date
         through today using the NEW thresholds, replacing `employee_leave_balances.accrued_days`.
      2. Re-evaluate any already-approved `leave_applications` whose `applied_at` falls inside the
         version's effective window against the new `leave_policies` thresholds (notice buffer,
         zero-balance action, etc.) and flag/re-audit any that would now resolve differently --
         without silently altering historical approvals.
      3. Write one `audit_log` entry per affected employee_leave_balance (before/after) plus a
         summary `POLICY_RETROSPECTIVE_RECALC` entry referencing the policy_version.
    This is intentionally not implemented for v1 -- `PROSPECTIVE_ONLY` (the default) requires no
    recalculation, since only future applications are evaluated against the new policy_version.
    """
    if policy_version.recalculation_mode != RecalculationMode.RETROSPECTIVE_RECALC:
        return
    write_audit_entry(
        db,
        entity_type="policy_version",
        entity_id=policy_version.id,
        action="POLICY_RETROSPECTIVE_RECALC_REQUESTED",
        actor_employee_id=actor_employee_id,
        reason_code="RECALCULATION_NOT_YET_IMPLEMENTED",
    )


def run_year_end_reset(db: Session, policy_version_id: int, year: int, actor_employee_id: int | None = None) -> int:
    """Applies each leave_type's configured `year_end_behavior` to every employee's balance for `year`.

    LAPSE_ALL: carried_forward_days reset to 0 for the new year.
    CARRY_FORWARD_CAPPED: unused days carried forward, capped at `carry_forward_cap`.
    CARRY_FORWARD_ALL: all unused days carried forward uncapped.
    Returns the number of balances affected. Every change is audit-logged with a system actor.
    """
    policies = db.execute(select(LeavePolicy).where(LeavePolicy.policy_version_id == policy_version_id)).scalars().all()
    affected = 0

    for policy in policies:
        balances = db.execute(
            select(EmployeeLeaveBalance).where(
                EmployeeLeaveBalance.leave_type_id == policy.leave_type_id,
                EmployeeLeaveBalance.year == year,
            )
        ).scalars().all()

        for balance in balances:
            remaining = float(balance.entitled_days) + float(balance.carried_forward_days) - float(balance.used_days)
            remaining = max(remaining, 0.0)

            if policy.year_end_behavior == YearEndBehavior.LAPSE_ALL:
                new_carry_forward = 0.0
            elif policy.year_end_behavior == YearEndBehavior.CARRY_FORWARD_CAPPED:
                cap = float(policy.carry_forward_cap) if policy.carry_forward_cap is not None else 0.0
                new_carry_forward = min(remaining, cap)
            else:  # CARRY_FORWARD_ALL
                new_carry_forward = remaining

            next_year_balance = db.execute(
                select(EmployeeLeaveBalance).where(
                    EmployeeLeaveBalance.employee_id == balance.employee_id,
                    EmployeeLeaveBalance.leave_type_id == balance.leave_type_id,
                    EmployeeLeaveBalance.year == year + 1,
                )
            ).scalars().first()
            if next_year_balance is None:
                continue

            before = {"carried_forward_days": float(next_year_balance.carried_forward_days)}
            next_year_balance.carried_forward_days = new_carry_forward
            affected += 1

            write_audit_entry(
                db,
                entity_type="employee_leave_balance",
                entity_id=next_year_balance.id,
                action="YEAR_END_RESET",
                actor_employee_id=actor_employee_id,
                before_value=before,
                after_value={"carried_forward_days": new_carry_forward},
                reason_code=policy.year_end_behavior.value,
            )

    return affected
