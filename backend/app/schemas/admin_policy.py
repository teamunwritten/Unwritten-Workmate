from datetime import date, time

from pydantic import BaseModel, Field

from app.enums import (
    AccrualMode,
    EmployeeRole,
    EmploymentStatus,
    RecalculationMode,
    RestrictionAdjacency,
    YearEndBehavior,
    ZeroBalanceAction,
)


class LeaveTypeCreate(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    default_annual_days: float = Field(ge=0)
    accrual_mode: AccrualMode = AccrualMode.UPFRONT
    allow_lop_conversion: bool = False


class LeaveTypeUpdate(BaseModel):
    name: str | None = None
    default_annual_days: float | None = Field(default=None, ge=0)
    accrual_mode: AccrualMode | None = None
    allow_lop_conversion: bool | None = None
    is_active: bool | None = None


class LeaveTypeOut(BaseModel):
    id: int
    code: str
    name: str
    default_annual_days: float
    accrual_mode: AccrualMode
    allow_lop_conversion: bool
    is_active: bool

    model_config = {"from_attributes": True}


class PolicyVersionCreate(BaseModel):
    version_label: str
    effective_from: date
    effective_to: date | None = None
    recalculation_mode: RecalculationMode = RecalculationMode.PROSPECTIVE_ONLY
    notes: str | None = None
    clone_from_version_id: int | None = None


class PolicyVersionOut(BaseModel):
    id: int
    version_label: str
    effective_from: date
    effective_to: date | None
    recalculation_mode: RecalculationMode
    notes: str | None

    model_config = {"from_attributes": True}


class LeavePolicyUpdate(BaseModel):
    notice_buffer_trigger_days: float | None = None
    notice_buffer_required_days: int | None = None
    max_backdate_days: int | None = None
    same_day_cutoff_time: time | None = None
    year_end_behavior: YearEndBehavior | None = None
    carry_forward_cap: float | None = None
    zero_balance_action: ZeroBalanceAction | None = None
    sandwich_policy_enabled: bool | None = None


class LeavePolicyOut(BaseModel):
    id: int
    policy_version_id: int
    leave_type_id: int
    notice_buffer_trigger_days: float | None
    notice_buffer_required_days: int | None
    max_backdate_days: int
    same_day_cutoff_time: time | None
    year_end_behavior: YearEndBehavior
    carry_forward_cap: float | None
    zero_balance_action: ZeroBalanceAction
    sandwich_policy_enabled: bool

    model_config = {"from_attributes": True}


class EligibilityRuleCreate(BaseModel):
    policy_version_id: int
    employment_status: EmploymentStatus
    leave_type_id: int
    is_allowed: bool = False
    requires_hr_admin_approval: bool = False


class RestrictionRuleCreate(BaseModel):
    policy_version_id: int
    leave_type_a_id: int
    leave_type_b_id: int
    adjacency: RestrictionAdjacency
    is_blocked: bool = True


class RestrictionRuleOut(RestrictionRuleCreate):
    id: int

    model_config = {"from_attributes": True}


class DepartmentOut(BaseModel):
    id: int
    name: str
    parent_department_id: int | None = None

    model_config = {"from_attributes": True}


class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    email: str
    position: str | None = None
    phone_number: str | None = None
    personal_email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    department_id: int
    manager_id: int | None = None
    date_of_joining: date
    date_of_birth: date | None = None
    employment_status: EmploymentStatus = EmploymentStatus.PROBATION
    role: EmployeeRole = EmployeeRole.EMPLOYEE


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    position: str | None = None
    phone_number: str | None = None
    personal_email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    department_id: int | None = None
    manager_id: int | None = None
    employment_status: EmploymentStatus | None = None
    notice_period_start: date | None = None
    notice_period_end: date | None = None
    date_of_birth: date | None = None
    role: EmployeeRole | None = None
    is_active: bool | None = None


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: str
    picture_url: str | None = None
    position: str | None = None
    phone_number: str | None = None
    personal_email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    department_id: int
    department_name: str | None = None
    manager_id: int | None
    manager_name: str | None = None
    date_of_joining: date
    date_of_birth: date | None = None
    employment_status: EmploymentStatus
    notice_period_start: date | None = None
    notice_period_end: date | None = None
    role: EmployeeRole
    is_active: bool
    google_linked: bool = False

    model_config = {"from_attributes": True}


class EmployeeTreeNode(BaseModel):
    id: int
    full_name: str
    picture_url: str | None = None
    position: str | None = None
    role: EmployeeRole
    department_id: int
    department_name: str | None = None
    employment_status: EmploymentStatus
    reports: list["EmployeeTreeNode"] = []
