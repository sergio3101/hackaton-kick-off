"""Системные промпты и JSON-схемы для всех LLM-вызовов сервиса."""

EXTRACT_SYSTEM_TEMPLATE = """Ты помощник, который анализирует требования к проекту и формирует банк
интервью-вопросов для подготовки специалистов к кик-оффу.

На входе ты получишь склейку Markdown-артефактов проекта (тексты разных файлов,
разделённых заголовками). Тебе нужно:
1) Сделать краткое summary проекта (5–8 предложений) — суть, цели, ключевые компоненты.
2) Извлечь до 6 главных тем стека/предметной области (например: "React",
   "FastAPI", "PostgreSQL", "Авторизация", "WebSocket"). По каждой — короткое описание (1 предложение).
3) Сгенерировать банк вопросов: для КАЖДОЙ темы — РОВНО {n} вопросов на каждом из
   трёх уровней junior / middle / senior. Это значит: если тем 4, в массиве `questions`
   будет ровно 4 × 3 × {n} = {total_for_4} объектов. Меньше — недопустимо. Уровни: junior —
   базовые понятия и синтаксис; middle — типовые паттерны и подводные камни; senior —
   архитектурные trade-offs и сложные сценарии. Для каждого вопроса дай краткий
   критерий правильного ответа (что должно прозвучать). Поле `topic` каждого вопроса
   должно ТОЧНО совпадать с одним из `topics[].name` (буква-в-букву).

Все тексты — на русском языке. Возвращай строго JSON по предложенной схеме."""

# Совместимость для дефолтного варианта (5 вопросов на пару).
EXTRACT_SYSTEM = EXTRACT_SYSTEM_TEMPLATE.format(n=5, total_for_4=4 * 3 * 5)


TOPIC_QUESTIONS_SYSTEM = """Ты помощник по подготовке специалистов к кик-оффу.
Тебе дают: краткое summary проекта, конкретную тему (название + описание) и уровень
(junior / middle / senior). Сгенерируй РОВНО запрошенное число вопросов для этой
пары (тема × уровень) с краткими критериями правильного ответа.

Уровни: junior — базовые понятия и синтаксис; middle — типовые паттерны и подводные
камни; senior — архитектурные trade-offs и сложные сценарии. Все тексты — на русском.
Возвращай строго JSON."""

TOPIC_QUESTIONS_JSON_SCHEMA = {
    "name": "TopicQuestions",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "prompt": {"type": "string"},
                        "criteria": {"type": "string"},
                    },
                    "required": ["prompt", "criteria"],
                },
            },
        },
        "required": ["questions"],
    },
    "strict": True,
}

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


CODING_TASKS_SYSTEM = """Ты ведёшь техническое интервью по подготовке специалиста к кик-оффу.
На входе ты получишь summary проекта, уровень кандидата и УПОРЯДОЧЕННЫЙ список тем
(по одной задаче на каждую тему — темы могут повторяться, в этом случае задачи должны
существенно различаться по сценарию).

Сгенерируй РОВНО столько задач, сколько тем во входном списке. Каждая задача —
короткая практическая задача для лайв-кодинга на ~10–15 минут, привязанная к своей
теме. Сложность подбирай под уровень: junior — простая функция или работа со
структурами данных; middle — типовая прикладная задача с edge-case; senior —
небольшая, но требующая архитектурного решения задача.

Выбери ОДИН язык программирования из основного стека проекта — он одинаковый для
всех задач. Поле `topic` каждой задачи должно ТОЧНО совпадать с соответствующей
строкой из входного списка тем (буква-в-букву, в том же порядке). Все тексты — на
русском. Возвращай строго JSON."""

CODING_TASKS_JSON_SCHEMA = {
    "name": "CodingTaskSet",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "language": {"type": "string"},
            "tasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "topic": {"type": "string"},
                        "prompt": {"type": "string"},
                    },
                    "required": ["topic", "prompt"],
                },
            },
        },
        "required": ["language", "tasks"],
    },
    "strict": True,
}


