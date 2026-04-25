import json
from dataclasses import dataclass

from app.config import get_settings
from app.llm.client import get_openai
from app.llm.prompts import CODING_TASK_JSON_SCHEMA, CODING_TASK_SYSTEM


@dataclass(slots=True)
class CodingTask:
    language: str
    prompt: str


def generate_coding_task(summary: str, topics: list[str], level: str) -> CodingTask:
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
    payload = json.loads(response.choices[0].message.content or "{}")
    return CodingTask(
        language=payload.get("language", "python"),
        prompt=payload.get("prompt", ""),
    )
