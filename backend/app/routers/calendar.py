from datetime import date

from fastapi import APIRouter
from sqlalchemy import select

from app.deps import CurrentEmployee, DbSession
from app.enums import EmployeeRole
from app.models import DayRequest, DayRequestSession, Employee, LeaveApplication, LeaveType
from app.schemas.leave import CalendarEntryOut, mask_calendar_entry

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/team", response_model=list[CalendarEntryOut])
def get_team_calendar(
    db: DbSession,
    current: CurrentEmployee,
    department_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    stmt = (
        select(DayRequestSession, DayRequest, Employee, LeaveApplication, LeaveType.code)
        .join(DayRequest, DayRequest.id == DayRequestSession.day_request_id)
        .join(Employee, Employee.id == DayRequestSession.employee_id)
        .outerjoin(LeaveApplication, LeaveApplication.day_request_id == DayRequest.id)
        .outerjoin(LeaveType, LeaveType.id == LeaveApplication.leave_type_id)
        .where(DayRequestSession.is_active.is_(True), DayRequest.status.in_(["PENDING", "APPROVED"]))
    )
    if department_id is not None:
        stmt = stmt.where(Employee.department_id == department_id)
    if date_from is not None:
        stmt = stmt.where(DayRequestSession.session_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(DayRequestSession.session_date <= date_to)

    rows = db.execute(stmt).all()

    out = []
    for session, day_request, employee, leave_application, leave_type_code in rows:
        viewer_is_manager = employee.manager_id == current.id
        entry = {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "picture_url": employee.google_picture_url,
            "date": session.session_date,
            "session": session.session.value,
            "request_kind": day_request.request_kind.value,
            "status": day_request.status.value,
            "leave_type_code": leave_type_code,
            "notes": leave_application.reason if leave_application else None,
        }
        out.append(mask_calendar_entry(entry, current.role, current.role == EmployeeRole.HR_ADMIN or viewer_is_manager))
    return out
