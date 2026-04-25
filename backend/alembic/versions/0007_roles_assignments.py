"""Роли, назначения кикоффов и публикация результатов

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-25 19:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE user_role_enum AS ENUM ('admin', 'user');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE assignment_status_enum AS ENUM ('assigned', 'started', 'completed', 'published');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )

    role_col = postgresql.ENUM(
        "admin", "user", name="user_role_enum", create_type=False
    )
    assignment_status_col = postgresql.ENUM(
        "assigned", "started", "completed", "published",
        name="assignment_status_enum", create_type=False,
    )
    level_col = postgresql.ENUM(
        "junior", "middle", "senior", name="level_enum", create_type=False
    )

    op.add_column(
        "users",
        sa.Column("role", role_col, nullable=False, server_default="user"),
    )
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.add_column(
        "sessions",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sessions",
        sa.Column("assignment_id", sa.Integer(), nullable=True),
    )

    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("requirements_id", sa.Integer(), sa.ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("selected_topics", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("selected_level", level_col, nullable=False, server_default="middle"),
        sa.Column("mode", sa.String(16), nullable=False, server_default="voice"),
        sa.Column("target_duration_min", sa.Integer(), nullable=False, server_default="12"),
        sa.Column("status", assignment_status_col, nullable=False, server_default="assigned"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_foreign_key(
        "fk_sessions_assignment_id",
        "sessions", "assignments",
        ["assignment_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_sessions_assignment_id", "sessions", ["assignment_id"])

    # Bootstrap: первый пользователь становится администратором.
    op.execute(
        """
        UPDATE users SET role = 'admin'
         WHERE id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
        """
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_assignment_id", table_name="sessions")
    op.drop_constraint("fk_sessions_assignment_id", "sessions", type_="foreignkey")
    op.drop_column("sessions", "assignment_id")
    op.drop_column("sessions", "published_at")

    op.drop_table("assignments")

    op.drop_column("users", "is_active")
    op.drop_column("users", "full_name")
    op.drop_column("users", "role")

    op.execute("DROP TYPE IF EXISTS assignment_status_enum")
    op.execute("DROP TYPE IF EXISTS user_role_enum")
