"""Idempotent baseline data for Team Unwritten. Safe to re-run on every container start.

Seeds only the org's policy configuration (departments, leave types, baseline policy version,
holidays) plus a single HR_ADMIN employee -- no placeholder managers/employees/demo leave data.
Further employees are provisioned by the HR admin via /admin/employees.
"""
from datetime import date, time

from sqlalchemy import select

from app.database import SessionLocal
from app.enums import (
    AccrualMode,
    EmployeeRole,
    EmploymentStatus,
    HolidayType,
    RecalculationMode,
    RestrictionAdjacency,
    YearEndBehavior,
    ZeroBalanceAction,
)
from app.models import (
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
from app.config import settings

CURRENT_YEAR = date.today().year


def run_seed() -> None:
    db = SessionLocal()
    try:
        if db.execute(select(Department)).scalars().first() is not None:
            print("Seed: departments already present, skipping seed.")
            return

        engineering = Department(name="Engineering")
        people_ops = Department(name="People Ops")
        sales = Department(name="Sales")
        db.add_all([engineering, people_ops, sales])
        db.flush()

        hr_admin = Employee(
            employee_code="EMP-001",
            full_name=settings.seed_hr_admin_name,
            email=settings.seed_hr_admin_email,
            department_id=people_ops.id,
            date_of_joining=date(CURRENT_YEAR, 1, 1),
            employment_status=EmploymentStatus.ACTIVE,
            role=EmployeeRole.HR_ADMIN,
        )
        db.add(hr_admin)
        db.flush()

        leave_type_defs = [
            ("CL", "Casual Leave", 12, AccrualMode.UPFRONT, True, True),
            ("SL", "Sick Leave", 6, AccrualMode.UPFRONT, True, True),
            ("OL", "Optional Holiday", 6, AccrualMode.UPFRONT, False, True),
            ("WFH", "Work From Home", 0, AccrualMode.UPFRONT, False, True),
            ("OD", "On Duty", 0, AccrualMode.UPFRONT, False, False),  # not used by this org
            ("LOP", "Loss of Pay", 0, AccrualMode.UPFRONT, False, True),
        ]
        leave_types: dict[str, LeaveType] = {}
        for code, name, days, mode, allow_lop, is_active in leave_type_defs:
            lt = LeaveType(
                code=code, name=name, default_annual_days=days, accrual_mode=mode,
                allow_lop_conversion=allow_lop, is_active=is_active,
            )
            db.add(lt)
            leave_types[code] = lt
        db.flush()

        policy_version = PolicyVersion(
            version_label="Team Unwritten Baseline",
            effective_from=date(CURRENT_YEAR, 1, 1),
            effective_to=None,
            recalculation_mode=RecalculationMode.PROSPECTIVE_ONLY,
            created_by_employee_id=hr_admin.id,
            notes="Default baseline policy seeded on first boot.",
        )
        db.add(policy_version)
        db.flush()

        for code, lt in leave_types.items():
            if code == "CL":
                policy = LeavePolicy(
                    policy_version_id=policy_version.id,
                    leave_type_id=lt.id,
                    notice_buffer_trigger_days=2,
                    notice_buffer_required_days=7,
                    max_backdate_days=0,
                    same_day_cutoff_time=time(10, 0),
                    year_end_behavior=YearEndBehavior.LAPSE_ALL,
                    zero_balance_action=ZeroBalanceAction.CONVERT_TO_LOP,
                    sandwich_policy_enabled=True,
                )
            elif code == "SL":
                policy = LeavePolicy(
                    policy_version_id=policy_version.id,
                    leave_type_id=lt.id,
                    notice_buffer_trigger_days=None,
                    notice_buffer_required_days=None,
                    max_backdate_days=3,
                    same_day_cutoff_time=None,
                    year_end_behavior=YearEndBehavior.LAPSE_ALL,
                    zero_balance_action=ZeroBalanceAction.CONVERT_TO_LOP,
                    sandwich_policy_enabled=True,
                )
            elif code == "WFH":
                policy = LeavePolicy(
                    policy_version_id=policy_version.id,
                    leave_type_id=lt.id,
                    same_day_cutoff_time=time(10, 0),
                    year_end_behavior=YearEndBehavior.LAPSE_ALL,
                    zero_balance_action=ZeroBalanceAction.BLOCK,
                    sandwich_policy_enabled=False,
                )
            else:
                policy = LeavePolicy(
                    policy_version_id=policy_version.id,
                    leave_type_id=lt.id,
                    year_end_behavior=YearEndBehavior.LAPSE_ALL,
                    zero_balance_action=ZeroBalanceAction.BLOCK,
                    sandwich_policy_enabled=False,
                )
            db.add(policy)

        # Probation: only Sick Leave allowed, no HR approval required. Notice period: everything
        # requires HR admin approval.
        for lt_code in ("SL",):
            db.add(
                LeaveTypeEligibilityRule(
                    policy_version_id=policy_version.id,
                    employment_status=EmploymentStatus.PROBATION,
                    leave_type_id=leave_types[lt_code].id,
                    is_allowed=True,
                    requires_hr_admin_approval=False,
                )
            )
        for lt_code in ("CL", "OL"):
            db.add(
                LeaveTypeEligibilityRule(
                    policy_version_id=policy_version.id,
                    employment_status=EmploymentStatus.PROBATION,
                    leave_type_id=leave_types[lt_code].id,
                    is_allowed=False,
                    requires_hr_admin_approval=False,
                )
            )
        for lt_code in ("CL", "SL", "OL"):
            db.add(
                LeaveTypeEligibilityRule(
                    policy_version_id=policy_version.id,
                    employment_status=EmploymentStatus.NOTICE_PERIOD,
                    leave_type_id=leave_types[lt_code].id,
                    is_allowed=True,
                    requires_hr_admin_approval=True,
                )
            )

        # Restriction: block CL immediately after SL.
        db.add(
            LeaveTypeRestriction(
                policy_version_id=policy_version.id,
                leave_type_a_id=leave_types["SL"].id,
                leave_type_b_id=leave_types["CL"].id,
                adjacency=RestrictionAdjacency.IMMEDIATELY_AFTER,
                is_blocked=True,
            )
        )

        for code, lt in leave_types.items():
            if code in ("WFH", "OD", "LOP"):
                continue
            db.add(
                EmployeeLeaveBalance(
                    employee_id=hr_admin.id,
                    leave_type_id=lt.id,
                    year=CURRENT_YEAR,
                    entitled_days=float(lt.default_annual_days),
                    accrued_days=float(lt.default_annual_days),
                    used_days=0,
                    carried_forward_days=0,
                )
            )

        holidays = [
            (date(CURRENT_YEAR, 1, 26), "Republic Day", HolidayType.STATUTORY),
            (date(CURRENT_YEAR, 8, 15), "Independence Day", HolidayType.STATUTORY),
            (date(CURRENT_YEAR, 10, 2), "Gandhi Jayanti", HolidayType.STATUTORY),
            (date(CURRENT_YEAR, 3, 25), "Holi", HolidayType.OPTIONAL),
            (date(CURRENT_YEAR, 11, 1), "Diwali", HolidayType.OPTIONAL),
        ]
        for hdate, name, htype in holidays:
            db.add(Holiday(date=hdate, name=name, holiday_type=htype, year=hdate.year))

        db.commit()
        print(
            "Seed: created baseline org config (departments, leave types, policy, holidays) and "
            f"one HR_ADMIN employee. Sign in via Google using {settings.seed_hr_admin_email} "
            "(set SEED_HR_ADMIN_EMAIL/SEED_HR_ADMIN_NAME before first boot to customize). "
            "Provision the rest of the org from /admin/employees."
        )
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
