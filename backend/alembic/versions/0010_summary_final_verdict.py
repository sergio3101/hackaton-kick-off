"""SessionSummary: final_verdict + final_recommendation

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-27 12:00:00

Добавляем итоговый вердикт сессии (категория готовности + 1-2 предложения
рекомендации). Используем String(32) с server_default="" вместо enum-типа,
чтобы не плодить миграции на pg_enum при изменении набора категорий —
валидация значений делается на уровне Pydantic + JSON-схемы LLM.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "session_summary",
        sa.Column(
            "final_verdict",
            sa.String(length=32),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "session_summary",
        sa.Column(
            "final_recommendation",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )


def downgrade() -> None:
    op.drop_column("session_summary", "final_recommendation")
    op.drop_column("session_summary", "final_verdict")
