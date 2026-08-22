"""employee job title / position

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("position", sa.String(150), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "position")
