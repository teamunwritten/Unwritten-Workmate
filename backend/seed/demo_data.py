"""Opt-in demo data for UI/load testing -- NOT run on container boot, NOT idempotent-by-default
like seed.py. Generates a realistic-sized org (~10 departments, ~200 employees across a 3-level
manager hierarchy, ~300 leave requests spanning past/pending/current/future) so tables, the org
tree, and the approvals queue have real volume to page/sort/filter/bulk-act over.

Usage (inside the backend container):
    python -m seed.demo_data            # generate once; no-ops if demo data already exists
    python -m seed.demo_data --reset    # delete existing demo data first, then regenerate

Every synthetic employee gets an `employee_code` prefixed "DEMO-" so this script can find and
remove exactly what it created without touching the baseline HR admin or org config from seed.py.
None of these employees can sign in (no real Google account behind their email) -- they exist
purely to give the admin/approvals/history screens something to render at scale.
"""
import random
import sys
from datetime import date, datetime, timedelta

from faker import Faker
from sqlalchemy import delete, select, text

from app.database import SessionLocal
from app.enums import DayRequestStatus, EmployeeRole, EmploymentStatus, RequestKind, ResolutionType, SessionType
from app.models import Department, DayRequest, DayRequestSession, Employee, LeaveApplication, LeaveType, PolicyVersion
from seed.seed import run_seed

fake = Faker()
Faker.seed(20260829)
random.seed(20260829)

DEMO_PREFIX = "DEMO-"
TODAY = date(2026, 8, 29)

DEMO_DEPARTMENTS = [
    "Product",
    "Design",
    "Customer Success",
    "Finance",
    "Marketing",
    "Legal",
    "Data & Analytics",
    "Infrastructure",
    "Quality Assurance",
    "Talent Acquisition",
]

TARGET_EMPLOYEES = 200


def _clear_demo_data(db) -> None:
    demo_employee_ids = [row[0] for row in db.execute(select(Employee.id).where(Employee.employee_code.like(f"{DEMO_PREFIX}%"))).all()]
    if not demo_employee_ids:
        print("Reset: no demo employees found, nothing to clear.")
        return

    day_request_ids = [
        row[0] for row in db.execute(select(DayRequest.id).where(DayRequest.employee_id.in_(demo_employee_ids))).all()
    ]
    if day_request_ids:
        # DayRequestSession/LeaveApplication both cascade on day_request_id at the DB level.
        db.execute(delete(DayRequest).where(DayRequest.id.in_(day_request_ids)))

    # Break the self-referential manager_id chain before deleting, otherwise FK constraints
    # block removing a manager whose reports haven't been deleted yet.
    db.execute(
        text("UPDATE employees SET manager_id = NULL WHERE employee_code LIKE :prefix").bindparams(prefix=f"{DEMO_PREFIX}%")
    )
    db.execute(delete(Employee).where(Employee.employee_code.like(f"{DEMO_PREFIX}%")))
    db.execute(delete(Department).where(Department.name.in_(DEMO_DEPARTMENTS)))
    db.commit()
    print(f"Reset: removed {len(demo_employee_ids)} demo employees and their leave requests.")


def _make_employees(db, departments: list[Department], hr_admin: Employee) -> list[Employee]:
    # Level 1: ~10 department managers reporting to the HR admin.
    dept_managers: list[Employee] = []
    for dept in departments:
        emp = Employee(
            employee_code=f"{DEMO_PREFIX}{len(dept_managers) + 1:04d}",
            full_name=fake.name(),
            email=f"demo.{fake.unique.user_name()}@teamunwritten.dev",
            department_id=dept.id,
            manager_id=hr_admin.id,
            date_of_joining=fake.date_between(start_date="-6y", end_date="-2y"),
            employment_status=EmploymentStatus.ACTIVE,
            role=EmployeeRole.MANAGER,
            position=f"Head of {dept.name}",
        )
        db.add(emp)
        dept_managers.append(emp)
    db.flush()

    # Level 2: ~3 team leads per department, reporting to that department's manager.
    team_leads: list[Employee] = []
    counter = len(dept_managers) + 1
    for manager in dept_managers:
        for _ in range(3):
            emp = Employee(
                employee_code=f"{DEMO_PREFIX}{counter:04d}",
                full_name=fake.name(),
                email=f"demo.{fake.unique.user_name()}@teamunwritten.dev",
                department_id=manager.department_id,
                manager_id=manager.id,
                date_of_joining=fake.date_between(start_date="-4y", end_date="-1y"),
                employment_status=EmploymentStatus.ACTIVE,
                role=EmployeeRole.MANAGER,
                position="Team Lead",
            )
            db.add(emp)
            team_leads.append(emp)
            counter += 1
    db.flush()

    # Level 3: the rest of the org, reporting to a team lead, filling up to TARGET_EMPLOYEES.
    individual_contributors: list[Employee] = []
    statuses = [EmploymentStatus.ACTIVE] * 85 + [EmploymentStatus.PROBATION] * 10 + [EmploymentStatus.NOTICE_PERIOD] * 5
    titles = ["Software Engineer", "Analyst", "Associate", "Specialist", "Coordinator", "Consultant"]
    remaining = TARGET_EMPLOYEES - len(dept_managers) - len(team_leads)
    for _ in range(remaining):
        lead = random.choice(team_leads)
        status = random.choice(statuses)
        emp = Employee(
            employee_code=f"{DEMO_PREFIX}{counter:04d}",
            full_name=fake.name(),
            email=f"demo.{fake.unique.user_name()}@teamunwritten.dev",
            department_id=lead.department_id,
            manager_id=lead.id,
            date_of_joining=fake.date_between(start_date="-3y", end_date="-1m"),
            employment_status=status,
            role=EmployeeRole.EMPLOYEE,
            position=random.choice(titles),
            notice_period_start=TODAY - timedelta(days=10) if status == EmploymentStatus.NOTICE_PERIOD else None,
            notice_period_end=TODAY + timedelta(days=20) if status == EmploymentStatus.NOTICE_PERIOD else None,
        )
        db.add(emp)
        individual_contributors.append(emp)
        counter += 1
    db.flush()

    return dept_managers + team_leads + individual_contributors


