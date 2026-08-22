"""widen google_picture_url column -- Google's signed photo URLs can exceed 512 chars

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("employees", "google_picture_url", existing_type=sa.String(512), type_=sa.String(1024))


def downgrade() -> None:
    op.alter_column("employees", "google_picture_url", existing_type=sa.String(1024), type_=sa.String(512))
