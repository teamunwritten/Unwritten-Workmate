"""data-fix: WFH leave type had 0 annual days + zero_balance_action=BLOCK, so every WFH
request was unconditionally rejected. Give it a high nominal cap instead.

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE leave_types SET default_annual_days = 260 WHERE code = 'WFH'")


def downgrade() -> None:
    op.execute("UPDATE leave_types SET default_annual_days = 0 WHERE code = 'WFH'")
