from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.enums import EmployeeRole
from app.models import Employee
from app.services.auth import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def get_current_employee(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Employee:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    employee = db.get(Employee, int(payload["sub"]))
    if employee is None or not employee.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Employee not found or inactive")
    return employee


CurrentEmployee = Annotated[Employee, Depends(get_current_employee)]


def require_role(*roles: EmployeeRole):
    def _checker(employee: CurrentEmployee) -> Employee:
        if employee.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return employee

    return _checker


def require_admin(employee: CurrentEmployee) -> Employee:
    if employee.role != EmployeeRole.HR_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR admin access required")
    return employee


AdminEmployee = Annotated[Employee, Depends(require_admin)]


def require_payroll_cron_secret(x_payroll_cron_secret: Annotated[str | None, Header()] = None) -> None:
    """Lets an external scheduler (no user session) call the payroll auto-generate endpoint.
    Disabled by default -- an unset secret always rejects, so the endpoint is inert until an
    operator explicitly configures PAYROLL_CRON_SECRET."""
    if not settings.payroll_cron_secret or x_payroll_cron_secret != settings.payroll_cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing cron secret")


PayrollCron = Annotated[None, Depends(require_payroll_cron_secret)]
