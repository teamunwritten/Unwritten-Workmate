"""google_picture_url -> TEXT -- Google's signed photo URLs vary in length unpredictably,
VARCHAR caps kept getting exceeded

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("employees", "google_picture_url", existing_type=sa.String(1024), type_=sa.Text())


def downgrade() -> None:
    op.alter_column("employees", "google_picture_url", existing_type=sa.Text(), type_=sa.String(1024))
