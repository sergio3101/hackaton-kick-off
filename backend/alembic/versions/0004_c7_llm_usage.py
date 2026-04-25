"""C7: llm_usage — учёт стоимости OpenAI per session

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-25 13:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_usage",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer,
            sa.ForeignKey("sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "requirements_id",
            sa.Integer,
            sa.ForeignKey("requirements.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("prompt_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_llm_usage_session_id", "llm_usage", ["session_id"])
    op.create_index("ix_llm_usage_requirements_id", "llm_usage", ["requirements_id"])
    op.create_index("ix_llm_usage_kind", "llm_usage", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_llm_usage_kind", table_name="llm_usage")
    op.drop_index("ix_llm_usage_requirements_id", table_name="llm_usage")
    op.drop_index("ix_llm_usage_session_id", table_name="llm_usage")
    op.drop_table("llm_usage")
