"""replace password auth with Google SSO

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("google_sub", sa.String(64), nullable=True))
    op.create_unique_constraint("uq_employees_google_sub", "employees", ["google_sub"])
    op.drop_column("employees", "password_hash")


def downgrade() -> None:
    op.add_column("employees", sa.Column("password_hash", sa.String(255), nullable=False, server_default=""))
    op.drop_constraint("uq_employees_google_sub", "employees", type_="unique")
    op.drop_column("employees", "google_sub")
