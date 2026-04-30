"""JSON-схемы и tool-описания для строгого ответа LLM.

Текстовые системные промпты — в `prompt_templates/*.md`. Здесь — только
структурные данные: response_format=json_schema для chat completions и
tool-описание для Realtime API.

При добавлении новой LLM-задачи добавляй сюда схему и/или tool рядом с
соответствующим промптом-шаблоном.
"""

from __future__ import annotations


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

SUMMARY_JSON_SCHEMA = {
    "name": "OverallSummary",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "overall": {"type": "string"},
            "final_verdict": {
                "type": "string",
                "enum": ["ready", "almost", "needs_practice", "not_ready"],
            },
            "final_recommendation": {"type": "string"},
        },
        "required": ["overall", "final_verdict", "final_recommendation"],
    },
    "strict": True,
}


# Tool-описание для OpenAI Realtime API: модель вызывает submit_answer
# после каждого засчитанного ответа кандидата. Не путать с json_schema:
# здесь формат function-tool, не response_format.
SUBMIT_ANSWER_TOOL = {
    "type": "function",
    "name": "submit_answer",
    "description": (
        "Зафиксировать ответ кандидата на текущий вопрос. Вызывай ровно один раз "
        "после каждого ответа — система оценит его и вернёт next_question_id "
        "и опциональный follow_up_question."
    ),
    "parameters": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "question_id": {
                "type": "integer",
                "description": "ID вопроса из списка (см. system prompt).",
            },
            "transcript": {
                "type": "string",
                "description": (
                    "СТРОГО только речь самого кандидата — его ответ на текущий "
                    "вопрос как ты его услышал. НЕ включай: свои реплики, наводящие "
                    "вопросы, ответы на уточнения, связки и переходы. НЕ суммаризируй, "
                    "не перефразируй; передавай дословно. Если ответ состоит из "
                    "нескольких реплик кандидата (он начал, ты подсказал, он "
                    "продолжил) — склей только реплики кандидата через пробел. "
                    "Если кандидат отказался отвечать — пустая строка с пометкой "
                    "[пропущено кандидатом]."
                ),
            },
        },
        "required": ["question_id", "transcript"],
    },
}
