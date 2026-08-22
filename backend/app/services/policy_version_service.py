from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LeavePolicy, PolicyVersion
from app.schemas.admin_policy import PolicyVersionCreate
from app.services.audit_service import write_audit_entry

FAR_FUTURE = date(9999, 12, 31)


def _ranges_overlap(a_start: date, a_end: date | None, b_start: date, b_end: date | None) -> bool:
    a_end = a_end or FAR_FUTURE
    b_end = b_end or FAR_FUTURE
    return a_start <= b_end and b_start <= a_end


def create_policy_version(db: Session, payload: PolicyVersionCreate, created_by_employee_id: int) -> PolicyVersion:
    """MySQL has no EXCLUDE-constraint equivalent for range non-overlap, so this locks the
    candidate row set (scoped to the indexed `effective_from` column) with SELECT ... FOR UPDATE,
    checks overlap in Python, then inserts -- all within the caller's request-scoped transaction.
    """
    candidate_end = payload.effective_to or FAR_FUTURE
    locked_versions = db.execute(
        select(PolicyVersion).where(PolicyVersion.effective_from <= candidate_end).with_for_update()
    ).scalars().all()

    for existing in locked_versions:
        if _ranges_overlap(payload.effective_from, payload.effective_to, existing.effective_from, existing.effective_to):
            raise ValueError(f"Policy version date range overlaps existing version '{existing.version_label}'")

    new_version = PolicyVersion(
        version_label=payload.version_label,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        recalculation_mode=payload.recalculation_mode,
        created_by_employee_id=created_by_employee_id,
        notes=payload.notes,
    )
    db.add(new_version)
    db.flush()

    if payload.clone_from_version_id:
        source_policies = db.execute(
            select(LeavePolicy).where(LeavePolicy.policy_version_id == payload.clone_from_version_id)
        ).scalars().all()
        for src in source_policies:
            db.add(
                LeavePolicy(
                    policy_version_id=new_version.id,
                    leave_type_id=src.leave_type_id,
                    notice_buffer_trigger_days=src.notice_buffer_trigger_days,
                    notice_buffer_required_days=src.notice_buffer_required_days,
                    max_backdate_days=src.max_backdate_days,
                    same_day_cutoff_time=src.same_day_cutoff_time,
                    year_end_behavior=src.year_end_behavior,
                    carry_forward_cap=src.carry_forward_cap,
                    zero_balance_action=src.zero_balance_action,
                    sandwich_policy_enabled=src.sandwich_policy_enabled,
                )
            )

    write_audit_entry(
        db,
        entity_type="policy_version",
        entity_id=new_version.id,
        action="POLICY_VERSION_CREATED",
        actor_employee_id=created_by_employee_id,
        after_value={
            "version_label": new_version.version_label,
            "effective_from": str(new_version.effective_from),
            "effective_to": str(new_version.effective_to) if new_version.effective_to else None,
            "recalculation_mode": new_version.recalculation_mode.value,
        },
    )
    return new_version
