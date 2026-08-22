from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentEmployee, DbSession
from app.models import Department, Employee
from app.schemas.auth import CurrentEmployeeOut, GoogleAuthRequest, LoginResponse
from app.services.auth import create_access_token
from app.services.google_auth import verify_google_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=LoginResponse)
def google_login(payload: GoogleAuthRequest, db: DbSession) -> LoginResponse:
    try:
        identity = verify_google_id_token(payload.id_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {exc}") from exc

    if not identity.email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is not verified")

    employee = db.execute(select(Employee).where(Employee.email == identity.email)).scalars().first()
    if employee is None or not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active employee record matches this Google account. Ask HR admin to provision your account with this email.",
        )

    if employee.google_sub is None:
        employee.google_sub = identity.sub
    elif employee.google_sub != identity.sub:
        # The employee's email now resolves to a different Google account than last time.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account mismatch for this email")

    if payload.calendar_refresh_token:
        employee.google_calendar_refresh_token = payload.calendar_refresh_token
    employee.google_picture_url = identity.picture_url or payload.picture_url_hint
    db.commit()

    token = create_access_token(employee.id, employee.role.value)
    return LoginResponse(access_token=token)


@router.get("/me", response_model=CurrentEmployeeOut)
def me(current: CurrentEmployee, db: DbSession) -> CurrentEmployeeOut:
    department = db.get(Department, current.department_id)
    manager = db.get(Employee, current.manager_id) if current.manager_id else None
    return CurrentEmployeeOut.model_validate(
        {
            "id": current.id,
            "employee_code": current.employee_code,
            "full_name": current.full_name,
            "email": current.email,
            "picture_url": current.google_picture_url,
            "position": current.position,
            "role": current.role.value,
            "employment_status": current.employment_status.value,
            "department_id": current.department_id,
            "department_name": department.name if department else None,
            "manager_id": current.manager_id,
            "manager_name": manager.full_name if manager else None,
            "date_of_joining": current.date_of_joining.isoformat(),
        }
    )
