"""payslip templates: selectable visual design

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payslip_templates",
        sa.Column(
            "design",
            sa.Enum("CLASSIC", "MODERN", "MINIMAL", "FORMAL", "COMPACT", "BOLD", name="payslipdesign"),
            nullable=False,
            server_default="CLASSIC",
        ),
    )


def downgrade() -> None:
    op.drop_column("payslip_templates", "design")
    sa.Enum(name="payslipdesign").drop(op.get_bind(), checkfirst=True)
