from calendar import monthrange
from dataclasses import dataclass
from datetime import date

from sqlalchemy import or_, select
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
    annual_ctc and stores the result as EmployeeSalaryComponentValue rows.

    PERCENTAGE_OF_BASIC components resolve against whichever FIXED component is coded "BASIC" on
    the same structure (falling back to 0 if none is configured). PERCENTAGE_OF_CTC components
    resolve against this assignment's own monthly_ctc (annual_ctc / 12) -- this is what actually
    ties a per-employee CTC to a real paycheck; a structure built only from FIXED components never
    reads annual_ctc at all, which is why an assignment with a real CTC but no PERCENTAGE_OF_CTC
    components on its structure still resolves to zero everywhere.

    A component deactivated after being added to a structure is skipped here, so it stops being
    included in any assignment resolved from this point on -- existing employees' already-resolved
    values are untouched (this is a point-in-time snapshot, not a live formula, so past payslips
    stay historically accurate). Adds (does not commit) the rows and returns them."""
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

    monthly_ctc = float(assignment.annual_ctc) / 12

    resolved: list[EmployeeSalaryComponentValue] = []
    for structure_component, component in structure_components:
        if component.calculation_type == CalculationType.PERCENTAGE_OF_BASIC:
            percentage = float(component.percentage_of_basic or 0)
            value = basic_value * percentage / 100
        elif component.calculation_type == CalculationType.PERCENTAGE_OF_CTC:
            percentage = float(component.percentage_of_basic or 0)
            value = monthly_ctc * percentage / 100
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


def get_assignment_as_of(db: Session, employee_id: int, as_of: date) -> EmployeeSalaryAssignment | None:
    """Resolves whichever assignment was actually in effect on a given date -- unlike filtering on
    is_active (which only ever finds the current one), this also finds a since-superseded
    assignment, which a payroll run for a past period must use instead of whatever the employee's
    CTC has since been changed to.

    Ordered by effective_from/id descending (most recent first) and not just is_active, because
    stale data (e.g. rows left over from before this ordering existed, where more than one ended
    up flagged is_active with an open-ended effective_to) can otherwise satisfy this date range
    more than once -- an unordered query would then pick whichever one the DB happened to return
    first, which is not necessarily the one that's actually supposed to apply."""
    return db.execute(
        select(EmployeeSalaryAssignment)
        .where(
            EmployeeSalaryAssignment.employee_id == employee_id,
            EmployeeSalaryAssignment.effective_from <= as_of,
            or_(EmployeeSalaryAssignment.effective_to.is_(None), EmployeeSalaryAssignment.effective_to > as_of),
        )
        .order_by(EmployeeSalaryAssignment.effective_from.desc(), EmployeeSalaryAssignment.id.desc())
    ).scalars().first()


def period_end_date(period_month: int, period_year: int) -> date:
    return date(period_year, period_month, monthrange(period_year, period_month)[1])


def get_resolved_component_values(db: Session, assignment_id: int) -> list[EmployeeSalaryComponentValue]:
    return db.execute(
        select(EmployeeSalaryComponentValue).where(
            EmployeeSalaryComponentValue.employee_salary_assignment_id == assignment_id
        )
    ).scalars().all()


def create_run_with_entries(db: Session, period_month: int, period_year: int, created_by_employee_id: int) -> PayrollRun:
    """Shared by the manual "New payroll run" endpoint and the month-end auto-generate job --
    creates the run and snapshots every currently-active employee who had already joined by this
    period and has a salary assignment in effect for it. Caller commits.

    Note: this only excludes employees who joined *after* the period (date_of_joining check
    below) -- there's no termination-date field on Employee to symmetrically exclude someone who
    left partway through the period, only the coarser is_active flag, which drops them from every
    run from the moment they're deactivated onward, including periods they were actually employed
    for. Fixing that needs a real termination-date field, not a payroll_service change."""
    run = PayrollRun(period_month=period_month, period_year=period_year, created_by_employee_id=created_by_employee_id)
    db.add(run)
    db.flush()

    period_end = period_end_date(period_month, period_year)
    employees = db.execute(select(Employee).where(Employee.is_active.is_(True))).scalars().all()
    components_by_id = {c.id: c for c in db.execute(select(SalaryComponent)).scalars().all()}
    for employee in employees:
        # Can't have earned pay for a period before they'd even joined.
        if employee.date_of_joining > period_end:
            continue
        assignment = get_assignment_as_of(db, employee.id, period_end)
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
    period_end = period_end_date(run.period_month, run.period_year)

    created: list[Payslip] = []
    for entry in entries:
        if db.execute(select(Payslip).where(Payslip.payroll_run_entry_id == entry.id)).scalars().first():
            continue
        # Resolve whichever assignment was in effect for this run's period, not whatever is
        # is_active *now* -- otherwise a payslip generated for a past period after the employee's
        # CTC has since changed would silently use the new, wrong figures.
        assignment = get_assignment_as_of(db, entry.employee_id, period_end)
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
