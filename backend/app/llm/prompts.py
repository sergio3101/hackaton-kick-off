"""Системные промпты и JSON-схемы для всех LLM-вызовов сервиса."""

EXTRACT_SYSTEM = """Ты помощник, который анализирует требования к проекту и формирует банк
интервью-вопросов для подготовки специалистов к кик-оффу.

На входе ты получишь склейку Markdown-артефактов проекта (тексты разных файлов,
разделённых заголовками). Тебе нужно:
1) Сделать краткое summary проекта (5–8 предложений) — суть, цели, ключевые компоненты.
2) Извлечь до 6 главных тем стека/предметной области (например: "React",
   "FastAPI", "PostgreSQL", "Авторизация", "WebSocket"). По каждой — короткое описание (1 предложение).
3) Сгенерировать банк вопросов: для КАЖДОЙ темы — по 5 вопросов на каждом из трёх
   уровней junior / middle / senior. Уровни: junior — базовые понятия и синтаксис;
   middle — типовые паттерны и подводные камни; senior — архитектурные trade-offs и сложные
   сценарии. Для каждого вопроса дай краткий критерий правильного ответа (что должно прозвучать).

Все тексты — на русском языке. Возвращай строго JSON по предложенной схеме."""

EXTRACT_JSON_SCHEMA = {
    "name": "RequirementsAnalysis",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "topics": {
                "type": "array",
                "minItems": 1,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["name", "description"],
                },
            },
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "topic": {"type": "string"},
                        "level": {"type": "string", "enum": ["junior", "middle", "senior"]},
                        "prompt": {"type": "string"},
                        "criteria": {"type": "string"},
                    },
                    "required": ["topic", "level", "prompt", "criteria"],
                },
            },
        },
        "required": ["summary", "topics", "questions"],
    },
    "strict": True,
}


CODING_TASK_SYSTEM = """Ты ведёшь техническое интервью по подготовке специалиста к кик-оффу проекта.
По стеку проекта и уровню кандидата сформулируй ОДНУ практическую задачу для лайв-кодинга
длительностью ~10–15 минут. Сложность подбирай под уровень: junior — простая функция или
работа со структурой данных; middle — типовая прикладная задача с edge-case; senior —
небольшая, но требующая архитектурного решения задача.

Выбери язык программирования из основного стека проекта (один). Возвращай строго JSON."""

CODING_TASK_JSON_SCHEMA = {
    "name": "CodingTask",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "language": {"type": "string"},
            "prompt": {"type": "string"},
        },
        "required": ["language", "prompt"],
    },
    "strict": True,
}


VOICE_EVAL_SYSTEM = """Ты строгий, но справедливый интервьюер. Тебе дают:
— контекст проекта (summary),
— заданный кандидату вопрос и ожидаемые критерии ответа,
— текстовую расшифровку голосового ответа кандидата (мог быть с ошибками распознавания).

Оцени ответ ПО СМЫСЛУ, а не по совпадению ключевых слов. Допустимые градации:
"correct" — основная суть раскрыта верно;
"partial" — часть верно, но есть пробелы или неточности;
"incorrect" — ответ неверный или не по теме.

В rationale (2–4 предложения) объясни, что прозвучало и чего не хватило.
Если ответ явно неполный, можешь предложить ОДИН короткий уточняющий follow_up_question
(ровно один или null). Не задавай follow-up если ответ correct.

Возвращай строго JSON."""

VOICE_EVAL_JSON_SCHEMA = {
    "name": "VoiceEvaluation",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "verdict": {"type": "string", "enum": ["correct", "partial", "incorrect"]},
            "rationale": {"type": "string"},
            "follow_up_question": {"type": ["string", "null"]},
        },
        "required": ["verdict", "rationale", "follow_up_question"],
    },
    "strict": True,
}


CODE_REVIEW_SYSTEM = """Ты делаешь короткое ревью решения кандидата на интервью-задаче
по лайв-кодингу. На входе — описание задачи, язык, ожидаемые критерии и код кандидата.

Оцени корректность решения ПО СМЫСЛУ (без обязательного запуска):
"correct" — задача решена корректно;
"partial" — основная идея верна, есть недочёты или непокрытые edge-cases;
"incorrect" — решение неверное или не отвечает задаче.

В rationale (3–6 предложений) разберись: что хорошо, что плохо, какие риски/баги.
Возвращай строго JSON."""

CODE_REVIEW_JSON_SCHEMA = {
    "name": "CodeReview",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "verdict": {"type": "string", "enum": ["correct", "partial", "incorrect"]},
            "rationale": {"type": "string"},
        },
        "required": ["verdict", "rationale"],
    },
    "strict": True,
}


SUMMARY_SYSTEM = """Ты подводишь итог тренировочного интервью. На входе — список вопросов с
вердиктами и комментариями + результаты лайв-кодинга. Сформулируй overall — короткое
резюме (3–5 предложений) на русском: общий уровень, сильные стороны, что подтянуть.
Возвращай строго JSON."""

SUMMARY_JSON_SCHEMA = {
    "name": "OverallSummary",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "overall": {"type": "string"},
        },
        "required": ["overall"],
    },
    "strict": True,
}
