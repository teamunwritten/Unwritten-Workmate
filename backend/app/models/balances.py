from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmployeeLeaveBalance(Base):
    __tablename__ = "employee_leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_employee_leave_balance"),
        CheckConstraint("entitled_days >= 0", name="ck_balance_entitled_nonneg"),
        CheckConstraint("accrued_days >= 0", name="ck_balance_accrued_nonneg"),
        CheckConstraint("used_days >= 0", name="ck_balance_used_nonneg"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    entitled_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    accrued_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    used_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    carried_forward_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    custom_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class BalanceAdjustment(Base):
    __tablename__ = "balance_adjustments"
    __table_args__ = (CheckConstraint("CHAR_LENGTH(TRIM(comment)) > 0", name="ck_balance_adjustment_comment_nonempty"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_leave_balance_id: Mapped[int] = mapped_column(ForeignKey("employee_leave_balances.id"), nullable=False, index=True)
    adjusted_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    delta_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
