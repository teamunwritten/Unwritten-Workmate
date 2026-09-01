from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import CalculationType, ComponentType, EmployeeRole, PayrollRunEntryStatus
from app.models import (
    Employee,
    EmployeeSalaryAssignment,
    EmployeeSalaryComponentValue,
    Payslip,
    PayslipTemplate,
    PayrollRun,
    PayrollRunEntry,
    SalaryComponent,
    SalaryStructureComponent,
)


def resolve_assignment_components(db: Session, assignment: EmployeeSalaryAssignment) -> list[EmployeeSalaryComponentValue]:
    """Resolves every still-active component on the assignment's structure against its
    annual_ctc and stores the result as EmployeeSalaryComponentValue rows -- percentage-of-basic
    components resolve against the FIXED component coded "BASIC" on the same structure (falling
    back to 0 if none is configured). A component deactivated after being added to a structure is
    skipped here, so it stops being included in any assignment resolved from this point on --
    existing employees' already-resolved values are untouched (this is a point-in-time snapshot,
    not a live formula, so past payslips stay historically accurate). Adds (does not commit) the
    rows and returns them."""
    structure_components = db.execute(
        select(SalaryStructureComponent, SalaryComponent)
        .join(SalaryComponent, SalaryStructureComponent.salary_component_id == SalaryComponent.id)
        .where(
            SalaryStructureComponent.salary_structure_id == assignment.salary_structure_id,
            SalaryComponent.is_active.is_(True),
        )
    ).all()

    basic_value = 0.0
    for structure_component, component in structure_components:
        if component.code == "BASIC" and structure_component.default_value is not None:
            basic_value = float(structure_component.default_value)
            break

    resolved: list[EmployeeSalaryComponentValue] = []
    for structure_component, component in structure_components:
        if component.calculation_type == CalculationType.PERCENTAGE_OF_BASIC:
            percentage = float(component.percentage_of_basic or 0)
            value = basic_value * percentage / 100
        else:
            value = float(structure_component.default_value or 0)

        row = EmployeeSalaryComponentValue(
            employee_salary_assignment_id=assignment.id,
            salary_component_id=component.id,
            resolved_value=value,
        )
        db.add(row)
        resolved.append(row)

    return resolved


def compute_gross_amount(component_values: list[EmployeeSalaryComponentValue], components_by_id: dict[int, SalaryComponent]) -> float:
    """True gross pay -- sum of EARNING components only. Use compute_net_amount for gross minus
    deductions."""
    gross = 0.0
    for value in component_values:
        component = components_by_id.get(value.salary_component_id)
        if component is not None and component.component_type == ComponentType.EARNING:
            gross += float(value.resolved_value)
    return gross


def compute_net_amount(component_values: list[EmployeeSalaryComponentValue], components_by_id: dict[int, SalaryComponent]) -> float:
    """Net = sum of EARNING components minus sum of DEDUCTION components. No tax/statutory logic
    yet -- this only reflects what's configured on the structure itself."""
    net = 0.0
    for value in component_values:
        component = components_by_id.get(value.salary_component_id)
        if component is None:
            continue
        amount = float(value.resolved_value)
        net += amount if component.component_type == ComponentType.EARNING else -amount
    return net


def build_payslip_line_items(
    component_values: list[EmployeeSalaryComponentValue], components_by_id: dict[int, SalaryComponent]
) -> list[dict]:
    items = []
    for value in component_values:
        component = components_by_id.get(value.salary_component_id)
        if component is None:
            continue
        items.append(
            {
                "component_code": component.code,
                "component_name": component.name,
                "component_type": component.component_type.value,
                "value": float(value.resolved_value),
            }
        )
    return items


def get_active_assignment(db: Session, employee_id: int) -> EmployeeSalaryAssignment | None:
    return db.execute(
        select(EmployeeSalaryAssignment).where(
            EmployeeSalaryAssignment.employee_id == employee_id,
            EmployeeSalaryAssignment.is_active.is_(True),
        )
    ).scalars().first()


def get_resolved_component_values(db: Session, assignment_id: int) -> list[EmployeeSalaryComponentValue]:
    return db.execute(
        select(EmployeeSalaryComponentValue).where(
            EmployeeSalaryComponentValue.employee_salary_assignment_id == assignment_id
        )
    ).scalars().all()


