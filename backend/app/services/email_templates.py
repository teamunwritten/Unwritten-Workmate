"""Shared HTML email template for leave-lifecycle notifications.

Kept deliberately simple/table-based (no flexbox/grid) since that's what actually renders
consistently across Gmail, Outlook, and other email clients -- modern CSS layout is unreliable
in email HTML.
"""
from dataclasses import dataclass, field
from datetime import date

from app.config import settings

ACCENT_COLOR = "#0b3d91"
INK_COLOR = "#111827"
BODY_COLOR = "#4b5563"
LABEL_COLOR = "#6b7280"
MUTED_COLOR = "#9ca3af"
BORDER_COLOR = "#e5e7eb"
ROW_BG = "#f9fafb"
FOOTER_BG = "#fafafa"

REQUEST_KIND_LABEL = {"LEAVE": "Leave", "WFH": "Work From Home", "OD": "On Duty"}

STATUS_STYLE = {
    "PENDING": ("Awaiting Approval", "#92400e"),
    "APPROVED": ("Approved", "#17874a"),
    "REJECTED": ("Declined", "#c4271e"),
    "CANCELLED": ("Cancelled", "#6b7280"),
}


@dataclass
class DetailRow:
    label: str
    value: str


@dataclass
class ActionButton:
    label: str
    url: str
    primary: bool = True


@dataclass
class EmailAction:
    buttons: list[ActionButton] = field(default_factory=list)
    footer_link_label: str = "Workforce Portal dashboard"
    footer_link_url: str = ""


def _row_html(row: DetailRow) -> str:
    return f"""
    <tr>
      <td style="padding:11px 16px; font-size:12.5px; color:{LABEL_COLOR}; background-color:{ROW_BG}; border-bottom:1px solid {BORDER_COLOR}; width:38%; vertical-align:top;">{row.label}</td>
      <td style="padding:11px 16px; font-size:13px; color:{INK_COLOR}; border-bottom:1px solid {BORDER_COLOR};">{row.value}</td>
    </tr>
    """


def _button_html(button: ActionButton) -> str:
    if button.primary:
        return f"""
        <td style="padding-right:10px;">
          <a href="{button.url}" style="display:inline-block; background-color:{ACCENT_COLOR}; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:10px 22px;">
            {button.label}
          </a>
        </td>
        """
    return f"""
    <td>
      <a href="{button.url}" style="display:inline-block; background-color:#ffffff; color:#374151; text-decoration:none; font-size:13px; font-weight:600; padding:9px 22px; border:1px solid #d1d5db;">
        {button.label}
      </a>
    </td>
    """


def render_leave_notification_email(
    *,
    request_id: int,
    title: str,
    intro_html: str,
    status: str,
    rows: list[DetailRow],
    action: EmailAction,
) -> str:
    status_label, status_color = STATUS_STYLE.get(status, (status.title(), "#6b7280"))
    rows_html = "".join(_row_html(r) for r in rows)
    buttons_html = "".join(_button_html(b) for b in action.buttons)
    year = date.today().year

    footer_link = (
        f"""<p style="margin:0; font-size:12px; color:{MUTED_COLOR};">
              Or review this request from the <a href="{action.footer_link_url}" style="color:{ACCENT_COLOR}; text-decoration:none;">{action.footer_link_label}</a>.
            </p>"""
        if action.footer_link_url
        else ""
    )

    address_line = f" &nbsp;|&nbsp; {settings.company_address}" if settings.company_address else ""
    support_line = (
        f"""For assistance, contact <a href="mailto:{settings.email_support_address}" style="color:{MUTED_COLOR};">{settings.email_support_address}</a>."""
        if settings.email_support_address
        else ""
    )

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">

    <tr>
      <td style="height:3px; background-color:{ACCENT_COLOR}; font-size:0; line-height:0;">&nbsp;</td>
    </tr>

    <tr>
      <td style="padding:24px 48px; border-bottom:1px solid {BORDER_COLOR};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:15px; font-weight:600; color:{INK_COLOR}; letter-spacing:0.2px;">
              {settings.company_name}
            </td>
            <td align="right" style="font-size:11px; color:{MUTED_COLOR}; text-transform:uppercase; letter-spacing:0.6px;">
              HR Systems
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 0 48px;">
        <p style="margin:0; font-size:11px; color:{MUTED_COLOR}; text-transform:uppercase; letter-spacing:0.8px; font-weight:600;">
          Workforce Management
        </p>
        <h1 style="margin:6px 0 0 0; font-size:19px; font-weight:600; color:{INK_COLOR};">
          {title}
        </h1>
        <p style="margin:10px 0 0 0; font-size:13.5px; color:{BODY_COLOR}; line-height:1.6; max-width:520px;">
          {intro_html} Reference number <strong style="color:{INK_COLOR};">#{request_id}</strong>.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 48px 0 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid {BORDER_COLOR}; max-width:560px;">
          {rows_html}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 48px 0 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12.5px; color:{LABEL_COLOR};">Status:</td>
            <td style="padding-left:8px; font-size:12.5px; color:{status_color}; font-weight:600;">{status_label}</td>
          </tr>
        </table>
      </td>
    </tr>

    {"" if not buttons_html else f'''
    <tr>
      <td style="padding:26px 48px 8px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            {buttons_html}
          </tr>
        </table>
      </td>
    </tr>
    '''}

    <tr>
      <td style="padding:14px 48px 40px 48px;">
        {footer_link}
      </td>
    </tr>

    <tr>
      <td style="padding:20px 48px; border-top:1px solid {BORDER_COLOR}; background-color:{FOOTER_BG};">
        <p style="margin:0; font-size:11px; color:{MUTED_COLOR}; line-height:1.6;">
          This is a system-generated message from the {settings.company_name} Workforce Portal. Please do not reply directly to this email.
          {support_line}
        </p>
        <p style="margin:10px 0 0 0; font-size:11px; color:#c1c5cb;">
          © {year} {settings.email_company_legal_name}. All rights reserved.{address_line}
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
"""
