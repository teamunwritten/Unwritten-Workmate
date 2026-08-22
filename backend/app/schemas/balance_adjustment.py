from pydantic import BaseModel, Field


class BalanceAdjustmentCreate(BaseModel):
    leave_type_id: int
    year: int
    delta_days: float
    comment: str = Field(min_length=1)


class BalanceAdjustmentOut(BaseModel):
    id: int
    employee_leave_balance_id: int
    adjusted_by_employee_id: int
    delta_days: float
    comment: str

    model_config = {"from_attributes": True}


class BalanceOverrideUpdate(BaseModel):
    entitled_days: float = Field(ge=0)
    custom_override: bool = True


class LeaveBalanceOut(BaseModel):
    leave_type_id: int
    leave_type_code: str
    year: int
    entitled_days: float
    accrued_days: float
    used_days: float
    carried_forward_days: float
    available_days: float
