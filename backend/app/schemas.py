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
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


# OpenAI Realtime API поддерживаемые голоса (whitelist для валидации).
# Не путать с TTS-1 — там список другой; см. также realtime.REALTIME_VOICES.
ALLOWED_VOICES: tuple[str, ...] = (
    "alloy", "ash", "ballad", "coral", "echo",
    "sage", "shimmer", "verse", "marin", "cedar",
)
# Модели чата, которые admin может выбрать на форме назначения.
# Сохраняется консервативно: совместимые с json_schema response_format.
ALLOWED_LLM_MODELS: tuple[str, ...] = (
    "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1",
)


class AssignmentCreate(BaseModel):
    user_id: int
    requirements_id: int
    selected_topics: list[str] = Field(min_length=1)
    selected_level: Level
    mode: Literal["voice", "text"] = "voice"
    target_duration_min: int = Field(default=12, ge=5, le=60)
    note: str = Field(default="", max_length=2000)
    voice: str | None = Field(default=None, max_length=32)
    llm_model: str | None = Field(default=None, max_length=64)


class AssignmentStartIn(BaseModel):
    """Опциональный override параметров на стороне кандидата при /start.

    Сейчас разрешаем только смену режима (голос ↔ текст). Дефолт — поле из
    Assignment, выставленное админом. Полезно если у кандидата нет
    микрофона / OpenAI Realtime недоступен в его регионе.
    """

    mode: Literal["voice", "text"] | None = None


class AssignmentPatch(BaseModel):
    """Частичное обновление назначения. Можно править в любой момент: правки
    подтянутся только в следующих новых попытках (старые InterviewSession
    хранят свою копию параметров, как было на старте).

    Поле `user_id` намеренно не редактируется — переназначение другому
    пользователю — это другое назначение, проще создать заново.
    """

    requirements_id: int | None = None
    selected_topics: list[str] | None = Field(default=None, min_length=1)
    selected_level: Level | None = None
    mode: Literal["voice", "text"] | None = None
    target_duration_min: int | None = Field(default=None, ge=5, le=60)
    note: str | None = Field(default=None, max_length=2000)
    voice: str | None = Field(default=None, max_length=32)
    llm_model: str | None = Field(default=None, max_length=64)


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
    voice: str | None = None
    llm_model: str | None = None
    created_at: datetime


class AssignmentSessionInfo(BaseModel):
    """Срез сессии для отображения внутри списка назначений (admin и user).

    Используется и как срез последней попытки (legacy `AssignmentDetailOut.session`),
    и как элемент массива всех попыток (`AssignmentDetailOut.sessions`). Поля
    score_pct/final_verdict/counters доступны после finish_session,
    total_cost_usd — только в админском контексте; до этого момента — None / "".
    """

    model_config = ConfigDict(from_attributes=True)
    id: int
    status: SessionStatus
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_sec: int | None = None
    score_pct: float | None = None
    total_cost_usd: float | None = None
    # Категория готовности по итогам сессии (см. SessionSummary.final_verdict).
    # Пусто для сессий без summary или с пустым вердиктом.
    final_verdict: str = ""
    # Breakdown ответов из SessionSummary — для отображения «✓7 ~2 ✗1 –0»
    # в строках попыток. Все четыре нуля для незавершённых сессий.
    correct: int = 0
    partial: int = 0
    incorrect: int = 0
    skipped: int = 0


class AssignmentDetailOut(AssignmentOut):
    user_email: str = ""
    user_full_name: str = ""
    requirements_title: str = ""
    # session_id — legacy alias для last_session_id (старые клиенты).
    session_id: int | None = None
    last_session_id: int | None = None
    attempts_count: int = 0
    # Срез последней (по created_at) попытки — back-compat алиас для sessions[-1].
    session: AssignmentSessionInfo | None = None
    # Все попытки прохождения, отсортированные по возрастанию created_at.
    # Пустой массив, если кандидат ни разу не запускал интервью.
    sessions: list[AssignmentSessionInfo] = []
    # deprecated: публикация результатов админом удалена в апреле 2026 —
    # для legacy-клиентов отдаётся всегда None.
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
    user_email: str = ""
    user_full_name: str = ""
    requirements_id: int
    requirements_title: str = ""
    selected_topics: list[str]
    selected_level: Level
    status: SessionStatus
    coding_task_prompt: str
    coding_task_language: str
    target_duration_min: int = 12
    mode: Literal["voice", "text"] = "voice"
    voice: str | None = None
    llm_model: str | None = None
    started_at: datetime | None
    finished_at: datetime | None
    published_at: datetime | None = None
    assignment_id: int | None = None
    created_at: datetime

    @classmethod
    def from_session(cls, s) -> "SessionOut":
        # requirements.title и поля user — не атрибуты самой сессии, поэтому
        # from_attributes не подтягивает их автоматически. Прокидываем явно
        # через relationship.
        out = cls.model_validate(s)
        out.requirements_title = s.requirements.title if s.requirements else ""
        if s.user is not None:
            out.user_email = s.user.email or ""
            out.user_full_name = (s.user.full_name or "").strip()
        return out


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
    # Категория готовности из набора final_verdict (см. llm/evaluate.py).
    # Пустая строка для сессий до миграции 0010 или если LLM не вернула значение.
    final_verdict: str = ""
    final_recommendation: str = ""


class ReportOut(BaseModel):
    session: SessionOut
    summary: SummaryOut | None
    items: list[SessionItemOut]
    total_cost_usd: float = 0.0
    requirements_title: str = ""
