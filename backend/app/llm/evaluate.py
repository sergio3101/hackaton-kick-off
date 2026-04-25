import json
import logging
from dataclasses import dataclass

from app.config import get_settings
from app.llm.client import get_openai
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
    follow_up_question: str | None


@dataclass(slots=True)
class CodeReview:
    verdict: str
    rationale: str


def evaluate_voice_answer(
    *,
    summary: str,
    question: str,
    criteria: str,
    answer_text: str,
) -> VoiceEvaluation:
    settings = get_settings()
    client = get_openai()
    user = (
        f"Контекст проекта:\n{summary}\n\n"
        f"Вопрос: {question}\n"
        f"Критерии: {criteria}\n\n"
        f"Расшифрованный ответ кандидата:\n{answer_text}"
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
    payload = json.loads(response.choices[0].message.content or "{}")
    result = VoiceEvaluation(
        verdict=payload.get("verdict", "incorrect"),
        rationale=payload.get("rationale", ""),
        follow_up_question=payload.get("follow_up_question"),
    )
    logger.info(
        "evaluate_voice_answer: answer_len=%d, verdict=%s, has_followup=%s",
        len(answer_text), result.verdict, result.follow_up_question is not None,
    )
    return result


def review_code(*, task_prompt: str, language: str, code: str) -> CodeReview:
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
    payload = json.loads(response.choices[0].message.content or "{}")
    result = CodeReview(
        verdict=payload.get("verdict", "incorrect"),
        rationale=payload.get("rationale", ""),
    )
    logger.info(
        "review_code: language=%s, code_len=%d, verdict=%s",
        language, len(code), result.verdict,
    )
    return result


def make_overall_summary(items_text: str) -> str:
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
    payload = json.loads(response.choices[0].message.content or "{}")
    return payload.get("overall", "")
