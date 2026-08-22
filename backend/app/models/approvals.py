from datetime import date, datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import ApprovalActionType


class ApprovalDelegation(Base):
    """Date-ranged proxy approver, e.g. auto-delegate when the manager is themselves on leave.

    MySQL has no EXCLUDE-constraint equivalent, so non-overlap for a given manager is enforced
    by delegation_service.py via SELECT ... FOR UPDATE (scoped to manager_employee_id, which is
    indexed) + a Python interval-overlap check inside one transaction.
    """

    __tablename__ = "approval_delegations"
    __table_args__ = (CheckConstraint("end_date >= start_date", name="ck_delegation_date_range"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    manager_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    delegate_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(nullable=False)
    end_date: Mapped[date] = mapped_column(nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)


class ApprovalAction(Base):
    __tablename__ = "approval_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    leave_application_id: Mapped[int] = mapped_column(ForeignKey("leave_applications.id"), nullable=False, index=True)
    actor_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    action: Mapped[ApprovalActionType] = mapped_column(Enum(ApprovalActionType, native_enum=True), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    acted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
