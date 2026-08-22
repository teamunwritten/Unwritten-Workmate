from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminEmployee, CurrentEmployee, DbSession
from app.models import Announcement, Department, Employee, Holiday
from app.schemas.dashboard import (
    AnnouncementCreate,
    AnnouncementOut,
    BirthdayOut,
    DepartmentMemberOut,
    NewHireOut,
    UpcomingHolidayOut,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

NEW_HIRE_WINDOW_DAYS = 90
BIRTHDAY_WINDOW_DAYS = 30
UPCOMING_HOLIDAYS_LIMIT = 5
DEPARTMENT_MEMBERS_LIMIT = 12


@router.get("/announcements", response_model=list[AnnouncementOut])
def list_announcements(db: DbSession, _: CurrentEmployee, limit: int = 5):
    rows = db.execute(
        select(Announcement, Employee.full_name)
        .join(Employee, Employee.id == Announcement.posted_by_employee_id)
        .order_by(Announcement.created_at.desc())
        .limit(limit)
    ).all()
    return [
        AnnouncementOut(
            id=a.id, title=a.title, body=a.body, posted_by_employee_id=a.posted_by_employee_id,
            posted_by_name=name, created_at=a.created_at,
        )
        for a, name in rows
    ]


@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate, db: DbSession, admin: AdminEmployee):
    announcement = Announcement(title=payload.title, body=payload.body, posted_by_employee_id=admin.id)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return AnnouncementOut(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        posted_by_employee_id=announcement.posted_by_employee_id,
        posted_by_name=admin.full_name,
        created_at=announcement.created_at,
    )


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(announcement_id: int, db: DbSession, _: AdminEmployee):
    announcement = db.get(Announcement, announcement_id)
    if announcement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    db.delete(announcement)
    db.commit()


def _day_of_year_distance(today: date, dob: date) -> int:
    """Days from today to this year's (or next year's) occurrence of dob's month/day."""
    try:
        next_occurrence = dob.replace(year=today.year)
    except ValueError:
        next_occurrence = date(today.year, 3, 1)  # Feb 29 in a non-leap year
    if next_occurrence < today:
        try:
            next_occurrence = dob.replace(year=today.year + 1)
        except ValueError:
            next_occurrence = date(today.year + 1, 3, 1)
    return (next_occurrence - today).days


@router.get("/birthdays", response_model=list[BirthdayOut])
def upcoming_birthdays(db: DbSession, _: CurrentEmployee):
    today = date.today()
    employees = db.execute(
        select(Employee).where(Employee.is_active.is_(True), Employee.date_of_birth.is_not(None))
    ).scalars().all()

    upcoming = [
        (e, _day_of_year_distance(today, e.date_of_birth))
        for e in employees
    ]
    upcoming = [(e, d) for e, d in upcoming if d <= BIRTHDAY_WINDOW_DAYS]
    upcoming.sort(key=lambda pair: pair[1])

    return [
        BirthdayOut(employee_id=e.id, full_name=e.full_name, picture_url=e.google_picture_url, date_of_birth=e.date_of_birth)
        for e, _ in upcoming
    ]


@router.get("/new-hires", response_model=list[NewHireOut])
def new_hires(db: DbSession, _: CurrentEmployee):
    cutoff = date.today() - timedelta(days=NEW_HIRE_WINDOW_DAYS)
    rows = db.execute(
        select(Employee, Department.name)
        .join(Department, Department.id == Employee.department_id)
        .where(Employee.is_active.is_(True), Employee.date_of_joining >= cutoff)
        .order_by(Employee.date_of_joining.desc())
    ).all()
    return [
        NewHireOut(
            employee_id=e.id, full_name=e.full_name, picture_url=e.google_picture_url, position=e.position, role=e.role.value,
            department_name=dept_name, date_of_joining=e.date_of_joining,
        )
        for e, dept_name in rows
    ]


@router.get("/department-members", response_model=list[DepartmentMemberOut])
def department_members(db: DbSession, current: CurrentEmployee):
    rows = db.execute(
        select(Employee)
        .where(
            Employee.department_id == current.department_id,
            Employee.id != current.id,
            Employee.is_active.is_(True),
        )
        .order_by(Employee.full_name)
        .limit(DEPARTMENT_MEMBERS_LIMIT)
    ).scalars().all()
    return [
        DepartmentMemberOut(
            employee_id=e.id, full_name=e.full_name, picture_url=e.google_picture_url, position=e.position,
            role=e.role.value, email=e.email,
        )
        for e in rows
    ]


@router.get("/holidays", response_model=list[UpcomingHolidayOut])
def upcoming_holidays(db: DbSession, _: CurrentEmployee):
    rows = db.execute(
        select(Holiday).where(Holiday.date >= date.today()).order_by(Holiday.date.asc()).limit(UPCOMING_HOLIDAYS_LIMIT)
    ).scalars().all()
    return [UpcomingHolidayOut(id=h.id, date=h.date, name=h.name, holiday_type=h.holiday_type.value) for h in rows]
