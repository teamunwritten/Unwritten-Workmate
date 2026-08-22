"""file cabinet: uploads shared privately, with an employee, or org-wide

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "files",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("stored_filename", sa.String(255), nullable=False, unique=True),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(150), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_by_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column(
            "visibility",
            sa.Enum("PRIVATE", "EMPLOYEE", "ORGANIZATION", name="filevisibility"),
            nullable=False,
            server_default="PRIVATE",
        ),
        sa.Column("shared_with_employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_files_uploaded_by_employee_id", "files", ["uploaded_by_employee_id"])
    op.create_index("ix_files_shared_with_employee_id", "files", ["shared_with_employee_id"])


def downgrade() -> None:
    op.drop_table("files")
