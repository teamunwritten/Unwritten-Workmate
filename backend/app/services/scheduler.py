"""In-process month-end payroll scheduler.

Runs inside the same FastAPI process as the API server (started from main.py's startup event) --
no external cron, container, or infra is needed for auto-generation to actually happen. A daily
job checks whether today is the last day of the month and, if so, creates the payroll run and
DRAFT payslips for the current period via the same run_auto_generate() path the ops-facing
POST /payroll/runs/auto-generate endpoint uses. Payslips still land as DRAFT -- an admin must
approve them (see routers/payroll.py) before an employee sees or is emailed one; the scheduler
only removes the manual "remember to create this month's run" step.

Only correct with a single API process (the entrypoint runs plain `uvicorn ... app.main:app`
with no --workers flag) -- running multiple backend replicas would fire this job once per
replica. If this is ever scaled horizontally, this job needs to move to a dedicated worker or
gain a DB-level lock.
"""
import logging
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import SessionLocal
from app.services.payroll_service import run_auto_generate

logger = logging.getLogger("payroll.scheduler")
# The app never calls logging.basicConfig(), so the root logger's default WARNING level (and
# lack of a handler) would silently swallow these -- attach our own handler/level so this
# scheduler's activity actually shows up in `docker compose logs backend`.
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)

_scheduler: BackgroundScheduler | None = None


def _is_last_day_of_month(d: date) -> bool:
    return (d + timedelta(days=1)).month != d.month


def run_month_end_job() -> None:
    today = date.today()
    if not _is_last_day_of_month(today):
        logger.info("Daily payroll check: %s is not the last day of the month, nothing to do.", today.isoformat())
        return

    logger.info("Daily payroll check: %s is the last day of the month, auto-generating this period's run.", today.isoformat())
    db = SessionLocal()
    try:
        result = run_auto_generate(db, today.month, today.year)
        logger.info(
            "Payroll month-end auto-generate: period=%s-%s run_created=%s payslips_generated=%s skipped_reason=%s",
            today.year, today.month, result.run_created, result.payslips_generated, result.skipped_reason,
        )
    except Exception:
        logger.exception("Payroll month-end auto-generate job failed")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone=ZoneInfo(settings.org_timezone))
    # Checks once a day; run_month_end_job itself no-ops unless today is the last day of the
    # month, so this is what makes payroll generation actually automatic.
    _scheduler.add_job(run_month_end_job, "cron", hour=20, minute=0, id="payroll_month_end", replace_existing=True)
    _scheduler.start()
    logger.info("Payroll month-end scheduler started (daily check at 20:00 %s)", settings.org_timezone)

    # Also check once right now -- catches the case where the process was down at 20:00 on the
    # last day of the month (deploy, restart, crash) and gives immediate log feedback on every
    # startup instead of waiting up to 24h for the first visible sign it's working.
    run_month_end_job()
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