def _make_leave_requests(db, employees: list[Employee], leave_types: list[LeaveType], policy_version: PolicyVersion, hr_admin: Employee) -> int:
    non_lop_types = [lt for lt in leave_types if lt.code not in ("LOP", "OD")]
    booked_slots: set[tuple[int, date, SessionType]] = set()
    created = 0

    buckets = (
        [("past_approved", 120)]
        + [("past_rejected", 40)]
        + [("pending_level_1", 60)]
        + [("pending_level_2", 30)]
        + [("current", 15)]
        + [("future", 35)]
    )

    def pick_dates(bucket: str) -> tuple[date, date]:
        span = random.choice([1, 1, 1, 2, 3, 5])
        if bucket == "past_approved" or bucket == "past_rejected":
            start = TODAY - timedelta(days=random.randint(10, 540))
        elif bucket in ("pending_level_1", "pending_level_2"):
            start = TODAY + timedelta(days=random.randint(1, 21))
        elif bucket == "current":
            start = TODAY - timedelta(days=random.randint(0, span))
        else:  # future
            start = TODAY + timedelta(days=random.randint(22, 180))
        return start, start + timedelta(days=span - 1)

    for bucket, count in buckets:
        for _ in range(count):
            employee = random.choice(employees)
            leave_type = random.choice(non_lop_types)
            start, end = pick_dates(bucket)

            day = start
            slots: list[tuple[date, SessionType]] = []
            while day <= end:
                if (employee.id, day, SessionType.FULL_DAY) not in booked_slots:
                    slots.append((day, SessionType.FULL_DAY))
                day += timedelta(days=1)
            if not slots:
                continue
            for slot in slots:
                booked_slots.add((employee.id, *slot))

            applied_days = float(len(slots))
            actual_start, actual_end = slots[0][0], slots[-1][0]

            if bucket == "past_approved":
                status, resolution, pending_level, approver = DayRequestStatus.APPROVED, ResolutionType.APPROVED, 1, employee.manager_id
            elif bucket == "past_rejected":
                status, resolution, pending_level, approver = DayRequestStatus.REJECTED, ResolutionType.BLOCKED, 1, employee.manager_id
            elif bucket == "pending_level_1":
                status, resolution, pending_level, approver = DayRequestStatus.PENDING, ResolutionType.PENDING_APPROVAL, 1, employee.manager_id
            elif bucket == "pending_level_2":
                status, resolution, pending_level, approver = DayRequestStatus.PENDING, ResolutionType.PENDING_APPROVAL, 2, hr_admin.id
            else:  # current / future -- already approved ahead of time
                status, resolution, pending_level, approver = DayRequestStatus.APPROVED, ResolutionType.APPROVED, 1, employee.manager_id

            day_request = DayRequest(
                employee_id=employee.id,
                request_kind=RequestKind.LEAVE,
                start_date=actual_start,
                end_date=actual_end,
                status=status,
            )
            db.add(day_request)
            db.flush()

            for slot_date, session_type in slots:
                db.add(
                    DayRequestSession(
                        day_request_id=day_request.id,
                        employee_id=employee.id,
                        session_date=slot_date,
                        session=session_type,
                        day_value=1.0,
                        is_active=status in (DayRequestStatus.PENDING, DayRequestStatus.APPROVED),
                    )
                )

            applied_at = datetime.combine(actual_start, datetime.min.time()) - timedelta(days=random.randint(3, 14))
            db.add(
                LeaveApplication(
                    day_request_id=day_request.id,
                    leave_type_id=leave_type.id,
                    applied_days=applied_days,
                    sandwich_days_added=0,
                    total_deducted_days=applied_days,
                    is_lop=False,
                    resolution_type=resolution,
                    reason=fake.sentence(nb_words=6),
                    applied_at=applied_at,
                    policy_version_id=policy_version.id,
                    approver_employee_id=approver,
                    pending_level=pending_level,
                )
            )
            created += 1

    db.commit()
    return created


def main() -> None:
    reset = "--reset" in sys.argv
    db = SessionLocal()
    try:
        run_seed()  # no-op if baseline config already exists

        if reset:
            _clear_demo_data(db)

        already_seeded = db.execute(select(Employee.id).where(Employee.employee_code.like(f"{DEMO_PREFIX}%")).limit(1)).first()
        if already_seeded:
            print("Demo data already present -- pass --reset to regenerate. Nothing to do.")
            return

        hr_admin = db.execute(select(Employee).where(Employee.role == EmployeeRole.HR_ADMIN)).scalars().first()
        policy_version = db.execute(select(PolicyVersion)).scalars().first()
        leave_types = db.execute(select(LeaveType)).scalars().all()
        if hr_admin is None or policy_version is None or not leave_types:
            print("Baseline seed data missing (no HR admin / policy version / leave types) -- aborting.", file=sys.stderr)
            sys.exit(1)

        departments = [Department(name=name) for name in DEMO_DEPARTMENTS]
        db.add_all(departments)
        db.flush()

        employees = _make_employees(db, departments, hr_admin)
        db.commit()
        print(f"Created {len(employees)} demo employees across {len(departments)} new departments.")

        created = _make_leave_requests(db, employees, list(leave_types), policy_version, hr_admin)
        print(f"Created {created} demo leave requests.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
