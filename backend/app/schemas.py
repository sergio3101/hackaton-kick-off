from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import Level, QuestionType, SessionStatus, Verdict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class TopicOut(BaseModel):
    name: str
    description: str = ""


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic: str
    level: Level
    prompt: str


class RequirementsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    summary: str
    topics: list[TopicOut]
    created_at: datetime


class RequirementsDetailOut(RequirementsOut):
    bank: list[QuestionOut]


class SessionCreate(BaseModel):
    requirements_id: int
    selected_topics: list[str] = Field(min_length=1)
    selected_level: Level


class SessionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    idx: int
    type: QuestionType
    topic: str
    prompt_text: str
    answer_text: str
    verdict: Verdict | None
    rationale: str


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    requirements_id: int
    selected_topics: list[str]
    selected_level: Level
    status: SessionStatus
    coding_task_prompt: str
    coding_task_language: str
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class SessionDetailOut(SessionOut):
    items: list[SessionItemOut]


class CodingReviewIn(BaseModel):
    code: str


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    correct: int
    partial: int
    incorrect: int
    skipped: int
    overall: str


class ReportOut(BaseModel):
    session: SessionOut
    summary: SummaryOut | None
    items: list[SessionItemOut]
