from datetime import date, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminEmployee, CurrentEmployee, DbSession, PayrollCron
from app.enums import EmployeeRole, PayrollRunStatus, PayslipDesign, PayslipStatus
from app.models import (
    Department,
    Employee,
    Payslip,
    PayslipTemplate,
    PayrollRun,
    PayrollRunEntry,
)
from app.schemas.payroll import (
    AutoGeneratePayrollResponse,
    GeneratePayslipsRequest,
    PayrollRunCreate,
    PayrollRunDetailOut,
    PayrollRunEntryOut,
    PayrollRunOut,
    PayrollRunStatusUpdate,
    PayslipLineItem,
    PayslipOut,
    PayslipTemplateCreate,
    PayslipTemplateOut,
    PayslipTemplateUpdate,
)
from app.services.email_service import send_payslip_ready_email
from app.services.payroll_service import create_run_with_entries, generate_payslips_for_run, recompute_run_entries, run_auto_generate

router = APIRouter(prefix="/payroll", tags=["payroll"])


VALID_TRANSITIONS = {
    PayrollRunStatus.DRAFT: {PayrollRunStatus.PROCESSING},
    PayrollRunStatus.PROCESSING: {PayrollRunStatus.COMPLETED},
    PayrollRunStatus.COMPLETED: set(),
}


# ---------- Payroll runs ----------


def _run_out(db: DbSession, run: PayrollRun) -> PayrollRunOut:
    count = len(db.execute(select(PayrollRunEntry).where(PayrollRunEntry.payroll_run_id == run.id)).scalars().all())
    return PayrollRunOut(
        id=run.id,
        period_month=run.period_month,
        period_year=run.period_year,
        status=run.status,
        run_date=run.run_date,
        created_at=run.created_at,
        entry_count=count,
    )


def _entry_out(db: DbSession, entry: PayrollRunEntry, employee_names: dict[int, str]) -> PayrollRunEntryOut:
    payslip = db.execute(select(Payslip).where(Payslip.payroll_run_entry_id == entry.id)).scalars().first()
    return PayrollRunEntryOut(
        id=entry.id,
        employee_id=entry.employee_id,
        employee_name=employee_names.get(entry.employee_id, ""),
        salary_structure_id=entry.salary_structure_id,
        status=entry.status,
        gross_amount=float(entry.gross_amount) if entry.gross_amount is not None else None,
        payslip_id=payslip.id if payslip else None,
        payslip_status=payslip.status if payslip else None,
    )


@router.get("/runs", response_model=list[PayrollRunOut])
def list_payroll_runs(db: DbSession, _: AdminEmployee):
    runs = db.execute(select(PayrollRun).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc())).scalars().all()
    return [_run_out(db, r) for r in runs]


@router.post("/runs", response_model=PayrollRunOut, status_code=status.HTTP_201_CREATED)
def create_payroll_run(payload: PayrollRunCreate, db: DbSession, admin: AdminEmployee):
    if db.execute(
        select(PayrollRun).where(PayrollRun.period_month == payload.period_month, PayrollRun.period_year == payload.period_year)
    ).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A payroll run already exists for this period")

    run = create_run_with_entries(db, payload.period_month, payload.period_year, admin.id)
    db.commit()
    db.refresh(run)
    return _run_out(db, run)


