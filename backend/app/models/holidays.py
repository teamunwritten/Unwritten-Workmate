from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import HolidayType


class Holiday(Base):
    __tablename__ = "holidays"
    __table_args__ = (UniqueConstraint("date", "name", name="uq_holiday_date_name"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    holiday_type: Mapped[HolidayType] = mapped_column(Enum(HolidayType, native_enum=True), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)


class OptionalHolidayPick(Base):
    __tablename__ = "optional_holiday_picks"
    __table_args__ = (UniqueConstraint("employee_id", "holiday_id", name="uq_optional_holiday_pick"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    holiday_id: Mapped[int] = mapped_column(ForeignKey("holidays.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)


class EmployeeOptionalHolidayCap(Base):
    __tablename__ = "employee_optional_holiday_caps"

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), primary_key=True)
    annual_cap: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=6)
