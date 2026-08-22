from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.enums import AccrualMode
from app.models import Employee, EmployeeLeaveBalance, LeaveType

HALF_DAY = Decimal("0.5")


def _round_to_half_day(value: Decimal) -> Decimal:
    return (value * 2).to_integral_value(rounding=ROUND_HALF_UP) / 2


def prorate_for_joining(date_of_joining: date, annual_days: Decimal, year: int) -> Decimal:
    """Pro-rate a mid-year joiner's entitlement based on remaining full months, rounded to nearest 0.5 day."""
    if date_of_joining.year < year:
        return _round_to_half_day(annual_days)
    if date_of_joining.year > year:
        return Decimal("0")
    months_remaining = 12 - date_of_joining.month + 1
    prorated = annual_days * Decimal(months_remaining) / Decimal(12)
    return _round_to_half_day(prorated)


def compute_accrued_as_of(employee: Employee, leave_type: LeaveType, as_of: date) -> Decimal:
    """Compute the accrued-to-date entitlement for `as_of`, honoring accrual_mode and joining date."""
    annual_days = Decimal(str(leave_type.default_annual_days))
    year = as_of.year

    if employee.date_of_joining.year > year:
        return Decimal("0")

    if leave_type.accrual_mode == AccrualMode.UPFRONT:
        return prorate_for_joining(employee.date_of_joining, annual_days, year)

    effective_start = employee.date_of_joining if employee.date_of_joining.year == year else date(year, 1, 1)
    if leave_type.accrual_mode == AccrualMode.MONTHLY:
        per_period = annual_days / Decimal(12)
        elapsed_periods = (as_of.year - effective_start.year) * 12 + (as_of.month - effective_start.month) + 1
    else:  # QUARTERLY
        per_period = annual_days / Decimal(4)
        current_quarter = (as_of.month - 1) // 3 + 1
        start_quarter = (effective_start.month - 1) // 3 + 1
        elapsed_periods = current_quarter - start_quarter + 1

    elapsed_periods = max(elapsed_periods, 0)
    return _round_to_half_day(per_period * Decimal(elapsed_periods))


def compute_available_balance(
    employee: Employee,
    leave_type: LeaveType,
    balance: EmployeeLeaveBalance | None,
    as_of: date,
) -> Decimal:
    accrued = compute_accrued_as_of(employee, leave_type, as_of)
    carried_forward = Decimal(str(balance.carried_forward_days)) if balance else Decimal("0")
    used = Decimal(str(balance.used_days)) if balance else Decimal("0")
    return accrued + carried_forward - used
