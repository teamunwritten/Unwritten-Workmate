from datetime import date, time

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import EmploymentStatus, RecalculationMode, RestrictionAdjacency, YearEndBehavior, ZeroBalanceAction


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    version_label: Mapped[str] = mapped_column(String(120), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    recalculation_mode: Mapped[RecalculationMode] = mapped_column(
        Enum(RecalculationMode, native_enum=True), nullable=False, default=RecalculationMode.PROSPECTIVE_ONLY
    )
    created_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class LeavePolicy(Base):
    """Admin-configurable rule set. The validation engine reads every threshold from here."""

    __tablename__ = "leave_policies"
    __table_args__ = (UniqueConstraint("policy_version_id", "leave_type_id", name="uq_leave_policy_version_type"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    policy_version_id: Mapped[int] = mapped_column(ForeignKey("policy_versions.id"), nullable=False, index=True)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False, index=True)
    notice_buffer_trigger_days: Mapped[float | None] = mapped_column(Numeric(4, 1))
    notice_buffer_required_days: Mapped[int | None] = mapped_column(Integer)
    max_backdate_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    same_day_cutoff_time: Mapped[time | None] = mapped_column(Time)
    year_end_behavior: Mapped[YearEndBehavior] = mapped_column(
        Enum(YearEndBehavior, native_enum=True), nullable=False, default=YearEndBehavior.LAPSE_ALL
    )
    carry_forward_cap: Mapped[float | None] = mapped_column(Numeric(4, 1))
    zero_balance_action: Mapped[ZeroBalanceAction] = mapped_column(
        Enum(ZeroBalanceAction, native_enum=True), nullable=False, default=ZeroBalanceAction.BLOCK
    )
    sandwich_policy_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LeaveTypeEligibilityRule(Base):
    __tablename__ = "leave_type_eligibility_rules"
    __table_args__ = (
        UniqueConstraint("policy_version_id", "employment_status", "leave_type_id", name="uq_eligibility_rule"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    policy_version_id: Mapped[int] = mapped_column(ForeignKey("policy_versions.id"), nullable=False, index=True)
    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, native_enum=True), nullable=False)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False)
    is_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    requires_hr_admin_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class LeaveTypeRestriction(Base):
    """Adjacency block rules, e.g. block CL immediately after SL."""

    __tablename__ = "leave_type_restrictions"
    __table_args__ = (
        UniqueConstraint(
            "policy_version_id", "leave_type_a_id", "leave_type_b_id", "adjacency", name="uq_leave_type_restriction"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    policy_version_id: Mapped[int] = mapped_column(ForeignKey("policy_versions.id"), nullable=False, index=True)
    leave_type_a_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False)
    leave_type_b_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False)
    adjacency: Mapped[RestrictionAdjacency] = mapped_column(Enum(RestrictionAdjacency, native_enum=True), nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
