from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminEmployee, CurrentEmployee, DbSession
from app.enums import EmployeeRole
from app.models import (
    BalanceAdjustment,
    Department,
    Employee,
    EmployeeLeaveBalance,
    Holiday,
    LeavePolicy,
    LeaveType,
    LeaveTypeEligibilityRule,
    LeaveTypeRestriction,
    PolicyVersion,
)
from app.schemas.admin_policy import (
    DepartmentOut,
    EligibilityRuleCreate,
    EmployeeCreate,
    EmployeeOut,
    EmployeeTreeNode,
    EmployeeUpdate,
    LeavePolicyOut,
    LeavePolicyUpdate,
    LeaveTypeCreate,
    LeaveTypeOut,
    LeaveTypeUpdate,
    PolicyVersionCreate,
    PolicyVersionOut,
    RestrictionRuleCreate,
    RestrictionRuleOut,
)
from app.schemas.balance_adjustment import BalanceAdjustmentCreate, BalanceAdjustmentOut, BalanceOverrideUpdate, LeaveBalanceOut
from app.schemas.holidays import HolidayBulkCreate, HolidayCreate, HolidayOut
from app.services.accrual_service import compute_available_balance
from app.services.audit_service import write_audit_entry
from app.services.policy_version_service import create_policy_version

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[])


# ---------- Departments ----------


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: DbSession, _: AdminEmployee):
    return db.execute(select(Department)).scalars().all()


# ---------- Employees ----------


def _employee_out(db: DbSession, employee: Employee) -> EmployeeOut:
    department = db.get(Department, employee.department_id)
    manager = db.get(Employee, employee.manager_id) if employee.manager_id else None
    return EmployeeOut(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        email=employee.email,
        picture_url=employee.google_picture_url,
        position=employee.position,
        phone_number=employee.phone_number,
        personal_email=employee.personal_email,
        address=employee.address,
        emergency_contact_name=employee.emergency_contact_name,
        emergency_contact_phone=employee.emergency_contact_phone,
        department_id=employee.department_id,
        department_name=department.name if department else None,
        manager_id=employee.manager_id,
        manager_name=manager.full_name if manager else None,
        date_of_joining=employee.date_of_joining,
        date_of_birth=employee.date_of_birth,
        employment_status=employee.employment_status,
        notice_period_start=employee.notice_period_start,
        notice_period_end=employee.notice_period_end,
        role=employee.role,
        is_active=employee.is_active,
        google_linked=employee.google_sub is not None,
    )


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: DbSession, _: AdminEmployee):
    employees = db.execute(select(Employee).order_by(Employee.full_name)).scalars().all()
    return [_employee_out(db, e) for e in employees]


@router.get("/employees/tree", response_model=list[EmployeeTreeNode])
def get_employee_tree(db: DbSession, _: AdminEmployee):
    # Must stay registered before /employees/{employee_id} -- otherwise FastAPI matches
    # "tree" against the int path param and 422s before this route is ever reached.
    employees = db.execute(select(Employee).where(Employee.is_active.is_(True))).scalars().all()
    departments = {d.id: d.name for d in db.execute(select(Department)).scalars().all()}
    by_manager: dict[int | None, list[Employee]] = {}
    for e in employees:
        by_manager.setdefault(e.manager_id, []).append(e)

    def build(node_employee: Employee) -> EmployeeTreeNode:
        return EmployeeTreeNode(
            id=node_employee.id,
            full_name=node_employee.full_name,
            picture_url=node_employee.google_picture_url,
            position=node_employee.position,
            role=node_employee.role,
            department_id=node_employee.department_id,
            department_name=departments.get(node_employee.department_id),
            employment_status=node_employee.employment_status,
            reports=[build(child) for child in by_manager.get(node_employee.id, [])],
        )

    roots = by_manager.get(None, [])
    return [build(root) for root in roots]


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: DbSession, _: AdminEmployee):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _employee_out(db, employee)


@router.get("/employees/{employee_id}/balances", response_model=list[LeaveBalanceOut])
def get_employee_balances(employee_id: int, db: DbSession, _: AdminEmployee, year: int | None = None):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    target_year = year or datetime.now(timezone.utc).year
    leave_types = db.execute(select(LeaveType).where(LeaveType.is_active.is_(True))).scalars().all()
    out = []
    for lt in leave_types:
        balance = db.execute(
            select(EmployeeLeaveBalance).where(
                EmployeeLeaveBalance.employee_id == employee_id,
                EmployeeLeaveBalance.leave_type_id == lt.id,
                EmployeeLeaveBalance.year == target_year,
            )
        ).scalars().first()
        available = compute_available_balance(employee, lt, balance, datetime.now(timezone.utc).date())
        out.append(
            LeaveBalanceOut(
                leave_type_id=lt.id,
                leave_type_code=lt.code,
                year=target_year,
                entitled_days=float(balance.entitled_days) if balance else 0.0,
                accrued_days=float(balance.accrued_days) if balance else 0.0,
                used_days=float(balance.used_days) if balance else 0.0,
                carried_forward_days=float(balance.carried_forward_days) if balance else 0.0,
                available_days=float(available),
            )
        )
    return out


