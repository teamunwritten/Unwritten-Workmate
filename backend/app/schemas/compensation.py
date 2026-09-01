from datetime import date

from pydantic import BaseModel

from app.enums import CalculationType, ComponentType


class SalaryComponentCreate(BaseModel):
    code: str
    name: str
    component_type: ComponentType
    calculation_type: CalculationType
    percentage_of_basic: float | None = None
    is_taxable: bool = True


class SalaryComponentUpdate(BaseModel):
    name: str | None = None
    percentage_of_basic: float | None = None
    is_taxable: bool | None = None
    is_active: bool | None = None


class SalaryComponentOut(BaseModel):
    id: int
    code: str
    name: str
    component_type: ComponentType
    calculation_type: CalculationType
    percentage_of_basic: float | None
    is_taxable: bool
    is_active: bool

    model_config = {"from_attributes": True}


class SalaryStructureCreate(BaseModel):
    name: str
    description: str | None = None


class SalaryStructureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SalaryStructureComponentCreate(BaseModel):
    salary_component_id: int
    default_value: float | None = None
    display_order: int = 0


class SalaryStructureComponentOut(BaseModel):
    id: int
    salary_component_id: int
    component_code: str
    component_name: str
    component_type: ComponentType
    calculation_type: CalculationType
    default_value: float | None
    display_order: int

    model_config = {"from_attributes": True}


class SalaryStructureOut(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    components: list[SalaryStructureComponentOut] = []

    model_config = {"from_attributes": True}


class EmployeeSalaryAssignmentCreate(BaseModel):
    salary_structure_id: int
    effective_from: date
    annual_ctc: float


class ResolvedComponentValueOut(BaseModel):
    salary_component_id: int
    component_code: str
    component_name: str
    component_type: ComponentType
    resolved_value: float


class EmployeeSalaryAssignmentOut(BaseModel):
    id: int
    employee_id: int
    salary_structure_id: int
    salary_structure_name: str
    effective_from: date
    effective_to: date | None
    annual_ctc: float
    is_active: bool
    component_values: list[ResolvedComponentValueOut] = []

    model_config = {"from_attributes": True}


class EmployeeSalaryAssignmentSummaryOut(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    salary_structure_id: int
    salary_structure_name: str
    annual_ctc: float
    effective_from: date
