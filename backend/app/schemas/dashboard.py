from datetime import date, datetime

from pydantic import BaseModel, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)


class AnnouncementOut(BaseModel):
    id: int
    title: str
    body: str
    posted_by_employee_id: int
    posted_by_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BirthdayOut(BaseModel):
    employee_id: int
    full_name: str
    picture_url: str | None = None
    date_of_birth: date


class NewHireOut(BaseModel):
    employee_id: int
    full_name: str
    picture_url: str | None = None
    position: str | None = None
    role: str
    department_name: str | None = None
    date_of_joining: date


class DepartmentMemberOut(BaseModel):
    employee_id: int
    full_name: str
    picture_url: str | None = None
    position: str | None = None
    role: str
    email: str


class UpcomingHolidayOut(BaseModel):
    id: int
    date: date
    name: str
    holiday_type: str
