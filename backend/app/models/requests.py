import uuid
from datetime import date, datetime

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    Computed,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums import DayRequestStatus, RequestKind, ResolutionType, SessionType


class DayRequest(Base):
    """Unified header for LEAVE / WFH / OD requests, enabling one collision-detection query shape."""

    __tablename__ = "day_requests"
    __table_args__ = (CheckConstraint("end_date >= start_date", name="ck_day_request_date_range"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    request_kind: Mapped[RequestKind] = mapped_column(Enum(RequestKind, native_enum=True), nullable=False)
    start_date: Mapped[date] = mapped_column(nullable=False)
    end_date: Mapped[date] = mapped_column(nullable=False)
    status: Mapped[DayRequestStatus] = mapped_column(
        Enum(DayRequestStatus, native_enum=True), nullable=False, default=DayRequestStatus.PENDING
    )
    calendar_uid: Mapped[str] = mapped_column(CHAR(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    sessions: Mapped[list["DayRequestSession"]] = relationship(back_populates="day_request", cascade="all, delete-orphan")
    leave_application: Mapped["LeaveApplication | None"] = relationship(back_populates="day_request", uselist=False)


class DayRequestSession(Base):
    """One row per (date, session) — the unit collision/overlap checks operate on.

    `employee_id` is denormalized from the parent `day_requests` row (immutable after insert)
    so a real DB constraint can be expressed here. `is_active` mirrors the parent's status and
    is kept in sync on every status transition; combined with the generated `active_key` column
    this gives a MySQL-native equivalent of a Postgres partial unique index (NULLs are never
    considered duplicates), backstopping the `SELECT ... FOR UPDATE` guard in day_request_service.
    """

    __tablename__ = "day_request_sessions"
    __table_args__ = (
        CheckConstraint("day_value IN (0.5, 1.0)", name="ck_session_day_value"),
        UniqueConstraint("employee_id", "session_date", "session", "active_key", name="uq_session_active_slot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    day_request_id: Mapped[int] = mapped_column(ForeignKey("day_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    session_date: Mapped[date] = mapped_column(nullable=False, index=True)
    session: Mapped[SessionType] = mapped_column(Enum(SessionType, native_enum=True), nullable=False)
    day_value: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    # Generated column: 'Y' while active, NULL once cancelled/rejected -> NULLs never collide in the unique index.
    active_key: Mapped[str | None] = mapped_column(
        String(1), Computed("IF(is_active, 'Y', NULL)", persisted=True)
    )

    day_request: Mapped["DayRequest"] = relationship(back_populates="sessions")


class LeaveApplication(Base):
    __tablename__ = "leave_applications"
    __table_args__ = (CheckConstraint("applied_days > 0", name="ck_leave_application_applied_days_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    day_request_id: Mapped[int] = mapped_column(ForeignKey("day_requests.id", ondelete="CASCADE"), unique=True, nullable=False)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False, index=True)
    applied_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    sandwich_days_added: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0)
    total_deducted_days: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)
    is_lop: Mapped[bool] = mapped_column(default=False, nullable=False)
    resolution_type: Mapped[ResolutionType] = mapped_column(
        Enum(ResolutionType, native_enum=True), nullable=False, default=ResolutionType.PENDING_APPROVAL
    )
    reason: Mapped[str | None] = mapped_column(Text)
    applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    policy_version_id: Mapped[int] = mapped_column(ForeignKey("policy_versions.id"), nullable=False)
    approver_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    # 1 = awaiting the direct-manager (or delegate) decision; 2 = manager approved and this has
    # been escalated to the nearest HR_ADMIN ancestor for final sign-off (only when org_settings
    # .requires_second_level_approval is on -- see approval_service.record_approval_action).
    pending_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Set once the approved leave has been pushed to the employee's Google Calendar, so it can
    # be found again and deleted if the leave is later cancelled.
    google_calendar_event_id: Mapped[str | None] = mapped_column(String(255))

    day_request: Mapped["DayRequest"] = relationship(back_populates="leave_application")
