"""Публичный API промптов и JSON-схем для всех LLM-вызовов сервиса.

Сами тексты системных промптов лежат в `prompt_templates/*.md` —
это удобно править без перезапуска IDE и ревьюить как обычные документы
(подсветка markdown, normal diff). JSON-схемы и tool-описания — в
`prompt_schemas.py` (структурные данные, привязанные к коду через парсеры).

Этот файл — **только re-exports**. Все потребители импортируют отсюда:

    from app.llm.prompts import (
        EXTRACT_SYSTEM, EXTRACT_JSON_SCHEMA,
        REALTIME_INTERVIEWER_SYSTEM, SUBMIT_ANSWER_TOOL,
        ...
    )

Переезд на пакет `prompts/` намеренно не сделан — Python не разрешает
одновременно файл `prompts.py` и папку `prompts/`, и менять имя публичного
модуля = сломать все импорты в `extract.py / generate.py / evaluate.py /
realtime.py` без выгоды.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.llm.prompt_schemas import (
    CODE_REVIEW_JSON_SCHEMA,
    CODING_TASK_JSON_SCHEMA,
    CODING_TASKS_JSON_SCHEMA,
    EXTRACT_JSON_SCHEMA,
    SUBMIT_ANSWER_TOOL,
    SUMMARY_JSON_SCHEMA,
    TOPIC_QUESTIONS_JSON_SCHEMA,
    VOICE_EVAL_JSON_SCHEMA,
)

_TEMPLATES_DIR = Path(__file__).parent / "prompt_templates"


@lru_cache(maxsize=None)
def _load(name: str) -> str:
    """Прочитать `prompt_templates/{name}.md` один раз и закешировать.

    Тексты не меняются за время жизни процесса — `lru_cache` снимает
    дисковый I/O при повторных импортах. На trailing-newline `rstrip`,
    чтобы шаблон не вносил лишнюю пустую строку при `.format()` или
    конкатенации.
    """
    return (_TEMPLATES_DIR / f"{name}.md").read_text(encoding="utf-8").rstrip()


# ── Templates без плейсхолдеров (готовые системные промпты) ─────────────────
TOPIC_QUESTIONS_SYSTEM = _load("topic_questions")
CODING_TASK_SYSTEM = _load("coding_task")
CODING_TASKS_SYSTEM = _load("coding_tasks")
VOICE_EVAL_SYSTEM = _load("voice_eval")
CODE_REVIEW_SYSTEM = _load("code_review")
SUMMARY_SYSTEM = _load("summary")

# ── Templates с плейсхолдерами ──────────────────────────────────────────────
# EXTRACT — параметризован числом вопросов на пару (n) и total_for_4 для
# подсветки модели в инструкции. См. `extract.py: ensure_full_bank`.
EXTRACT_SYSTEM_TEMPLATE = _load("extract")
EXTRACT_SYSTEM = EXTRACT_SYSTEM_TEMPLATE.format(n=5, total_for_4=4 * 3 * 5)

# REALTIME — параметризован summary проекта и блоком вопросов; форматируется
# в `realtime.build_session_config`.
REALTIME_INTERVIEWER_SYSTEM = _load("realtime_interviewer")


__all__ = [
    # systems
    "EXTRACT_SYSTEM",
    "EXTRACT_SYSTEM_TEMPLATE",
    "TOPIC_QUESTIONS_SYSTEM",
    "CODING_TASK_SYSTEM",
    "CODING_TASKS_SYSTEM",
    "VOICE_EVAL_SYSTEM",
    "CODE_REVIEW_SYSTEM",
    "SUMMARY_SYSTEM",
    "REALTIME_INTERVIEWER_SYSTEM",
    # schemas + tools (re-exports)
    "EXTRACT_JSON_SCHEMA",
    "TOPIC_QUESTIONS_JSON_SCHEMA",
    "CODING_TASK_JSON_SCHEMA",
    "CODING_TASKS_JSON_SCHEMA",
    "VOICE_EVAL_JSON_SCHEMA",
    "CODE_REVIEW_JSON_SCHEMA",
    "SUMMARY_JSON_SCHEMA",
    "SUBMIT_ANSWER_TOOL",
]
