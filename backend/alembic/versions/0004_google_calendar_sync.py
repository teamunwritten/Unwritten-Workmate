"""google calendar auto-sync: refresh token + synced event id

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("google_calendar_refresh_token", sa.String(512), nullable=True))
    op.add_column("leave_applications", sa.Column("google_calendar_event_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("leave_applications", "google_calendar_event_id")
    op.drop_column("employees", "google_calendar_refresh_token")
