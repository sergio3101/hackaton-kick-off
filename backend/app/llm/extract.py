import json
import logging
from dataclasses import dataclass

from app.config import get_settings
from app.llm.client import get_openai
from app.llm.prompts import (
    EXTRACT_JSON_SCHEMA,
    EXTRACT_SYSTEM,
    TOPIC_QUESTIONS_JSON_SCHEMA,
    TOPIC_QUESTIONS_SYSTEM,
)

logger = logging.getLogger(__name__)

QUESTIONS_PER_PAIR = 5
LEVELS = ("junior", "middle", "senior")


@dataclass(slots=True)
class ExtractedQuestion:
    topic: str
    level: str
    prompt: str
    criteria: str


@dataclass(slots=True)
class ExtractedTopic:
    name: str
    description: str


@dataclass(slots=True)
class ExtractionResult:
    summary: str
    topics: list[ExtractedTopic]
    questions: list[ExtractedQuestion]


def extract_requirements(raw_text: str) -> ExtractionResult:
    settings = get_settings()
    client = get_openai()

    logger.info("extract_requirements: raw_len=%d", len(raw_text))
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {"role": "user", "content": raw_text[:120_000]},
        ],
        response_format={"type": "json_schema", "json_schema": EXTRACT_JSON_SCHEMA},
        temperature=0.4,
    )
    payload = json.loads(response.choices[0].message.content or "{}")

    topics = [ExtractedTopic(name=t["name"], description=t.get("description", ""))
              for t in payload.get("topics", [])]
    questions = [
        ExtractedQuestion(
            topic=q["topic"],
            level=q["level"],
            prompt=q["prompt"],
            criteria=q.get("criteria", ""),
        )
        for q in payload.get("questions", [])
    ]
    result = ExtractionResult(
        summary=payload.get("summary", ""),
        topics=topics,
        questions=questions,
    )
    logger.info(
        "extract_requirements: topics=%d, questions=%d",
        len(result.topics), len(result.questions),
    )
    return result


def generate_questions_for_pair(
    summary: str,
    topic: ExtractedTopic,
    level: str,
    count: int,
) -> list[ExtractedQuestion]:
    """Догенерация вопросов для конкретной пары (тема × уровень).

    Используется как добор, когда основной EXTRACT-вызов вернул < QUESTIONS_PER_PAIR.
    """
    if count <= 0:
        return []

    settings = get_settings()
    client = get_openai()

    user = (
        f"Контекст проекта (summary):\n{summary}\n\n"
        f"Тема: {topic.name}\n"
        f"Описание темы: {topic.description}\n"
        f"Уровень кандидата: {level}\n"
        f"Сгенерируй РОВНО {count} вопросов с критериями."
    )
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": TOPIC_QUESTIONS_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": TOPIC_QUESTIONS_JSON_SCHEMA},
        temperature=0.5,
    )
    payload = json.loads(response.choices[0].message.content or "{}")
    items = payload.get("questions", []) or []
    return [
        ExtractedQuestion(
            topic=topic.name,
            level=level,
            prompt=q.get("prompt", ""),
            criteria=q.get("criteria", ""),
        )
        for q in items
        if q.get("prompt")
    ]


def ensure_full_bank(
    summary: str,
    topics: list[ExtractedTopic],
    questions: list[ExtractedQuestion],
    *,
    target: int = QUESTIONS_PER_PAIR,
) -> list[ExtractedQuestion]:
    """Гарантирует, что для каждой пары (topic.name, level) набрано >= target вопросов.

    Берёт исходный список, нормализует topic к именам тем (matchится по точному имени;
    несовпадающие отбрасываются), и для каждой неполной пары вызывает добор-генерацию.
    """
    valid_names = {t.name for t in topics}
    by_pair: dict[tuple[str, str], list[ExtractedQuestion]] = {}
    for q in questions:
        if q.topic not in valid_names or q.level not in LEVELS:
            continue
        by_pair.setdefault((q.topic, q.level), []).append(q)

    result: list[ExtractedQuestion] = []
    for topic in topics:
        for level in LEVELS:
            existing = by_pair.get((topic.name, level), [])
            missing = target - len(existing)
            if missing > 0:
                logger.info(
                    "Bank gap: topic=%r level=%s have=%d need=%d — генерирую добор",
                    topic.name, level, len(existing), target,
                )
                try:
                    extra = generate_questions_for_pair(summary, topic, level, missing)
                except Exception:
                    logger.exception("Добор вопросов упал для %r/%s", topic.name, level)
                    extra = []
                existing = existing + extra
            result.extend(existing[:target] if len(existing) >= target else existing)
    return result
