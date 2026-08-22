from datetime import date

from pydantic import BaseModel

from app.enums import HolidayType


class HolidayCreate(BaseModel):
    date: date
    name: str
    holiday_type: HolidayType


class HolidayBulkCreate(BaseModel):
    items: list[HolidayCreate]


class HolidayOut(BaseModel):
    id: int
    date: date
    name: str
    holiday_type: HolidayType
    year: int

    model_config = {"from_attributes": True}


class OptionalHolidayPickCreate(BaseModel):
    holiday_id: int
