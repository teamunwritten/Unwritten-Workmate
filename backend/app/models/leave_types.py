from sqlalchemy import Boolean, CheckConstraint, Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import AccrualMode


class LeaveType(Base):
    __tablename__ = "leave_types"
    __table_args__ = (CheckConstraint("default_annual_days >= 0", name="ck_leave_type_default_days_nonneg"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    default_annual_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    accrual_mode: Mapped[AccrualMode] = mapped_column(Enum(AccrualMode, native_enum=True), nullable=False, default=AccrualMode.UPFRONT)
    allow_lop_conversion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