def _validate_department_exists(db: DbSession, department_id: int) -> None:
    if db.get(Department, department_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")


def _validate_manager(db: DbSession, manager_id: int, employee_id: int | None) -> None:
    """Manager must exist, can't be the employee itself, and can't create a reporting cycle
    (A manages B manages A) -- either would send /admin/employees/tree's recursive builder into
    infinite recursion."""
    manager = db.get(Employee, manager_id)
    if manager is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager not found")
    if employee_id is not None and manager_id == employee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An employee cannot be their own manager")

    if employee_id is not None:
        cursor = manager
        for _ in range(1000):  # generous bound; a real org chart is never this deep
            if cursor.manager_id is None:
                return
            if cursor.manager_id == employee_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This would create a circular reporting chain")
            cursor = db.get(Employee, cursor.manager_id)
            if cursor is None:
                return


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate, db: DbSession, admin: AdminEmployee):
    if db.execute(select(Employee).where(Employee.email == payload.email)).scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    _validate_department_exists(db, payload.department_id)
    # Admins sit outside the reporting chain -- no manager, and their own leave is auto-approved
    # rather than routed to one (see day_request_service.create_leave_application).
    manager_id = None if payload.role == EmployeeRole.HR_ADMIN else payload.manager_id
    if manager_id is not None:
        _validate_manager(db, manager_id, employee_id=None)

    employee = Employee(
        employee_code=payload.employee_code,
        full_name=payload.full_name,
        email=payload.email,
        position=payload.position,
        phone_number=payload.phone_number,
        personal_email=payload.personal_email,
        address=payload.address,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        department_id=payload.department_id,
        manager_id=manager_id,
        date_of_joining=payload.date_of_joining,
        date_of_birth=payload.date_of_birth,
        employment_status=payload.employment_status,
        role=payload.role,
    )
    db.add(employee)
    db.flush()
    write_audit_entry(db, "employee", employee.id, "EMPLOYEE_CREATED", admin.id, after_value={"email": employee.email})
    db.commit()
    db.refresh(employee)
    return _employee_out(db, employee)


