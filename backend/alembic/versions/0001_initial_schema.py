"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("parent_department_id", sa.BigInteger(), sa.ForeignKey("departments.id"), nullable=True),
    )

    op.create_table(
        "employees",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("employee_code", sa.String(30), nullable=False, unique=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(190), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("department_id", sa.BigInteger(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("manager_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("date_of_joining", sa.Date(), nullable=False),
        sa.Column(
            "employment_status",
            sa.Enum("PROBATION", "ACTIVE", "NOTICE_PERIOD", "TERMINATED", name="employmentstatus"),
            nullable=False,
            server_default="PROBATION",
        ),
        sa.Column("notice_period_start", sa.Date(), nullable=True),
        sa.Column("notice_period_end", sa.Date(), nullable=True),
        sa.Column(
            "role",
            sa.Enum("EMPLOYEE", "MANAGER", "HR_ADMIN", name="employeerole"),
            nullable=False,
            server_default="EMPLOYEE",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint(
            "notice_period_end IS NULL OR notice_period_start IS NULL OR notice_period_end >= notice_period_start",
            name="ck_employee_notice_period_range",
        ),
    )
    op.create_index("ix_employees_department_id", "employees", ["department_id"])
    op.create_index("ix_employees_manager_id", "employees", ["manager_id"])

    op.create_table(
        "leave_types",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(10), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("default_annual_days", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column(
            "accrual_mode",
            sa.Enum("UPFRONT", "MONTHLY", "QUARTERLY", name="accrualmode"),
            nullable=False,
            server_default="UPFRONT",
        ),
        sa.Column("allow_lop_conversion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("default_annual_days >= 0", name="ck_leave_type_default_days_nonneg"),
    )

    op.create_table(
        "policy_versions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("version_label", sa.String(120), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column(
            "recalculation_mode",
            sa.Enum("PROSPECTIVE_ONLY", "RETROSPECTIVE_RECALC", name="recalculationmode"),
            nullable=False,
            server_default="PROSPECTIVE_ONLY",
        ),
        sa.Column("created_by_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "leave_policies",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("policy_version_id", sa.BigInteger(), sa.ForeignKey("policy_versions.id"), nullable=False),
        sa.Column("leave_type_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("notice_buffer_trigger_days", sa.Numeric(4, 1), nullable=True),
        sa.Column("notice_buffer_required_days", sa.Integer(), nullable=True),
        sa.Column("max_backdate_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("same_day_cutoff_time", sa.Time(), nullable=True),
        sa.Column(
            "year_end_behavior",
            sa.Enum("LAPSE_ALL", "CARRY_FORWARD_CAPPED", "CARRY_FORWARD_ALL", name="yearendbehavior"),
            nullable=False,
            server_default="LAPSE_ALL",
        ),
        sa.Column("carry_forward_cap", sa.Numeric(4, 1), nullable=True),
        sa.Column(
            "zero_balance_action",
            sa.Enum("BLOCK", "CONVERT_TO_LOP", name="zerobalanceaction"),
            nullable=False,
            server_default="BLOCK",
        ),
        sa.Column("sandwich_policy_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("policy_version_id", "leave_type_id", name="uq_leave_policy_version_type"),
    )
    op.create_index("ix_leave_policies_policy_version_id", "leave_policies", ["policy_version_id"])
    op.create_index("ix_leave_policies_leave_type_id", "leave_policies", ["leave_type_id"])

    op.create_table(
        "leave_type_eligibility_rules",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("policy_version_id", sa.BigInteger(), sa.ForeignKey("policy_versions.id"), nullable=False),
        sa.Column(
            "employment_status",
            sa.Enum("PROBATION", "ACTIVE", "NOTICE_PERIOD", "TERMINATED", name="employmentstatus_elig"),
            nullable=False,
        ),
        sa.Column("leave_type_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("is_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("requires_hr_admin_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint(
            "policy_version_id", "employment_status", "leave_type_id", name="uq_eligibility_rule"
        ),
    )
    op.create_index("ix_eligibility_rules_policy_version_id", "leave_type_eligibility_rules", ["policy_version_id"])

    op.create_table(
        "leave_type_restrictions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("policy_version_id", sa.BigInteger(), sa.ForeignKey("policy_versions.id"), nullable=False),
        sa.Column("leave_type_a_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("leave_type_b_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column(
            "adjacency",
            sa.Enum("IMMEDIATELY_BEFORE", "IMMEDIATELY_AFTER", "SAME_DAY", name="restrictionadjacency"),
            nullable=False,
        ),
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint(
            "policy_version_id", "leave_type_a_id", "leave_type_b_id", "adjacency", name="uq_leave_type_restriction"
        ),
    )
    op.create_index("ix_leave_type_restrictions_policy_version_id", "leave_type_restrictions", ["policy_version_id"])

    op.create_table(
        "employee_leave_balances",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("leave_type_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("entitled_days", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("accrued_days", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("used_days", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("carried_forward_days", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("custom_override", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_employee_leave_balance"),
        sa.CheckConstraint("entitled_days >= 0", name="ck_balance_entitled_nonneg"),
        sa.CheckConstraint("accrued_days >= 0", name="ck_balance_accrued_nonneg"),
        sa.CheckConstraint("used_days >= 0", name="ck_balance_used_nonneg"),
    )
    op.create_index("ix_employee_leave_balances_employee_id", "employee_leave_balances", ["employee_id"])
    op.create_index("ix_employee_leave_balances_leave_type_id", "employee_leave_balances", ["leave_type_id"])

    op.create_table(
        "balance_adjustments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "employee_leave_balance_id", sa.BigInteger(), sa.ForeignKey("employee_leave_balances.id"), nullable=False
        ),
        sa.Column("adjusted_by_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("delta_days", sa.Numeric(4, 1), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.CheckConstraint("CHAR_LENGTH(TRIM(comment)) > 0", name="ck_balance_adjustment_comment_nonempty"),
    )
    op.create_index("ix_balance_adjustments_balance_id", "balance_adjustments", ["employee_leave_balance_id"])

    op.create_table(
        "holidays",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("holiday_type", sa.Enum("STATUTORY", "OPTIONAL", name="holidaytype"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.UniqueConstraint("date", "name", name="uq_holiday_date_name"),
    )
    op.create_index("ix_holidays_date", "holidays", ["date"])
    op.create_index("ix_holidays_year", "holidays", ["year"])

    op.create_table(
        "optional_holiday_picks",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("holiday_id", sa.BigInteger(), sa.ForeignKey("holidays.id"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.UniqueConstraint("employee_id", "holiday_id", name="uq_optional_holiday_pick"),
    )
    op.create_index("ix_optional_holiday_picks_employee_id", "optional_holiday_picks", ["employee_id"])

    op.create_table(
        "employee_optional_holiday_caps",
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), primary_key=True),
        sa.Column("annual_cap", sa.Numeric(4, 1), nullable=False, server_default="6"),
    )

    op.create_table(
        "day_requests",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("request_kind", sa.Enum("LEAVE", "WFH", "OD", name="requestkind"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "APPROVED", "REJECTED", "CANCELLED", name="dayrequeststatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("calendar_uid", sa.CHAR(36), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint("end_date >= start_date", name="ck_day_request_date_range"),
    )
    op.create_index("ix_day_requests_employee_id", "day_requests", ["employee_id"])

    op.create_table(
        "day_request_sessions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "day_request_id", sa.BigInteger(), sa.ForeignKey("day_requests.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("session", sa.Enum("FIRST_HALF", "SECOND_HALF", "FULL_DAY", name="sessiontype"), nullable=False),
        sa.Column("day_value", sa.Numeric(3, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "active_key",
            sa.String(1),
            sa.Computed("IF(is_active, 'Y', NULL)", persisted=True),
            nullable=True,
        ),
        sa.CheckConstraint("day_value IN (0.5, 1.0)", name="ck_session_day_value"),
        sa.UniqueConstraint("employee_id", "session_date", "session", "active_key", name="uq_session_active_slot"),
    )
    op.create_index("ix_day_request_sessions_day_request_id", "day_request_sessions", ["day_request_id"])
    op.create_index("ix_day_request_sessions_employee_id", "day_request_sessions", ["employee_id"])
    op.create_index("ix_day_request_sessions_session_date", "day_request_sessions", ["session_date"])

    op.create_table(
        "leave_applications",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "day_request_id",
            sa.BigInteger(),
            sa.ForeignKey("day_requests.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("leave_type_id", sa.BigInteger(), sa.ForeignKey("leave_types.id"), nullable=False),
        sa.Column("applied_days", sa.Numeric(4, 1), nullable=False),
        sa.Column("sandwich_days_added", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("total_deducted_days", sa.Numeric(4, 1), nullable=False),
        sa.Column("is_lop", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "resolution_type",
            sa.Enum("APPROVED", "PENDING_APPROVAL", "BLOCKED", "LOP_CONVERTED", name="resolutiontype"),
            nullable=False,
            server_default="PENDING_APPROVAL",
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("policy_version_id", sa.BigInteger(), sa.ForeignKey("policy_versions.id"), nullable=False),
        sa.Column("approver_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=True),
        sa.CheckConstraint("applied_days > 0", name="ck_leave_application_applied_days_positive"),
    )
    op.create_index("ix_leave_applications_leave_type_id", "leave_applications", ["leave_type_id"])

    op.create_table(
        "approval_delegations",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("manager_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("delegate_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.CheckConstraint("end_date >= start_date", name="ck_delegation_date_range"),
    )
    op.create_index("ix_approval_delegations_manager_id", "approval_delegations", ["manager_employee_id"])

    op.create_table(
        "approval_actions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("leave_application_id", sa.BigInteger(), sa.ForeignKey("leave_applications.id"), nullable=False),
        sa.Column("actor_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("action", sa.Enum("APPROVED", "REJECTED", "ESCALATED", name="approvalactiontype"), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("acted_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_approval_actions_leave_application_id", "approval_actions", ["leave_application_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(60), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("actor_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("before_value", sa.JSON(), nullable=True),
        sa.Column("after_value", sa.JSON(), nullable=True),
        sa.Column("reason_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"])
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])

    op.execute(
        """
        CREATE VIEW v_org_calendar AS
        SELECT
            dr.id AS day_request_id,
            dr.employee_id,
            dr.request_kind,
            dr.status,
            drs.session_date,
            drs.session,
            la.leave_type_id,
            la.reason,
            la.is_lop
        FROM day_requests dr
        JOIN day_request_sessions drs ON drs.day_request_id = dr.id AND drs.is_active = 1
        LEFT JOIN leave_applications la ON la.day_request_id = dr.id
        WHERE dr.status IN ('PENDING', 'APPROVED')
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_org_calendar")
    op.drop_table("audit_log")
    op.drop_table("approval_actions")
    op.drop_table("approval_delegations")
    op.drop_table("leave_applications")
    op.drop_table("day_request_sessions")
    op.drop_table("day_requests")
    op.drop_table("employee_optional_holiday_caps")
    op.drop_table("optional_holiday_picks")
    op.drop_table("holidays")
    op.drop_table("balance_adjustments")
    op.drop_table("employee_leave_balances")
    op.drop_table("leave_type_restrictions")
    op.drop_table("leave_type_eligibility_rules")
    op.drop_table("leave_policies")
    op.drop_table("policy_versions")
    op.drop_table("leave_types")
    op.drop_table("employees")
    op.drop_table("departments")
