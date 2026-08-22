from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ApprovalDelegation


def _ranges_overlap(a_start: date, a_end: date, b_start: date, b_end: date) -> bool:
    return a_start <= b_end and b_start <= a_end


def create_delegation(
    db: Session,
    manager_employee_id: int,
    delegate_employee_id: int,
    start_date: date,
    end_date: date,
    reason: str | None = None,
) -> ApprovalDelegation:
    """Locks the manager's existing delegation rows (scoped to the indexed manager_employee_id
    column) before inserting, to prevent overlapping delegation windows -- MySQL's equivalent of
    the Postgres EXCLUDE USING gist constraint, enforced at the service layer."""
    locked = db.execute(
        select(ApprovalDelegation)
        .where(ApprovalDelegation.manager_employee_id == manager_employee_id)
        .with_for_update()
    ).scalars().all()

    for existing in locked:
        if _ranges_overlap(start_date, end_date, existing.start_date, existing.end_date):
            raise ValueError("Delegation date range overlaps an existing delegation for this manager")

    delegation = ApprovalDelegation(
        manager_employee_id=manager_employee_id,
        delegate_employee_id=delegate_employee_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
    )
    db.add(delegation)
    db.flush()
    return delegation


def find_active_delegate(db: Session, manager_employee_id: int, on_date: date) -> int | None:
    delegation = db.execute(
        select(ApprovalDelegation).where(
            ApprovalDelegation.manager_employee_id == manager_employee_id,
            ApprovalDelegation.start_date <= on_date,
            ApprovalDelegation.end_date >= on_date,
        )
    ).scalars().first()
    return delegation.delegate_employee_id if delegation else None


def manager_is_on_leave(db: Session, manager_employee_id: int, on_date: date) -> bool:
    from app.models import DayRequestSession

    return (
        db.execute(
            select(DayRequestSession).where(
                DayRequestSession.employee_id == manager_employee_id,
                DayRequestSession.session_date == on_date,
                DayRequestSession.is_active.is_(True),
            )
        ).scalars().first()
        is not None
    )
