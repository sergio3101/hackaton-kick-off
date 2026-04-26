"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-25 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Refs to existing enum types — никаких авто-CREATE при создании таблиц.
level_col = postgresql.ENUM(
    "junior", "middle", "senior", name="level_enum", create_type=False
)
session_status_col = postgresql.ENUM(
    "draft", "active", "finished", name="session_status_enum", create_type=False
)
question_type_col = postgresql.ENUM(
    "voice", "coding", name="question_type_enum", create_type=False
)
verdict_col = postgresql.ENUM(
    "correct", "partial", "incorrect", "skipped", name="verdict_enum", create_type=False
)


def upgrade() -> None:
    # Явное создание enum-типов; checkfirst через DO-блок, чтобы повторный запуск не падал.
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE level_enum AS ENUM ('junior', 'middle', 'senior');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE session_status_enum AS ENUM ('draft', 'active', 'finished');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE question_type_enum AS ENUM ('voice', 'coding');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE verdict_enum AS ENUM ('correct', 'partial', 'incorrect', 'skipped');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "requirements",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default="Untitled"),
        sa.Column("raw_text", sa.Text, nullable=False),
        sa.Column("summary", sa.Text, nullable=False, server_default=""),
        sa.Column("topics", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_requirements_user_id", "requirements", ["user_id"])

    op.create_table(
        "question_bank",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("requirements_id", sa.Integer, sa.ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic", sa.String(128), nullable=False),
        sa.Column("level", level_col, nullable=False),
        sa.Column("prompt", sa.Text, nullable=False),
        sa.Column("criteria", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_question_bank_requirements_id", "question_bank", ["requirements_id"])
    op.create_index("ix_question_bank_topic", "question_bank", ["topic"])
    op.create_index("ix_question_bank_level", "question_bank", ["level"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requirements_id", sa.Integer, sa.ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("selected_topics", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("selected_level", level_col, nullable=False),
        sa.Column("status", session_status_col, nullable=False, server_default="draft"),
        sa.Column("coding_task_prompt", sa.Text, nullable=False, server_default=""),
        sa.Column("coding_task_language", sa.String(64), nullable=False, server_default="python"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_requirements_id", "sessions", ["requirements_id"])

    op.create_table(
        "session_questions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("idx", sa.Integer, nullable=False),
        sa.Column("type", question_type_col, nullable=False),
        sa.Column("bank_id", sa.Integer, sa.ForeignKey("question_bank.id", ondelete="SET NULL")),
        sa.Column("topic", sa.String(128), nullable=False, server_default=""),
        sa.Column("prompt_text", sa.Text, nullable=False),
        sa.Column("criteria", sa.Text, nullable=False, server_default=""),
        sa.Column("answer_text", sa.Text, nullable=False, server_default=""),
        sa.Column("verdict", verdict_col),
        sa.Column("rationale", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_questions_session_id", "session_questions", ["session_id"])

    op.create_table(
        "session_summary",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("partial", sa.Integer, nullable=False, server_default="0"),
        sa.Column("incorrect", sa.Integer, nullable=False, server_default="0"),
        sa.Column("skipped", sa.Integer, nullable=False, server_default="0"),
        sa.Column("overall", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_summary_session_id", "session_summary", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_session_summary_session_id", table_name="session_summary")
    op.drop_table("session_summary")
    op.drop_index("ix_session_questions_session_id", table_name="session_questions")
    op.drop_table("session_questions")
    op.drop_index("ix_sessions_requirements_id", table_name="sessions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_index("ix_question_bank_level", table_name="question_bank")
    op.drop_index("ix_question_bank_topic", table_name="question_bank")
    op.drop_index("ix_question_bank_requirements_id", table_name="question_bank")
    op.drop_table("question_bank")
    op.drop_index("ix_requirements_user_id", table_name="requirements")
    op.drop_table("requirements")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS verdict_enum")
    op.execute("DROP TYPE IF EXISTS question_type_enum")
    op.execute("DROP TYPE IF EXISTS session_status_enum")
    op.execute("DROP TYPE IF EXISTS level_enum")