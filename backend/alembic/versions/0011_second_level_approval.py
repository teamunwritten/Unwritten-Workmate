"""org-wide two-level approval setting + leave_applications.pending_level

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "org_settings",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("requires_second_level_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute("INSERT INTO org_settings (id, requires_second_level_approval) VALUES (1, FALSE)")

    op.add_column(
        "leave_applications",
        sa.Column("pending_level", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("leave_applications", "pending_level")
    op.drop_table("org_settings")
