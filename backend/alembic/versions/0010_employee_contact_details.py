"""employee contact details: phone, personal email, address, emergency contact

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("phone_number", sa.String(30), nullable=True))
    op.add_column("employees", sa.Column("personal_email", sa.String(190), nullable=True))
    op.add_column("employees", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("employees", sa.Column("emergency_contact_name", sa.String(150), nullable=True))
    op.add_column("employees", sa.Column("emergency_contact_phone", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "emergency_contact_phone")
    op.drop_column("employees", "emergency_contact_name")
    op.drop_column("employees", "address")
    op.drop_column("employees", "personal_email")
    op.drop_column("employees", "phone_number")
