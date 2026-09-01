from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "mysql+pymysql://leave_user:leave_pass@mysql:3306/leave_portal"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:3000"
    org_timezone: str = "Asia/Kolkata"
    # The OAuth client ID registered in Google Cloud Console; used to validate that Google
    # id_tokens presented to /auth/google were actually issued for this app (the `aud` claim).
    google_client_id: str = ""
    # Needed here (not just in the frontend) because refreshing a calendar access token from a
    # stored refresh_token is a server-to-server call the backend makes directly.
    google_client_secret: str = ""
    # Overridable so the seeded HR_ADMIN account can be bootstrapped with a real Google
    # account email -- Google SSO can only ever authenticate an email its account actually owns.
    seed_hr_admin_email: str = "hr.admin@teamunwritten.dev"
    seed_hr_admin_name: str = "HR Admin"
    uploads_dir: str = "/app/uploads"
    max_upload_size_bytes: int = 20 * 1024 * 1024
    # Google Workspace SMTP relay for transactional emails (leave applied/cancelled notices).
    # smtp_password must be an App Password (2-Step Verification required on that account),
    # not the account's normal login password -- Google rejects plain-password SMTP auth.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Unwritten Workmate"
    # Used to build "View request" links inside emails -- must be the browser-reachable URL,
    # not the internal container hostname (same reasoning as APP_BASE_URL in the frontend).
    app_base_url: str = "http://localhost:3000"
    # Email branding -- shown in the header/footer of leave notification emails.
    company_name: str = "Team Unwritten"
    company_legal_name: str = ""  # falls back to company_name if left blank
    company_address: str = ""  # omitted from the footer entirely if left blank
    # Support contact shown in the email footer -- falls back to smtp_user if left blank.
    hr_support_email: str = ""
    # Slack Incoming Webhook -- posts leave applied/cancelled notices to a fixed channel
    # (whichever channel the webhook was created for in Slack), including one-click
    # Approve/Reject link buttons backed by signed tokens (see action_tokens.py) -- no Slack
    # App/Interactivity setup needed, just this single webhook URL. Leave blank to disable.
    slack_webhook_url: str = ""
    # Shared secret an external scheduler (cron, GitHub Actions, etc.) presents in the
    # X-Payroll-Cron-Secret header to call POST /payroll/runs/auto-generate without a user
    # session. Left blank by default, which disables the endpoint entirely.
    payroll_cron_secret: str = ""

    @property
    def email_company_legal_name(self) -> str:
        return self.company_legal_name or self.company_name

    @property
    def email_support_address(self) -> str:
        return self.hr_support_email or self.smtp_user

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
