"""Per-task coding language

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-26 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "session_questions",
        sa.Column("coding_language", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("session_questions", "coding_language")
