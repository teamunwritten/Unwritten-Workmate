"""Transactional email for leave lifecycle events (applied / cancelled), sent via Google
Workspace SMTP.

Best-effort by design, same pattern as google_calendar_service.py: every call here is wrapped by
the caller in a try/except so an SMTP hiccup (auth failure, transient network error) never blocks
or rolls back the leave transaction itself -- the database record is always the source of truth,
the email is a convenience notification.
"""
import smtplib
from datetime import date
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from sqlalchemy.orm import Session

from app.config import settings
from app.models import DayRequest, Department, Employee, EmployeeLeaveBalance, LeaveApplication, LeaveType
from app.services.accrual_service import compute_available_balance
from app.services.email_templates import ActionButton, DetailRow, EmailAction, render_leave_notification_email

REQUEST_TIMEOUT_SECONDS = 8


def _send(to_email: str, cc_email: str | None, subject: str, html: str) -> None:
    if not settings.smtp_user or not settings.smtp_password:
        return  # SMTP not configured -- silently skip rather than raise.

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg["To"] = to_email
    recipients = [to_email]
    if cc_email:
        msg["Cc"] = cc_email
        recipients.append(cc_email)
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=REQUEST_TIMEOUT_SECONDS) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, recipients, msg.as_string())


def _duration_label(day_request: DayRequest, application: LeaveApplication) -> str:
    date_range = day_request.start_date.strftime("%d %b %Y")
    if day_request.end_date != day_request.start_date:
        date_range += f" — {day_request.end_date.strftime('%d %b %Y')}"
    days = float(application.total_deducted_days)
    day_word = "day" if days == 1 else "days"
    return f"{date_range} &nbsp;(<span style=\"color:#374151;\">{days:g} {day_word}</span>)"


def _common_rows(db: Session, applicant: Employee, application: LeaveApplication, day_request: DayRequest, leave_type: LeaveType) -> list[DetailRow]:
    department = db.get(Department, applicant.department_id) if applicant.department_id else None
    manager = db.get(Employee, applicant.manager_id) if applicant.manager_id else None

    department_value = department.name if department else "—"
    if manager:
        department_value += f" &nbsp;·&nbsp; Reports to {manager.full_name}"

    rows = [
        DetailRow("Employee", f"{applicant.full_name} &nbsp;·&nbsp; {applicant.employee_code}"),
        DetailRow("Department", department_value),
        DetailRow("Leave Type", leave_type.name),
        DetailRow("Duration", _duration_label(day_request, application)),
    ]

    if not application.is_lop:
        balance = (
            db.query(EmployeeLeaveBalance)
            .filter(
                EmployeeLeaveBalance.employee_id == applicant.id,
                EmployeeLeaveBalance.leave_type_id == leave_type.id,
                EmployeeLeaveBalance.year == day_request.start_date.year,
            )
            .first()
        )
        total = float(balance.entitled_days) if balance else float(leave_type.default_annual_days)
        available_now = float(compute_available_balance(applicant, leave_type, balance, date.today()))
        remaining_after = max(0.0, available_now - float(application.total_deducted_days))
        rows.append(DetailRow("Leave Balance", f"{remaining_after:g} of {total:g} days remaining after this request"))

    rows.append(DetailRow("Reason", application.reason or "—"))
    return rows


def send_leave_applied_email(
    db: Session,
    approver: Employee,
    applicant: Employee,
    application: LeaveApplication,
    day_request: DayRequest,
    leave_type: LeaveType,
) -> None:
    approvals_url = f"{settings.app_base_url}/approvals"
    html = render_leave_notification_email(
        request_id=application.id,
        title="Leave Request Submitted",
        intro_html="A new leave request has been submitted and is pending your approval.",
        status="PENDING",
        rows=_common_rows(db, applicant, application, day_request, leave_type),
        action=EmailAction(
            buttons=[
                ActionButton(label="Approve Request", url=approvals_url, primary=True),
                ActionButton(label="Decline", url=approvals_url, primary=False),
            ],
            footer_link_url=approvals_url,
        ),
    )
    _send(
        to_email=approver.email,
        cc_email=applicant.email,
        subject=f"New leave request from {applicant.full_name} — pending your review",
        html=html,
    )


def send_leave_cancelled_email(
    db: Session,
    approver: Employee,
    applicant: Employee,
    application: LeaveApplication,
    day_request: DayRequest,
    leave_type: LeaveType,
) -> None:
    history_url = f"{settings.app_base_url}/leave/history"
    html = render_leave_notification_email(
        request_id=application.id,
        title="Approved Leave Cancelled",
        intro_html=f"{applicant.full_name} has cancelled a previously approved leave request.",
        status="CANCELLED",
        rows=_common_rows(db, applicant, application, day_request, leave_type),
        action=EmailAction(buttons=[], footer_link_url=history_url, footer_link_label="Workforce Portal dashboard"),
    )
    _send(
        to_email=approver.email,
        cc_email=applicant.email,
        subject=f"{applicant.full_name} cancelled an approved leave",
        html=html,
    )
