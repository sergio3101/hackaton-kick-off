"""B1: expected_answer + explanation для session_questions

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-25 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "session_questions",
        sa.Column("expected_answer", sa.Text, nullable=False, server_default=""),
    )
    op.add_column(
        "session_questions",
        sa.Column("explanation", sa.Text, nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("session_questions", "explanation")
    op.drop_column("session_questions", "expected_answer")