@router.get("/runs/{run_id}", response_model=PayrollRunDetailOut)
def get_payroll_run(run_id: int, db: DbSession, _: AdminEmployee):
    run = db.get(PayrollRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    entries = db.execute(select(PayrollRunEntry).where(PayrollRunEntry.payroll_run_id == run_id)).scalars().all()
    employee_names = {e.id: e.full_name for e in db.execute(select(Employee)).scalars().all()}
    base = _run_out(db, run)
    return PayrollRunDetailOut(**base.model_dump(), entries=[_entry_out(db, e, employee_names) for e in entries])


@router.patch("/runs/{run_id}", response_model=PayrollRunOut)
def update_payroll_run_status(run_id: int, payload: PayrollRunStatusUpdate, db: DbSession, _: AdminEmployee):
    run = db.get(PayrollRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    if payload.status not in VALID_TRANSITIONS[run.status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition a run from {run.status.value} to {payload.status.value}",
        )
    run.status = payload.status
    if payload.status == PayrollRunStatus.COMPLETED:
        run.run_date = date.today()
    db.commit()
    db.refresh(run)
    return _run_out(db, run)


@router.post("/runs/{run_id}/recompute", response_model=PayrollRunDetailOut)
def recompute_payroll_run(run_id: int, db: DbSession, _: AdminEmployee):
    """Re-resolves every entry (and any still-DRAFT payslip) against whatever salary assignment
    is in effect now -- for when an assignment was created, corrected, or only became resolvable
    after this run already existed, so its entries are stuck showing stale/zero figures from
    whenever they were last snapshotted. Only allowed while the run is still DRAFT; approved
    payslips are never touched regardless."""
    run = db.get(PayrollRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    if run.status != PayrollRunStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a DRAFT run can be re-run")

    recompute_run_entries(db, run)
    db.commit()

    entries = db.execute(select(PayrollRunEntry).where(PayrollRunEntry.payroll_run_id == run_id)).scalars().all()
    employee_names = {e.id: e.full_name for e in db.execute(select(Employee)).scalars().all()}
    base = _run_out(db, run)
    return PayrollRunDetailOut(**base.model_dump(), entries=[_entry_out(db, e, employee_names) for e in entries])


@router.post("/runs/auto-generate", response_model=AutoGeneratePayrollResponse, status_code=status.HTTP_201_CREATED)
def auto_generate_payroll_run(db: DbSession, _: PayrollCron):
    """Ops-facing manual trigger for the same logic the in-process month-end scheduler runs
    automatically every day at 20:00 org time (see app/services/scheduler.py) -- useful for
    testing or backfilling a missed period. Authenticated via the X-Payroll-Cron-Secret header
    rather than a user session, since it's meant to be called by an external script. Idempotent:
    calling it more than once for the same month reuses the existing run and only generates
    payslips that don't already exist. Payslips are created as DRAFT -- an admin still has to
    approve each one (individually or via "Approve All") before it's emailed and visible to the
    employee."""
    today = date.today()
    result = run_auto_generate(db, today.month, today.year)
    if result.run is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.skipped_reason)
    return AutoGeneratePayrollResponse(
        run=_run_out(db, result.run),
        run_created=result.run_created,
        payslips_generated=result.payslips_generated,
        skipped_reason=result.skipped_reason,
    )


# ---------- Payslip templates ----------


@router.get("/payslip-templates", response_model=list[PayslipTemplateOut])
def list_payslip_templates(db: DbSession, _: AdminEmployee):
    return db.execute(select(PayslipTemplate)).scalars().all()


@router.post("/payslip-templates", response_model=PayslipTemplateOut, status_code=status.HTTP_201_CREATED)
def create_payslip_template(payload: PayslipTemplateCreate, db: DbSession, _: AdminEmployee):
    if db.execute(select(PayslipTemplate).where(PayslipTemplate.name == payload.name)).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Template name already in use")
    if payload.is_default:
        for existing in db.execute(select(PayslipTemplate).where(PayslipTemplate.is_default.is_(True))).scalars().all():
            existing.is_default = False
    template = PayslipTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.patch("/payslip-templates/{template_id}", response_model=PayslipTemplateOut)
def update_payslip_template(template_id: int, payload: PayslipTemplateUpdate, db: DbSession, _: AdminEmployee):
    template = db.get(PayslipTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip template not found")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_default"):
        for existing in db.execute(select(PayslipTemplate).where(PayslipTemplate.is_default.is_(True))).scalars().all():
            existing.is_default = False
    for field, value in updates.items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


# ---------- Payslips ----------


def _payslip_out(db: DbSession, payslip: Payslip, entry: PayrollRunEntry, run: PayrollRun, employee: Employee | None) -> PayslipOut:
    department = db.get(Department, employee.department_id) if employee and employee.department_id else None
    approver = db.get(Employee, payslip.approved_by_employee_id) if payslip.approved_by_employee_id else None
    template = db.get(PayslipTemplate, payslip.payslip_template_id)
    return PayslipOut(
        id=payslip.id,
        reference_number=f"PS-{run.period_year}{run.period_month:02d}-{payslip.id:06d}",
        payroll_run_entry_id=payslip.payroll_run_entry_id,
        employee_id=entry.employee_id,
        employee_name=employee.full_name if employee else "",
        employee_code=employee.employee_code if employee else "",
        position=employee.position if employee else None,
        department_name=department.name if department else None,
        payslip_template_id=payslip.payslip_template_id,
        design=template.design if template else PayslipDesign.CLASSIC,
        header_config=template.header_config if template else None,
        footer_note=template.footer_note if template else None,
        generated_at=payslip.generated_at,
        period_month=run.period_month,
        period_year=run.period_year,
        gross_pay=float(payslip.gross_pay),
        net_pay=float(payslip.net_pay),
        line_items=[PayslipLineItem(**item) for item in payslip.line_items],
        status=payslip.status,
        approved_at=payslip.approved_at,
        approved_by_name=approver.full_name if approver else None,
    )


@router.post("/runs/{run_id}/generate-payslips", response_model=list[PayslipOut], status_code=status.HTTP_201_CREATED)
def generate_payslips(run_id: int, payload: GeneratePayslipsRequest, db: DbSession, _: AdminEmployee):
    run = db.get(PayrollRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")

    template = None
    if payload.payslip_template_id is not None:
        template = db.get(PayslipTemplate, payload.payslip_template_id)
    if template is None:
        template = db.execute(select(PayslipTemplate).where(PayslipTemplate.is_default.is_(True))).scalars().first()
    if template is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No payslip template specified and no default template exists")

    created = generate_payslips_for_run(db, run, template)
    db.commit()
    for p in created:
        db.refresh(p)

    out = []
    for payslip in created:
        entry = db.get(PayrollRunEntry, payslip.payroll_run_entry_id)
        employee = db.get(Employee, entry.employee_id)
        out.append(_payslip_out(db, payslip, entry, run, employee))
    return out


def _get_payslip_context(db: DbSession, payslip_id: int) -> tuple[Payslip, PayrollRunEntry, PayrollRun, Employee | None]:
    payslip = db.get(Payslip, payslip_id)
    if payslip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found")
    entry = db.get(PayrollRunEntry, payslip.payroll_run_entry_id)
    run = db.get(PayrollRun, entry.payroll_run_id)
    employee = db.get(Employee, entry.employee_id)
    return payslip, entry, run, employee


@router.get("/payslips/{payslip_id}", response_model=PayslipOut)
def get_payslip(payslip_id: int, db: DbSession, current: CurrentEmployee):
    """Admins can view any payslip (draft or approved, for reviewing before send). A regular
    employee can only view their own, and only once it's APPROVED -- a draft isn't visible to
    the person it's about until an admin has signed off on it."""
    payslip, entry, run, employee = _get_payslip_context(db, payslip_id)
    is_owner = entry.employee_id == current.id
    if current.role != EmployeeRole.HR_ADMIN:
        if not is_owner or payslip.status != PayslipStatus.APPROVED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found")
    return _payslip_out(db, payslip, entry, run, employee)


@router.post("/payslips/{payslip_id}/approve", response_model=PayslipOut)
def approve_payslip(payslip_id: int, db: DbSession, admin: AdminEmployee):
    payslip, entry, run, employee = _get_payslip_context(db, payslip_id)
    if payslip.status == PayslipStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payslip is already approved")

    payslip.status = PayslipStatus.APPROVED
    payslip.approved_by_employee_id = admin.id
    payslip.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(payslip)

    if employee is not None:
        try:
            send_payslip_ready_email(db, employee, payslip, run)
        except Exception:  # noqa: BLE001 -- email delivery must never break the approval itself
            pass

    return _payslip_out(db, payslip, entry, run, employee)


@router.post("/runs/{run_id}/approve-payslips", response_model=list[PayslipOut])
def approve_run_payslips(run_id: int, db: DbSession, admin: AdminEmployee):
    """Bulk version of approve_payslip -- approves every still-DRAFT payslip in the run in one
    action and emails each employee (best-effort, per employee, same as the single-approve path)
    rather than requiring an admin to click into each payslip individually."""
    run = db.get(PayrollRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")

    entry_ids = [e.id for e in db.execute(select(PayrollRunEntry).where(PayrollRunEntry.payroll_run_id == run_id)).scalars().all()]
    draft_payslips = (
        db.execute(
            select(Payslip).where(Payslip.payroll_run_entry_id.in_(entry_ids), Payslip.status == PayslipStatus.DRAFT)
        ).scalars().all()
        if entry_ids
        else []
    )

    now = datetime.utcnow()
    for payslip in draft_payslips:
        payslip.status = PayslipStatus.APPROVED
        payslip.approved_by_employee_id = admin.id
        payslip.approved_at = now
    db.commit()

    out = []
    for payslip in draft_payslips:
        db.refresh(payslip)
        entry = db.get(PayrollRunEntry, payslip.payroll_run_entry_id)
        employee = db.get(Employee, entry.employee_id)
        if employee is not None:
            try:
                send_payslip_ready_email(db, employee, payslip, run)
            except Exception:  # noqa: BLE001 -- email delivery must never break the approval itself
                pass
        out.append(_payslip_out(db, payslip, entry, run, employee))
    return out


# ---------- Employee self-service ----------


@router.get("/my-payslips", response_model=list[PayslipOut])
def list_my_payslips(db: DbSession, current: CurrentEmployee):
    payslips = db.execute(
        select(Payslip, PayrollRunEntry, PayrollRun)
        .join(PayrollRunEntry, Payslip.payroll_run_entry_id == PayrollRunEntry.id)
        .join(PayrollRun, PayrollRunEntry.payroll_run_id == PayrollRun.id)
        .where(PayrollRunEntry.employee_id == current.id, Payslip.status == PayslipStatus.APPROVED)
        .order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc())
    ).all()
    return [_payslip_out(db, payslip, entry, run, current) for payslip, entry, run in payslips]