@router.patch("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: DbSession, admin: AdminEmployee):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    updates = payload.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] != employee.email:
        if db.execute(select(Employee).where(Employee.email == updates["email"], Employee.id != employee_id)).scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        # The Google account bound to the old email is no longer valid for this record --
        # force a fresh Google sign-in (which re-binds google_sub) against the new address.
        employee.google_sub = None

    if "department_id" in updates:
        _validate_department_exists(db, updates["department_id"])

    resulting_role = updates.get("role", employee.role)
    if resulting_role == EmployeeRole.HR_ADMIN:
        # Admins sit outside the reporting chain -- clear/ignore any manager_id, whether it's
        # newly submitted here or was already set before this employee became an admin.
        updates["manager_id"] = None
    elif "manager_id" in updates and updates["manager_id"] is not None:
        _validate_manager(db, updates["manager_id"], employee_id=employee_id)

    before = {"employment_status": employee.employment_status.value, "role": employee.role.value}
    for field, value in updates.items():
        setattr(employee, field, value)

    write_audit_entry(
        db,
        "employee",
        employee.id,
        "EMPLOYEE_UPDATED",
        admin.id,
        before_value=before,
        after_value={"employment_status": employee.employment_status.value, "role": employee.role.value},
    )
    db.commit()
    db.refresh(employee)
    return _employee_out(db, employee)


# ---------- Leave types ----------


@router.get("/leave-types", response_model=list[LeaveTypeOut])
def list_leave_types(db: DbSession, _: AdminEmployee):
    return db.execute(select(LeaveType)).scalars().all()


@router.post("/leave-types", response_model=LeaveTypeOut, status_code=status.HTTP_201_CREATED)
def create_leave_type(payload: LeaveTypeCreate, db: DbSession, admin: AdminEmployee):
    leave_type = LeaveType(**payload.model_dump())
    db.add(leave_type)
    db.flush()
    write_audit_entry(db, "leave_type", leave_type.id, "LEAVE_TYPE_CREATED", admin.id, after_value=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(leave_type)
    return leave_type


@router.patch("/leave-types/{leave_type_id}", response_model=LeaveTypeOut)
def update_leave_type(leave_type_id: int, payload: LeaveTypeUpdate, db: DbSession, admin: AdminEmployee):
    leave_type = db.get(LeaveType, leave_type_id)
    if leave_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(leave_type, field, value)
    write_audit_entry(db, "leave_type", leave_type.id, "LEAVE_TYPE_UPDATED", admin.id, after_value=payload.model_dump(mode="json", exclude_unset=True))
    db.commit()
    db.refresh(leave_type)
    return leave_type


# ---------- Policy versions & leave policies ----------


@router.post("/policy-versions", response_model=PolicyVersionOut, status_code=status.HTTP_201_CREATED)
def create_policy_version_endpoint(payload: PolicyVersionCreate, db: DbSession, admin: AdminEmployee):
    try:
        version = create_policy_version(db, payload, admin.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    db.commit()
    db.refresh(version)
    return version


@router.get("/policy-versions", response_model=list[PolicyVersionOut])
def list_policy_versions(db: DbSession, _: AdminEmployee):
    return db.execute(select(PolicyVersion).order_by(PolicyVersion.effective_from.desc())).scalars().all()


@router.get("/policy-versions/{version_id}/leave-policies", response_model=list[LeavePolicyOut])
def list_leave_policies(version_id: int, db: DbSession, _: AdminEmployee):
    return db.execute(select(LeavePolicy).where(LeavePolicy.policy_version_id == version_id)).scalars().all()


@router.patch("/policy-versions/{version_id}/leave-policies/{leave_type_id}", response_model=LeavePolicyOut)
def update_leave_policy(
    version_id: int, leave_type_id: int, payload: LeavePolicyUpdate, db: DbSession, admin: AdminEmployee
):
    policy = db.execute(
        select(LeavePolicy).where(LeavePolicy.policy_version_id == version_id, LeavePolicy.leave_type_id == leave_type_id)
    ).scalars().first()
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave policy not found")

    before = {
        # Decimal isn't JSON-serializable, so cast notice_buffer_trigger_days for the audit log.
        "notice_buffer_trigger_days": float(policy.notice_buffer_trigger_days) if policy.notice_buffer_trigger_days is not None else None,
        "notice_buffer_required_days": policy.notice_buffer_required_days,
        "max_backdate_days": policy.max_backdate_days,
        "zero_balance_action": policy.zero_balance_action.value,
        "sandwich_policy_enabled": policy.sandwich_policy_enabled,
    }
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)

    write_audit_entry(
        db,
        "leave_policy",
        policy.id,
        "POLICY_EDIT",
        admin.id,
        before_value=before,
        after_value=payload.model_dump(mode="json", exclude_unset=True),
    )
    db.commit()
    db.refresh(policy)
    return policy


# ---------- Eligibility & restriction rules ----------


@router.post("/leave-type-eligibility-rules", status_code=status.HTTP_201_CREATED)
def create_eligibility_rule(payload: EligibilityRuleCreate, db: DbSession, admin: AdminEmployee):
    if db.get(PolicyVersion, payload.policy_version_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy version not found")
    if db.get(LeaveType, payload.leave_type_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")

    rule = LeaveTypeEligibilityRule(**payload.model_dump())
    db.add(rule)
    write_audit_entry(db, "leave_type_eligibility_rule", 0, "ELIGIBILITY_RULE_CREATED", admin.id, after_value=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(rule)
    return {"id": rule.id}


@router.get("/leave-type-restrictions", response_model=list[RestrictionRuleOut])
def list_restriction_rules(db: DbSession, _: AdminEmployee, policy_version_id: int | None = None):
    stmt = select(LeaveTypeRestriction)
    if policy_version_id:
        stmt = stmt.where(LeaveTypeRestriction.policy_version_id == policy_version_id)
    return db.execute(stmt).scalars().all()


@router.post("/leave-type-restrictions", response_model=RestrictionRuleOut, status_code=status.HTTP_201_CREATED)
def create_restriction_rule(payload: RestrictionRuleCreate, db: DbSession, admin: AdminEmployee):
    if payload.leave_type_a_id == payload.leave_type_b_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="leave_type_a_id and leave_type_b_id must differ")
    if db.get(PolicyVersion, payload.policy_version_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy version not found")
    if db.get(LeaveType, payload.leave_type_a_id) is None or db.get(LeaveType, payload.leave_type_b_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")

    rule = LeaveTypeRestriction(**payload.model_dump())
    db.add(rule)
    db.flush()
    write_audit_entry(db, "leave_type_restriction", rule.id, "RESTRICTION_RULE_CREATED", admin.id, after_value=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/leave-type-restrictions/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restriction_rule(rule_id: int, db: DbSession, admin: AdminEmployee):
    rule = db.get(LeaveTypeRestriction, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction rule not found")
    db.delete(rule)
    write_audit_entry(db, "leave_type_restriction", rule_id, "RESTRICTION_RULE_DELETED", admin.id)
    db.commit()


# ---------- Holidays ----------


@router.get("/holidays", response_model=list[HolidayOut])
def list_holidays(db: DbSession, _: AdminEmployee, year: int | None = None):
    stmt = select(Holiday)
    if year:
        stmt = stmt.where(Holiday.year == year)
    return db.execute(stmt).scalars().all()


@router.post("/holidays", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
def create_holiday(payload: HolidayCreate, db: DbSession, admin: AdminEmployee):
    holiday = Holiday(date=payload.date, name=payload.name, holiday_type=payload.holiday_type, year=payload.date.year)
    db.add(holiday)
    db.flush()
    write_audit_entry(db, "holiday", holiday.id, "HOLIDAY_CREATED", admin.id, after_value=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(holiday)
    return holiday


@router.post("/holidays/bulk", response_model=list[HolidayOut], status_code=status.HTTP_201_CREATED)
def bulk_create_holidays(payload: HolidayBulkCreate, db: DbSession, admin: AdminEmployee):
    created = []
    for item in payload.items:
        holiday = Holiday(date=item.date, name=item.name, holiday_type=item.holiday_type, year=item.date.year)
        db.add(holiday)
        created.append(holiday)
    db.flush()
    write_audit_entry(db, "holiday", 0, "HOLIDAYS_BULK_CREATED", admin.id, after_value={"count": len(created)})
    db.commit()
    for h in created:
        db.refresh(h)
    return created


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(holiday_id: int, db: DbSession, admin: AdminEmployee):
    holiday = db.get(Holiday, holiday_id)
    if holiday is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    db.delete(holiday)
    write_audit_entry(db, "holiday", holiday_id, "HOLIDAY_DELETED", admin.id)
    db.commit()


# ---------- Balance adjustments ----------


@router.post("/employees/{employee_id}/balance-adjustments", response_model=BalanceAdjustmentOut, status_code=status.HTTP_201_CREATED)
def create_balance_adjustment(employee_id: int, payload: BalanceAdjustmentCreate, db: DbSession, admin: AdminEmployee):
    if db.get(Employee, employee_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if db.get(LeaveType, payload.leave_type_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")

    # Row-locked so two concurrent adjustments for the same balance can't race and silently
    # drop one delta (lost-update) -- mirrors the pattern used for leave-application sessions.
    balance = db.execute(
        select(EmployeeLeaveBalance)
        .where(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type_id == payload.leave_type_id,
            EmployeeLeaveBalance.year == payload.year,
        )
        .with_for_update()
    ).scalars().first()
    if balance is None:
        balance = EmployeeLeaveBalance(employee_id=employee_id, leave_type_id=payload.leave_type_id, year=payload.year)
        db.add(balance)
        db.flush()

    before_entitled = float(balance.entitled_days)
    new_entitled = before_entitled + payload.delta_days
    if new_entitled < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This adjustment would leave a negative balance ({new_entitled}); current entitlement is {before_entitled}.",
        )
    balance.entitled_days = new_entitled

    adjustment = BalanceAdjustment(
        employee_leave_balance_id=balance.id,
        adjusted_by_employee_id=admin.id,
        delta_days=payload.delta_days,
        comment=payload.comment,
    )
    db.add(adjustment)
    db.flush()

    write_audit_entry(
        db,
        "employee_leave_balance",
        balance.id,
        "MANUAL_ADJUSTMENT",
        admin.id,
        before_value={"entitled_days": before_entitled},
        after_value={"entitled_days": float(balance.entitled_days)},
        reason_code=payload.comment,
    )
    db.commit()
    db.refresh(adjustment)
    return adjustment


@router.patch("/employees/{employee_id}/leave-balances/{leave_type_id}")
def override_balance(
    employee_id: int, leave_type_id: int, payload: BalanceOverrideUpdate, db: DbSession, admin: AdminEmployee, year: int | None = None
):
    if db.get(Employee, employee_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if db.get(LeaveType, leave_type_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")

    target_year = year or datetime.now(timezone.utc).year
    balance = db.execute(
        select(EmployeeLeaveBalance)
        .where(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type_id == leave_type_id,
            EmployeeLeaveBalance.year == target_year,
        )
        .with_for_update()
    ).scalars().first()
    if balance is None:
        balance = EmployeeLeaveBalance(employee_id=employee_id, leave_type_id=leave_type_id, year=target_year)
        db.add(balance)
        db.flush()

    before = {"entitled_days": float(balance.entitled_days), "custom_override": balance.custom_override}
    balance.entitled_days = payload.entitled_days
    balance.custom_override = payload.custom_override

    write_audit_entry(
        db,
        "employee_leave_balance",
        balance.id,
        "CUSTOM_OVERRIDE",
        admin.id,
        before_value=before,
        after_value={"entitled_days": payload.entitled_days, "custom_override": payload.custom_override},
    )
    db.commit()
    return {"id": balance.id, "entitled_days": float(balance.entitled_days), "custom_override": balance.custom_override}
