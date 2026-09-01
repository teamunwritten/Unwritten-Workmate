from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import CalculationType, ComponentType, PayrollRunEntryStatus, PayrollRunStatus, PayslipDesign, PayslipStatus


class SalaryComponent(Base):
    __tablename__ = "salary_components"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    component_type: Mapped[ComponentType] = mapped_column(Enum(ComponentType, native_enum=True), nullable=False)
    calculation_type: Mapped[CalculationType] = mapped_column(Enum(CalculationType, native_enum=True), nullable=False)
    percentage_of_basic: Mapped[float | None] = mapped_column(Numeric(5, 2))
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SalaryStructureComponent(Base):
    __tablename__ = "salary_structure_components"
    __table_args__ = (UniqueConstraint("salary_structure_id", "salary_component_id", name="uq_structure_component"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False, index=True)
    salary_component_id: Mapped[int] = mapped_column(ForeignKey("salary_components.id"), nullable=False)
    default_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class EmployeeSalaryAssignment(Base):
    __tablename__ = "employee_salary_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    annual_ctc: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class EmployeeSalaryComponentValue(Base):
    __tablename__ = "employee_salary_component_values"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_salary_assignment_id: Mapped[int] = mapped_column(
        ForeignKey("employee_salary_assignments.id"), nullable=False, index=True
    )
    salary_component_id: Mapped[int] = mapped_column(ForeignKey("salary_components.id"), nullable=False)
    resolved_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)


class PayrollRun(Base):
    __tablename__ = "payroll_runs"
    __table_args__ = (UniqueConstraint("period_month", "period_year", name="uq_payroll_run_period"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PayrollRunStatus] = mapped_column(
        Enum(PayrollRunStatus, native_enum=True), nullable=False, default=PayrollRunStatus.DRAFT
    )
    run_date: Mapped[date | None] = mapped_column(Date)
    created_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PayrollRunEntry(Base):
    __tablename__ = "payroll_run_entries"
    __table_args__ = (UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_run_entry_employee"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    payroll_run_id: Mapped[int] = mapped_column(ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    salary_structure_id: Mapped[int | None] = mapped_column(ForeignKey("salary_structures.id"))
    status: Mapped[PayrollRunEntryStatus] = mapped_column(
        Enum(PayrollRunEntryStatus, native_enum=True), nullable=False, default=PayrollRunEntryStatus.PENDING
    )
    gross_amount: Mapped[float | None] = mapped_column(Numeric(14, 2))


class PayslipTemplate(Base):
    __tablename__ = "payslip_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    design: Mapped[PayslipDesign] = mapped_column(Enum(PayslipDesign, native_enum=True), nullable=False, default=PayslipDesign.CLASSIC)
    header_config: Mapped[dict | None] = mapped_column(JSON)
    footer_note: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    payroll_run_entry_id: Mapped[int] = mapped_column(ForeignKey("payroll_run_entries.id"), unique=True, nullable=False)
    payslip_template_id: Mapped[int] = mapped_column(ForeignKey("payslip_templates.id"), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    gross_pay: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    net_pay: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    line_items: Mapped[list] = mapped_column(JSON, nullable=False)
    status: Mapped[PayslipStatus] = mapped_column(Enum(PayslipStatus, native_enum=True), nullable=False, default=PayslipStatus.DRAFT)
    approved_by_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
