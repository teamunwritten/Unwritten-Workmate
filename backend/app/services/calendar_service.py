from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Holiday
from app.schemas.leave import SessionInput


def get_holiday_dates(db: Session, years: set[int]) -> set[date]:
    if not years:
        return set()
    rows = db.execute(select(Holiday.date).where(Holiday.year.in_(years))).scalars().all()
    return set(rows)


def is_working_day(d: date, holiday_dates: set[date]) -> bool:
    """Saturday/Sunday or a statutory/optional holiday is never a working day, regardless of
    which leave policy is in effect -- weekends and holidays are already non-working, so leave
    applied against them must never deduct from balance (that's what sandwich policy is for,
    handled separately, on top of this)."""
    return d.weekday() < 5 and d not in holiday_dates


def filter_working_sessions(sessions: list[SessionInput], holiday_dates: set[date]) -> list[SessionInput]:
    return [s for s in sessions if is_working_day(s.date, holiday_dates)]
