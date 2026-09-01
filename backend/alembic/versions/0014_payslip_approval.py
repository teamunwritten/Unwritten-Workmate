"""payslip approval: draft/approved status, approver, approved_at

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payslips",
        sa.Column("status", sa.Enum("DRAFT", "APPROVED", name="payslipstatus"), nullable=False, server_default="DRAFT"),
    )
    op.add_column("payslips", sa.Column("approved_by_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=True))
    op.add_column("payslips", sa.Column("approved_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("payslips", "approved_at")
    op.drop_column("payslips", "approved_by_employee_id")
    op.drop_column("payslips", "status")
    sa.Enum(name="payslipstatus").drop(op.get_bind(), checkfirst=True)