def create_run_with_entries(db: Session, period_month: int, period_year: int, created_by_employee_id: int) -> PayrollRun:
    """Shared by the manual "New payroll run" endpoint and the month-end auto-generate job --
    creates the run and snapshots every actively-assigned employee into it. Caller commits."""
    run = PayrollRun(period_month=period_month, period_year=period_year, created_by_employee_id=created_by_employee_id)
    db.add(run)
    db.flush()

    employees = db.execute(select(Employee).where(Employee.is_active.is_(True))).scalars().all()
    components_by_id = {c.id: c for c in db.execute(select(SalaryComponent)).scalars().all()}
    for employee in employees:
        assignment = get_active_assignment(db, employee.id)
        if assignment is None:
            continue
        values = get_resolved_component_values(db, assignment.id)
        entry = PayrollRunEntry(
            payroll_run_id=run.id,
            employee_id=employee.id,
            salary_structure_id=assignment.salary_structure_id,
            status=PayrollRunEntryStatus.INCLUDED,
            gross_amount=compute_gross_amount(values, components_by_id),
        )
        db.add(entry)

    return run


def generate_payslips_for_run(db: Session, run: PayrollRun, template: PayslipTemplate) -> list[Payslip]:
    """Creates a DRAFT payslip for every INCLUDED entry in the run that doesn't already have
    one. Caller commits. Payslips stay invisible to employees and unsent until an admin approves
    them (see approve_payslip / bulk-approve in routers/payroll.py)."""
    entries = db.execute(
        select(PayrollRunEntry).where(
            PayrollRunEntry.payroll_run_id == run.id, PayrollRunEntry.status == PayrollRunEntryStatus.INCLUDED
        )
    ).scalars().all()
    components_by_id = {c.id: c for c in db.execute(select(SalaryComponent)).scalars().all()}

    created: list[Payslip] = []
    for entry in entries:
        if db.execute(select(Payslip).where(Payslip.payroll_run_entry_id == entry.id)).scalars().first():
            continue
        assignment = get_active_assignment(db, entry.employee_id)
        values = get_resolved_component_values(db, assignment.id) if assignment else []
        line_items = build_payslip_line_items(values, components_by_id)
        payslip = Payslip(
            payroll_run_entry_id=entry.id,
            payslip_template_id=template.id,
            gross_pay=compute_gross_amount(values, components_by_id),
            net_pay=compute_net_amount(values, components_by_id),
            line_items=line_items,
        )
        db.add(payslip)
        created.append(payslip)
    return created


@dataclass
class AutoGenerateResult:
    run: PayrollRun | None
    run_created: bool
    payslips_generated: int
    skipped_reason: str | None


def run_auto_generate(db: Session, period_month: int, period_year: int) -> AutoGenerateResult:
    """Idempotent: safe to call more than once for the same period -- reuses the existing run and
    only creates payslips that don't already exist. Used by both the ops-facing
    POST /payroll/runs/auto-generate endpoint and the in-process month-end scheduler
    (app/services/scheduler.py), so "automatic" and "manually triggered" go through one code path."""
    existing = db.execute(
        select(PayrollRun).where(PayrollRun.period_month == period_month, PayrollRun.period_year == period_year)
    ).scalars().first()

    run_created = False
    if existing is None:
        # No human triggered this run, but created_by_employee_id is NOT NULL -- attribute it to
        # whichever HR_ADMIN was seeded/created first.
        admin = db.execute(select(Employee).where(Employee.role == EmployeeRole.HR_ADMIN)).scalars().first()
        if admin is None:
            return AutoGenerateResult(run=None, run_created=False, payslips_generated=0, skipped_reason="No HR admin exists to attribute the run to.")
        run = create_run_with_entries(db, period_month, period_year, admin.id)
        db.flush()
        run_created = True
    else:
        run = existing

    template = db.execute(select(PayslipTemplate).where(PayslipTemplate.is_default.is_(True))).scalars().first()
    if template is None:
        db.commit()
        db.refresh(run)
        return AutoGenerateResult(
            run=run,
            run_created=run_created,
            payslips_generated=0,
            skipped_reason="No default payslip template configured -- run created without payslips.",
        )

    generated = generate_payslips_for_run(db, run, template)
    db.commit()
    db.refresh(run)
    return AutoGenerateResult(run=run, run_created=run_created, payslips_generated=len(generated), skipped_reason=None)
