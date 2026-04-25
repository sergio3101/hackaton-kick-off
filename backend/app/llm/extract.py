import json
from dataclasses import dataclass

from app.config import get_settings
from app.llm.client import get_openai
from app.llm.prompts import EXTRACT_JSON_SCHEMA, EXTRACT_SYSTEM


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
    return ExtractionResult(
        summary=payload.get("summary", ""),
        topics=topics,
        questions=questions,
    )
