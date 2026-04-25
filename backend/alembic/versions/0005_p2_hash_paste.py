"""P2 mix: content_hash (C6) и paste_chars (C2)

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-25 13:30:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # C6: hash от raw_text для дедупликации повторных загрузок одного и того же материала.
    op.add_column(
        "requirements",
        sa.Column("content_hash", sa.String(64), nullable=False, server_default=""),
    )
    op.create_index("ix_requirements_content_hash", "requirements", ["content_hash"])

    # C2: счётчик символов, вставленных через clipboard, для anti-paste-сигнала в ревью.
    op.add_column(
        "session_questions",
        sa.Column("paste_chars", sa.Integer, nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("session_questions", "paste_chars")
    op.drop_index("ix_requirements_content_hash", table_name="requirements")
    op.drop_column("requirements", "content_hash")
