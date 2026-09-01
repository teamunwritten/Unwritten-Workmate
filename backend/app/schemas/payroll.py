from datetime import date, datetime

from pydantic import BaseModel

from app.enums import PayrollRunEntryStatus, PayrollRunStatus, PayslipDesign, PayslipStatus


class PayrollRunCreate(BaseModel):
    period_month: int
    period_year: int


class PayrollRunEntryOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    salary_structure_id: int | None
    status: PayrollRunEntryStatus
    gross_amount: float | None
    payslip_id: int | None
    payslip_status: PayslipStatus | None

    model_config = {"from_attributes": True}


class PayrollRunOut(BaseModel):
    id: int
    period_month: int
    period_year: int
    status: PayrollRunStatus
    run_date: date | None
    created_at: datetime
    entry_count: int

    model_config = {"from_attributes": True}


class PayrollRunDetailOut(PayrollRunOut):
    entries: list[PayrollRunEntryOut] = []


class PayrollRunStatusUpdate(BaseModel):
    status: PayrollRunStatus


class AutoGeneratePayrollResponse(BaseModel):
    run: PayrollRunOut
    run_created: bool
    payslips_generated: int
    skipped_reason: str | None = None


class PayslipTemplateCreate(BaseModel):
    name: str
    is_default: bool = False
    design: PayslipDesign = PayslipDesign.CLASSIC
    header_config: dict | None = None
    footer_note: str | None = None


class PayslipTemplateUpdate(BaseModel):
    name: str | None = None
    is_default: bool | None = None
    design: PayslipDesign | None = None
    header_config: dict | None = None
    footer_note: str | None = None
    is_active: bool | None = None


class PayslipTemplateOut(BaseModel):
    id: int
    name: str
    is_default: bool
    design: PayslipDesign
    header_config: dict | None
    footer_note: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class PayslipLineItem(BaseModel):
    component_code: str
    component_name: str
    component_type: str
    value: float


class GeneratePayslipsRequest(BaseModel):
    payslip_template_id: int | None = None


class PayslipOut(BaseModel):
    id: int
    reference_number: str
    payroll_run_entry_id: int
    employee_id: int
    employee_name: str
    employee_code: str
    position: str | None
    department_name: str | None
    payslip_template_id: int
    design: PayslipDesign
    header_config: dict | None
    footer_note: str | None
    generated_at: datetime
    period_month: int
    period_year: int
    gross_pay: float
    net_pay: float
    line_items: list[PayslipLineItem]
    status: PayslipStatus
    approved_at: datetime | None
    approved_by_name: str | None

    model_config = {"from_attributes": True}
