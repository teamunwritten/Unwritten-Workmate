from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums import EmployeeRole, EmploymentStatus


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    parent_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))

    employees: Mapped[list["Employee"]] = relationship(back_populates="department", foreign_keys="Employee.department_id")


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint(
            "notice_period_end IS NULL OR notice_period_start IS NULL OR notice_period_end >= notice_period_start",
            name="ck_employee_notice_period_range",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(190), unique=True, nullable=False)
    # Job title / designation shown throughout the UI in place of the internal RBAC role
    # (EMPLOYEE/MANAGER/HR_ADMIN), e.g. "Senior Software Engineer".
    position: Mapped[str | None] = mapped_column(String(150))
    # Google's stable per-user subject identifier, bound on first successful Google sign-in.
    # Matching happens by email (must equal the employee's real Google account email); google_sub
    # is stored afterward as a secondary integrity check, not the primary lookup key.
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True)
    # OAuth refresh token granting calendar.events access, captured during Google sign-in
    # (only present once the employee has consented to the calendar scope). Used to mint
    # short-lived access tokens on demand for auto-syncing approved leave to their calendar.
    google_calendar_refresh_token: Mapped[str | None] = mapped_column(String(512))
    # Profile photo URL from Google's id_token "picture" claim, refreshed on every login.
    google_picture_url: Mapped[str | None] = mapped_column(Text)
    # Contact details -- HR-managed, not sourced from Google.
    phone_number: Mapped[str | None] = mapped_column(String(30))
    personal_email: Mapped[str | None] = mapped_column(String(190))
    address: Mapped[str | None] = mapped_column(Text)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        Enum(EmploymentStatus, native_enum=True), nullable=False, default=EmploymentStatus.PROBATION
    )
    notice_period_start: Mapped[date | None] = mapped_column(Date)
    notice_period_end: Mapped[date | None] = mapped_column(Date)
    role: Mapped[EmployeeRole] = mapped_column(Enum(EmployeeRole, native_enum=True), nullable=False, default=EmployeeRole.EMPLOYEE)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    department: Mapped["Department"] = relationship(back_populates="employees", foreign_keys=[department_id])
    manager: Mapped["Employee | None"] = relationship(remote_side=[id], foreign_keys=[manager_id])
