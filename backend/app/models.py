from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Level(str, enum.Enum):
    junior = "junior"
    middle = "middle"
    senior = "senior"


class SessionStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    finished = "finished"


class QuestionType(str, enum.Enum):
    voice = "voice"
    coding = "coding"


class Verdict(str, enum.Enum):
    correct = "correct"
    partial = "partial"
    incorrect = "incorrect"
    skipped = "skipped"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    requirements: Mapped[list[Requirements]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list[InterviewSession]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Requirements(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    topics: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="requirements")
    bank: Mapped[list[QuestionBank]] = relationship(back_populates="requirements", cascade="all, delete-orphan")
    sessions: Mapped[list[InterviewSession]] = relationship(back_populates="requirements", cascade="all, delete-orphan")


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requirements_id: Mapped[int] = mapped_column(ForeignKey("requirements.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    level: Mapped[Level] = mapped_column(SAEnum(Level, name="level_enum"), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    criteria: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    requirements: Mapped[Requirements] = relationship(back_populates="bank")


class InterviewSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    requirements_id: Mapped[int] = mapped_column(ForeignKey("requirements.id", ondelete="CASCADE"), index=True)
    selected_topics: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    selected_level: Mapped[Level] = mapped_column(SAEnum(Level, name="level_enum"), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, name="session_status_enum"), nullable=False, default=SessionStatus.draft
    )
    coding_task_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    coding_task_language: Mapped[str] = mapped_column(String(64), nullable=False, default="python")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="sessions")
    requirements: Mapped[Requirements] = relationship(back_populates="sessions")
    items: Mapped[list[SessionQuestion]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="SessionQuestion.idx"
    )
    summary: Mapped[SessionSummary | None] = relationship(
        back_populates="session", cascade="all, delete-orphan", uselist=False
    )


class SessionQuestion(Base):
    __tablename__ = "session_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    idx: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[QuestionType] = mapped_column(SAEnum(QuestionType, name="question_type_enum"), nullable=False)
    bank_id: Mapped[int | None] = mapped_column(ForeignKey("question_bank.id", ondelete="SET NULL"))
    topic: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    criteria: Mapped[str] = mapped_column(Text, nullable=False, default="")
    answer_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    verdict: Mapped[Verdict | None] = mapped_column(SAEnum(Verdict, name="verdict_enum"))
    rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    session: Mapped[InterviewSession] = relationship(back_populates="items")


class SessionSummary(Base):
    __tablename__ = "session_summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), unique=True, index=True
    )
    correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    partial: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    incorrect: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overall: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())

    session: Mapped[InterviewSession] = relationship(back_populates="summary")
