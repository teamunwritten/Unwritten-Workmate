from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_entry(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_employee_id: int | None,
    before_value: dict | None = None,
    after_value: dict | None = None,
    reason_code: str | None = None,
) -> AuditLog:
    """Adds (does not commit) an audit_log row. Caller controls the transaction boundary so this
    can be included atomically alongside the write it's documenting (e.g. a leave_application insert
    or a LOP auto-conversion)."""
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_employee_id=actor_employee_id,
        before_value=before_value,
        after_value=after_value,
        reason_code=reason_code,
    )
    db.add(entry)
    return entry
