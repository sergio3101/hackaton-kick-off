import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import get_settings
from app.llm.client import get_openai, safe_json_loads
from app.llm.cost_tracker import record_chat_usage
from app.llm.prompts import (
    CODE_REVIEW_JSON_SCHEMA,
    CODE_REVIEW_SYSTEM,
    SUMMARY_JSON_SCHEMA,
    SUMMARY_SYSTEM,
    VOICE_EVAL_JSON_SCHEMA,
    VOICE_EVAL_SYSTEM,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class VoiceEvaluation:
    verdict: str
    rationale: str
    expected_answer: str
    explanation: str
    follow_up_question: str | None
    follow_up_kind: str | None  # "easier" | "deeper" | "clarify" | None


@dataclass(slots=True)
class CodeReview:
    verdict: str
    rationale: str
    expected_answer: str
    explanation: str


def evaluate_voice_answer(
    *,
    summary: str,
    question: str,
    criteria: str,
    answer_text: str,
    session_id: int | None = None,
    voice_signals: str | None = None,
    db: Session | None = None,
) -> VoiceEvaluation:
    settings = get_settings()
    client = get_openai()
    user = (
        f"Контекст проекта:\n{summary}\n\n"
        f"Вопрос: {question}\n"
        f"Критерии: {criteria}\n\n"
        f"Расшифрованный ответ кандидата:\n{answer_text}"
    )
    if voice_signals:
        user += (
            f"\n\nГолосовые признаки (эвристика, не для оценки знаний — для общего тона "
            f"rationale): {voice_signals}"
        )
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": VOICE_EVAL_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": VOICE_EVAL_JSON_SCHEMA},
        temperature=0.2,
    )
    record_chat_usage(
        kind="voice_eval", model=settings.openai_chat_model,
        response=response, session_id=session_id, db=db,
    )
    payload = safe_json_loads(response.choices[0].message.content, kind="evaluate")
    result = VoiceEvaluation(
        verdict=payload.get("verdict", "incorrect"),
        rationale=payload.get("rationale", ""),
        expected_answer=payload.get("expected_answer", ""),
        explanation=payload.get("explanation", ""),
        follow_up_question=payload.get("follow_up_question"),
        follow_up_kind=payload.get("follow_up_kind"),
    )
    logger.info(
        "evaluate_voice_answer: answer_len=%d, verdict=%s, follow_up=%s, expected_len=%d",
        len(answer_text), result.verdict, result.follow_up_kind or "none",
        len(result.expected_answer),
    )
    return result


def review_code(
    *,
    task_prompt: str,
    language: str,
    code: str,
    session_id: int | None = None,
    db: Session | None = None,
) -> CodeReview:
    settings = get_settings()
    client = get_openai()
    user = (
        f"Язык: {language}\n\n"
        f"Задача:\n{task_prompt}\n\n"
        f"Решение кандидата:\n```{language}\n{code}\n```"
    )
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": CODE_REVIEW_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": CODE_REVIEW_JSON_SCHEMA},
        temperature=0.2,
    )
    record_chat_usage(
        kind="code_review", model=settings.openai_chat_model,
        response=response, session_id=session_id, db=db,
    )
    payload = safe_json_loads(response.choices[0].message.content, kind="evaluate")
    result = CodeReview(
        verdict=payload.get("verdict", "incorrect"),
        rationale=payload.get("rationale", ""),
        expected_answer=payload.get("expected_answer", ""),
        explanation=payload.get("explanation", ""),
    )
    logger.info(
        "review_code: language=%s, code_len=%d, verdict=%s, expected_len=%d",
        language, len(code), result.verdict, len(result.expected_answer),
    )
    return result


def make_overall_summary(
    items_text: str,
    *,
    session_id: int | None = None,
    db: Session | None = None,
) -> str:
    settings = get_settings()
    client = get_openai()
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM},
            {"role": "user", "content": items_text},
        ],
        response_format={"type": "json_schema", "json_schema": SUMMARY_JSON_SCHEMA},
        temperature=0.3,
    )
    record_chat_usage(
        kind="overall_summary", model=settings.openai_chat_model,
        response=response, session_id=session_id, db=db,
    )
    payload = safe_json_loads(response.choices[0].message.content, kind="evaluate")
    return payload.get("overall", "")
