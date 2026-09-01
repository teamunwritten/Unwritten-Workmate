"""payroll foundation: salary components/structures, employee assignments, payroll runs, payslips

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "salary_components",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("component_type", sa.Enum("EARNING", "DEDUCTION", name="componenttype"), nullable=False),
        sa.Column(
            "calculation_type",
            sa.Enum("FIXED", "PERCENTAGE_OF_BASIC", "FORMULA", name="calculationtype"),
            nullable=False,
        ),
        sa.Column("percentage_of_basic", sa.Numeric(5, 2), nullable=True),
        sa.Column("is_taxable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "salary_structures",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "salary_structure_components",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("salary_structure_id", sa.BigInteger(), sa.ForeignKey("salary_structures.id"), nullable=False),
        sa.Column("salary_component_id", sa.BigInteger(), sa.ForeignKey("salary_components.id"), nullable=False),
        sa.Column("default_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("salary_structure_id", "salary_component_id", name="uq_structure_component"),
    )
    op.create_index("ix_salary_structure_components_structure_id", "salary_structure_components", ["salary_structure_id"])

    op.create_table(
        "employee_salary_assignments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("salary_structure_id", sa.BigInteger(), sa.ForeignKey("salary_structures.id"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("annual_ctc", sa.Numeric(14, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_employee_salary_assignments_employee_id", "employee_salary_assignments", ["employee_id"])

    op.create_table(
        "employee_salary_component_values",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "employee_salary_assignment_id",
            sa.BigInteger(),
            sa.ForeignKey("employee_salary_assignments.id"),
            nullable=False,
        ),
        sa.Column("salary_component_id", sa.BigInteger(), sa.ForeignKey("salary_components.id"), nullable=False),
        sa.Column("resolved_value", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index(
        "ix_employee_salary_component_values_assignment_id",
        "employee_salary_component_values",
        ["employee_salary_assignment_id"],
    )

    op.create_table(
        "payroll_runs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "PROCESSING", "COMPLETED", name="payrollrunstatus"),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("run_date", sa.Date(), nullable=True),
        sa.Column("created_by_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("period_month", "period_year", name="uq_payroll_run_period"),
    )

    op.create_table(
        "payroll_run_entries",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("payroll_run_id", sa.BigInteger(), sa.ForeignKey("payroll_runs.id"), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("salary_structure_id", sa.BigInteger(), sa.ForeignKey("salary_structures.id"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PENDING", "INCLUDED", "EXCLUDED", name="payrollrunentrystatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("gross_amount", sa.Numeric(14, 2), nullable=True),
        sa.UniqueConstraint("payroll_run_id", "employee_id", name="uq_payroll_run_entry_employee"),
    )
    op.create_index("ix_payroll_run_entries_run_id", "payroll_run_entries", ["payroll_run_id"])

    op.create_table(
        "payslip_templates",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("header_config", sa.JSON(), nullable=True),
        sa.Column("footer_note", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "payslips",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "payroll_run_entry_id", sa.BigInteger(), sa.ForeignKey("payroll_run_entries.id"), nullable=False, unique=True
        ),
        sa.Column("payslip_template_id", sa.BigInteger(), sa.ForeignKey("payslip_templates.id"), nullable=False),
        sa.Column("generated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("gross_pay", sa.Numeric(14, 2), nullable=False),
        sa.Column("net_pay", sa.Numeric(14, 2), nullable=False),
        sa.Column("line_items", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("payslips")
    op.drop_table("payslip_templates")
    op.drop_index("ix_payroll_run_entries_run_id", table_name="payroll_run_entries")
    op.drop_table("payroll_run_entries")
    op.drop_table("payroll_runs")
    op.drop_index("ix_employee_salary_component_values_assignment_id", table_name="employee_salary_component_values")
    op.drop_table("employee_salary_component_values")
    op.drop_index("ix_employee_salary_assignments_employee_id", table_name="employee_salary_assignments")
    op.drop_table("employee_salary_assignments")
    op.drop_index("ix_salary_structure_components_structure_id", table_name="salary_structure_components")
    op.drop_table("salary_structure_components")
    op.drop_table("salary_structures")
    op.drop_table("salary_components")
    sa.Enum(name="payrollrunentrystatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="payrollrunstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="calculationtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="componenttype").drop(op.get_bind(), checkfirst=True)
