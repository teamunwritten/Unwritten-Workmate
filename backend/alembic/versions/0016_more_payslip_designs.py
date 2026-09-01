"""payslip templates: five more designs (elegant, fintech, split, tabular, executive)

Revision ID: 0016
Revises: 0015
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_VALUES = "'CLASSIC','MODERN','MINIMAL','FORMAL','COMPACT','BOLD'"
NEW_VALUES = "'CLASSIC','MODERN','MINIMAL','FORMAL','COMPACT','BOLD','ELEGANT','FINTECH','SPLIT','TABULAR','EXECUTIVE'"


def upgrade() -> None:
    op.execute(f"ALTER TABLE payslip_templates MODIFY COLUMN design ENUM({NEW_VALUES}) NOT NULL DEFAULT 'CLASSIC'")


def downgrade() -> None:
    op.execute(f"ALTER TABLE payslip_templates MODIFY COLUMN design ENUM({OLD_VALUES}) NOT NULL DEFAULT 'CLASSIC'")
