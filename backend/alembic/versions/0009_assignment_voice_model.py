"""Assignment voice + llm_model, propagated to session

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-26 14:00:00

Заводим поля под per-assignment настройки голоса (TTS voice) и модели LLM
(используется для evaluate / overall summary). Поля nullable — сессии без
явных настроек идут на дефолты из app.config.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assignments",
        sa.Column("voice", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "assignments",
        sa.Column("llm_model", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "sessions",
        sa.Column("voice", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "sessions",
        sa.Column("llm_model", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sessions", "llm_model")
    op.drop_column("sessions", "voice")
    op.drop_column("assignments", "llm_model")
    op.drop_column("assignments", "voice")
