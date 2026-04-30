"""Detect coding language by topic.

Используется для назначения языка проверки/подсветки конкретно для
кодинг-задачи, исходя из её темы (Docker, gRPC, PostgreSQL, ...).

Должно соответствовать `frontend/src/features/coding/useCodingState.ts:detectLanguage`.
"""
from __future__ import annotations

import re

_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(^|[^a-z])docker([^a-z]|$)|dockerfile", re.I), "dockerfile"),
    (re.compile(r"kubernetes|k8s|helm|nginx|ya?ml", re.I), "yaml"),
    (re.compile(r"grpc|protobuf|proto\b", re.I), "proto"),
    (re.compile(r"postgres|postgresql|mysql|mssql|sqlite|redis|\bsql\b", re.I), "sql"),
    (re.compile(r"typescript|\btsx?\b", re.I), "typescript"),
    (re.compile(r"javascript|node\.?js|react|vue|svelte|express|\bjsx?\b", re.I), "javascript"),
    (re.compile(r"\bgo\b|golang|gin|echo", re.I), "go"),
    (re.compile(r"python|fastapi|django|flask|asyncio|pydantic|sqlalchemy", re.I), "python"),
    (re.compile(r"\bjava\b|spring|kotlin", re.I), "java"),
    (re.compile(r"rust|cargo", re.I), "rust"),
    (re.compile(r"c\+\+|cpp", re.I), "cpp"),
    (re.compile(r"c#|csharp|dotnet|\.net", re.I), "csharp"),
    (re.compile(r"php|laravel|symfony", re.I), "php"),
    (re.compile(r"ruby|rails", re.I), "ruby"),
]


def detect_coding_language(topic: str | None, default: str = "python") -> str:
    """Возвращает язык подсветки/проверки для конкретной кодинг-задачи.

    Если в `topic` нет известных маркеров — возвращает `default`.
    """
    if not topic:
        return default
    for pattern, lang in _RULES:
        if pattern.search(topic):
            return lang
    return default
