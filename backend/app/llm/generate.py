import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import get_settings
from app.llm.client import get_openai, safe_json_loads
from app.llm.cost_tracker import record_chat_usage
from app.llm.prompts import (
    CODING_TASK_JSON_SCHEMA,
    CODING_TASK_SYSTEM,
    CODING_TASKS_JSON_SCHEMA,
    CODING_TASKS_SYSTEM,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CodingTask:
    language: str
    prompt: str


@dataclass(slots=True)
class CodingTaskItem:
    topic: str
    prompt: str


@dataclass(slots=True)
class CodingTaskSet:
    language: str
    tasks: list[CodingTaskItem]


def generate_coding_task(
    summary: str,
    topics: list[str],
    level: str,
    *,
    session_id: int | None = None,
    requirements_id: int | None = None,
    db: Session | None = None,
) -> CodingTask:
    settings = get_settings()
    client = get_openai()

    user = (
        f"Уровень кандидата: {level}.\n"
        f"Темы из стека проекта: {', '.join(topics) or 'не указано'}.\n\n"
        f"Контекст проекта:\n{summary}"
    )
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": CODING_TASK_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": CODING_TASK_JSON_SCHEMA},
        temperature=0.5,
    )
    record_chat_usage(
        kind="coding_task", model=settings.openai_chat_model,
        response=response, session_id=session_id, requirements_id=requirements_id, db=db,
    )
    payload = safe_json_loads(response.choices[0].message.content, kind="generate")
    return CodingTask(
        language=payload.get("language", "python"),
        prompt=payload.get("prompt", ""),
    )


def generate_coding_tasks(
    summary: str,
    topics: list[str],
    level: str,
    *,
    session_id: int | None = None,
    requirements_id: int | None = None,
    db: Session | None = None,
) -> CodingTaskSet:
    """Сгенерировать набор кодинг-задач — по одной на каждую тему из списка.

    `topics` уже разрешён (длина = желаемое число задач, повторы допустимы).
    Возвращает один общий язык для всех задач + список (topic, prompt).
    """
    if not topics:
        return CodingTaskSet(language="python", tasks=[])

    settings = get_settings()
    client = get_openai()

    enumerated = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(topics))
    user = (
        f"Уровень кандидата: {level}.\n"
        f"Список тем (порядок важен, всего {len(topics)}):\n{enumerated}\n\n"
        f"Контекст проекта:\n{summary}"
    )
    logger.info(
        "generate_coding_tasks: level=%s, topics_count=%d, summary_len=%d",
        level, len(topics), len(summary),
    )
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": CODING_TASKS_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": CODING_TASKS_JSON_SCHEMA},
        temperature=0.5,
    )
    record_chat_usage(
        kind="coding_tasks", model=settings.openai_chat_model,
        response=response, session_id=session_id, requirements_id=requirements_id, db=db,
    )
    payload = safe_json_loads(response.choices[0].message.content, kind="generate")
    raw_tasks = payload.get("tasks", []) or []
    language = payload.get("language", "python") or "python"

    tasks: list[CodingTaskItem] = []
    for i, t in enumerate(topics):
        raw = raw_tasks[i] if i < len(raw_tasks) else {}
        tasks.append(CodingTaskItem(
            topic=raw.get("topic") or t,
            prompt=raw.get("prompt") or "",
        ))
    logger.info(
        "generate_coding_tasks: language=%s, tasks=%d (got_from_llm=%d)",
        language, len(tasks), len(raw_tasks),
    )
    return CodingTaskSet(language=language, tasks=tasks)
