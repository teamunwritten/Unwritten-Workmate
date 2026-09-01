"""add PERCENTAGE_OF_CTC to calculationtype enum

Revision ID: 0017
Revises: 0016
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE salary_components MODIFY COLUMN calculation_type "
        "ENUM('FIXED', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_CTC', 'FORMULA') NOT NULL"
    )


def downgrade() -> None:
    # Narrowing the ENUM below would either fail outright (strict mode) or silently truncate any
    # existing PERCENTAGE_OF_CTC row to an invalid empty-string enum value (non-strict mode) --
    # neither is acceptable, so reassign those rows first. They'll resolve to 0 (no default_value
    # configured) until re-set to FIXED with a real amount, which is an expected, visible
    # consequence of downgrading past this migration, not silent corruption.
    op.execute("UPDATE salary_components SET calculation_type = 'FIXED' WHERE calculation_type = 'PERCENTAGE_OF_CTC'")
    op.execute(
        "ALTER TABLE salary_components MODIFY COLUMN calculation_type "
        "ENUM('FIXED', 'PERCENTAGE_OF_BASIC', 'FORMULA') NOT NULL"
    )
