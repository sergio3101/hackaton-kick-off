"""A3: target_duration_min для sessions

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-25 12:30:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("target_duration_min", sa.Integer, nullable=False, server_default="12"),
    )


def downgrade() -> None:
    op.drop_column("sessions", "target_duration_min")