VOICE_EVAL_SYSTEM = """Ты строгий, но справедливый интервьюер-наставник. Тебе дают:
— контекст проекта (summary),
— заданный кандидату вопрос и ожидаемые критерии ответа,
— текстовую расшифровку голосового ответа кандидата (мог быть с ошибками распознавания).

Оцени ответ ПО СМЫСЛУ, а не по совпадению ключевых слов. Допустимые градации:
"correct" — основная суть раскрыта верно;
"partial" — часть верно, но есть пробелы или неточности;
"incorrect" — ответ неверный или не по теме.

Поля ответа:
1. rationale (2–4 предложения) — что прозвучало и чего не хватило.
2. expected_answer (4–8 предложений) — образцовый ответ на вопрос на уровне miдl/seнior, как
   если бы отвечал опытный специалист. Это эталон, на который кандидат сможет ориентироваться
   после интервью. Пиши развёрнуто, но без воды; терминология, ключевые понятия, типичные
   trade-offs, edge-cases. Не пересказывай критерии дословно — раскрывай тему.
3. explanation (2–4 предложения) — конкретно, что НЕ прозвучало в ответе кандидата по
   сравнению с эталоном, какие пробелы стоит подтянуть. Если ответ correct — кратко отметь,
   что было сделано хорошо.
4. follow_up_question — ОДИН короткий вопрос или null. Адаптируй под ответ кандидата:
   • если verdict=partial — уточняющий или упрощённый вопрос (наводящий, частный случай,
     помоги достать недостающее);
   • если verdict=correct и ответ глубокий — углубляющий вопрос (edge-case, обоснование
     trade-off, продвинутый сценарий) — задавай только когда видно, что есть куда копать;
   • если verdict=correct и ответ короткий и формальный — null;
   • если verdict=incorrect — null (лучше идти к следующему вопросу, не запутывать).
5. follow_up_kind — категория follow-up: "easier" (упрощение/наводящий), "deeper" (углубление),
   "clarify" (уточнение пробела), либо null если follow_up_question=null. Должно быть согласовано
   с follow_up_question.

Если в user-сообщении присутствует строка «Голосовые признаки: …» — это эвристика темпа речи
и пауз кандидата. НЕ оценивай знания по ней (медленный темп ≠ незнание), но можешь учесть в
выборе follow_up_kind: при «медленно, с раздумьями» — скорее clarify/easier; при «очень быстро»
и поверхностном смысле — deeper. В rationale — НЕ цитируй эти признаки явно.

Все тексты — на русском. Возвращай строго JSON."""

VOICE_EVAL_JSON_SCHEMA = {
    "name": "VoiceEvaluation",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "verdict": {"type": "string", "enum": ["correct", "partial", "incorrect"]},
            "rationale": {"type": "string"},
            "expected_answer": {"type": "string"},
            "explanation": {"type": "string"},
            "follow_up_question": {"type": ["string", "null"]},
            "follow_up_kind": {"type": ["string", "null"], "enum": ["easier", "deeper", "clarify", None]},
        },
        "required": [
            "verdict", "rationale", "expected_answer", "explanation",
            "follow_up_question", "follow_up_kind",
        ],
    },
    "strict": True,
}


CODE_REVIEW_SYSTEM = """Ты делаешь короткое ревью решения кандидата на интервью-задаче
по лайв-кодингу. На входе — описание задачи, язык, ожидаемые критерии и код кандидата.

Оцени корректность решения ПО СМЫСЛУ (без обязательного запуска):
"correct" — задача решена корректно;
"partial" — основная идея верна, есть недочёты или непокрытые edge-cases;
"incorrect" — решение неверное или не отвечает задаче.

Поля ответа:
1. rationale (3–6 предложений) — что хорошо, что плохо, какие риски/баги.
2. expected_answer — короткое (5–25 строк) образцовое решение задачи на указанном языке.
   Используй идиоматичный код, покрывай ключевые edge-cases. Только код, без markdown-обёрток
   ```. Если задача допускает несколько подходов — дай один наиболее показательный.
3. explanation (2–4 предложения) — что в коде кандидата отличается от эталона: упущенные
   edge-cases, неэффективные приёмы, отсутствующая обработка ошибок. Если решение correct —
   кратко отметь, что было решено хорошо.

Все пояснения — на русском. Возвращай строго JSON."""

CODE_REVIEW_JSON_SCHEMA = {
    "name": "CodeReview",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "verdict": {"type": "string", "enum": ["correct", "partial", "incorrect"]},
            "rationale": {"type": "string"},
            "expected_answer": {"type": "string"},
            "explanation": {"type": "string"},
        },
        "required": ["verdict", "rationale", "expected_answer", "explanation"],
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
