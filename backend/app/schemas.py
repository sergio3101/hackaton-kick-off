from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AssignmentStatus, Level, QuestionType, SessionStatus, UserRole, Verdict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str = ""
    role: UserRole
    is_active: bool = True
    created_at: datetime


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=255)
    role: UserRole = UserRole.user


class AdminUserPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class AssignmentCreate(BaseModel):
    user_id: int
    requirements_id: int
    selected_topics: list[str] = Field(min_length=1)
    selected_level: Level
    mode: Literal["voice", "text"] = "voice"
    target_duration_min: int = Field(default=12, ge=5, le=60)
    note: str = Field(default="", max_length=2000)


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    admin_id: int | None
    user_id: int
    requirements_id: int
    selected_topics: list[str]
    selected_level: Level
    mode: Literal["voice", "text"]
    target_duration_min: int
    status: AssignmentStatus
    note: str
    created_at: datetime


class AssignmentDetailOut(AssignmentOut):
    user_email: str = ""
    user_full_name: str = ""
    requirements_title: str = ""
    session_id: int | None = None
    published_at: datetime | None = None


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
    mode: Literal["voice", "text"] = "voice"
    target_duration_min: int = Field(default=12, ge=5, le=60)


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
    expected_answer: str = ""
    explanation: str = ""
    paste_chars: int = 0
    coding_language: str | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int = 0
    requirements_id: int
    selected_topics: list[str]
    selected_level: Level
    status: SessionStatus
    coding_task_prompt: str
    coding_task_language: str
    target_duration_min: int = 12
    mode: Literal["voice", "text"] = "voice"
    started_at: datetime | None
    finished_at: datetime | None
    published_at: datetime | None = None
    assignment_id: int | None = None
    created_at: datetime


class RequirementsStatsOut(BaseModel):
    requirements_id: int
    sessions_total: int
    sessions_finished: int
    avg_score: float  # 0..1, 0 если нет завершённых
    last_session_at: datetime | None


class SessionDetailOut(SessionOut):
    items: list[SessionItemOut]


class CodingReviewIn(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)
    paste_chars: int = Field(default=0, ge=0)  # C2: суммарное число символов, вставленных через clipboard


class CodingRunIn(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)


class CodingRunOut(BaseModel):
    language: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool
    truncated: bool


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
    total_cost_usd: float = 0.0
