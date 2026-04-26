"""F3: session.mode (voice|text) для текстового режима всей сессии

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-25 18:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("mode", sa.String(16), nullable=False, server_default="voice"),
    )


def downgrade() -> None:
    op.drop_column("sessions", "mode")
