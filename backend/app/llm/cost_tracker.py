"""Учёт стоимости OpenAI-вызовов.

Цены в `PRICING_PER_M_TOKENS` — публичные тарифы OpenAI на момент 2026-Q1; при смене
модели обновлять вручную. Для chat-моделей считаем по `response.usage`; для STT/TTS
оцениваем по характеристикам входа: STT — по длительности аудио (если известна, иначе
приближаем по байтам ~150 KB/min), TTS — по числу символов входного текста.

Запись в БД делается best-effort: ошибка трекинга не должна ронять бизнес-логику.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import LLMUsage

logger = logging.getLogger(__name__)


# USD за 1M токенов (prompt, completion). Источник: openai.com/api/pricing.
PRICING_PER_M_TOKENS: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
}

# TTS-1: $15.00 за 1M входных символов.
TTS_PRICE_PER_CHAR: dict[str, float] = {
    "tts-1": 15.00 / 1_000_000,
    "tts-1-hd": 30.00 / 1_000_000,
}

# Whisper: $0.006 за минуту входного аудио.
WHISPER_PRICE_PER_MIN: dict[str, float] = {
    "whisper-1": 0.006,
}

# Грубая оценка длительности webm-аудио, если duration не передан.
WEBM_BYTES_PER_SECOND = 2500


def compute_chat_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    rate = PRICING_PER_M_TOKENS.get(model)
    if rate is None:
        return 0.0
    p_in, p_out = rate
    return (prompt_tokens * p_in + completion_tokens * p_out) / 1_000_000


def compute_tts_cost_usd(model: str, char_count: int) -> float:
    # Fallback на цену tts-1, если модель не из известного списка — чтобы новый id (например,
    # tts-1-hd-2024 или nano-tts) не давал нулевую стоимость в отчёте.
    rate = TTS_PRICE_PER_CHAR.get(model, TTS_PRICE_PER_CHAR["tts-1"])
    return rate * char_count


def compute_whisper_cost_usd(model: str, *, audio_seconds: float | None, audio_bytes: int) -> float:
    rate = WHISPER_PRICE_PER_MIN.get(model)
    if rate is None:
        return 0.0
    if audio_seconds is None:
        audio_seconds = audio_bytes / WEBM_BYTES_PER_SECOND
    return rate * (audio_seconds / 60.0)


def _record(
    *,
    kind: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_usd: float = 0.0,
    session_id: int | None = None,
    requirements_id: int | None = None,
    db: Session | None = None,
) -> None:
    """Запись usage в БД.

    Если передан `db: Session` — используется эта сессия (запись попадёт в основную
    транзакцию вызывающего и откатится вместе с ней при rollback). Это правильное
    поведение для случаев, когда LLM-вызов и бизнес-логика должны быть атомарны.

    Если `db is None` — открывается отдельный SessionLocal и сразу коммитится
    (best-effort, основная транзакция вызывающего не затрагивается). Это сохранилось
    для совместимости с местами, где нет доступа к db (например, тесты).
    """
    record = LLMUsage(
        session_id=session_id,
        requirements_id=requirements_id,
        kind=kind,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost_usd=cost_usd,
    )
    try:
        if db is not None:
            db.add(record)
            # Не коммитим — это сделает вызывающий вместе с основной транзакцией.
            return
        with SessionLocal() as own_db:
            own_db.add(record)
            own_db.commit()
    except Exception:
        logger.exception("cost_tracker: failed to record usage (kind=%s model=%s)", kind, model)


def record_chat_usage(
    *,
    kind: str,
    model: str,
    response,
    session_id: int | None = None,
    requirements_id: int | None = None,
    db: Session | None = None,
) -> None:
    """Достать usage из ChatCompletion-ответа и записать в БД."""
    usage = getattr(response, "usage", None)
    pt = int(getattr(usage, "prompt_tokens", 0) or 0)
    ct = int(getattr(usage, "completion_tokens", 0) or 0)
    cost = compute_chat_cost_usd(model, pt, ct)
    _record(
        kind=kind,
        model=model,
        prompt_tokens=pt,
        completion_tokens=ct,
        cost_usd=cost,
        session_id=session_id,
        requirements_id=requirements_id,
        db=db,
    )


def record_tts_usage(
    *,
    model: str,
    char_count: int,
    session_id: int | None = None,
    db: Session | None = None,
) -> None:
    cost = compute_tts_cost_usd(model, char_count)
    _record(
        kind="tts",
        model=model,
        prompt_tokens=char_count,  # для TTS храним символы в prompt_tokens как метрику
        cost_usd=cost,
        session_id=session_id,
        db=db,
    )


def record_stt_usage(
    *,
    model: str,
    audio_bytes: int,
    audio_seconds: float | None = None,
    session_id: int | None = None,
    db: Session | None = None,
) -> None:
    cost = compute_whisper_cost_usd(model, audio_seconds=audio_seconds, audio_bytes=audio_bytes)
    _record(
        kind="stt",
        model=model,
        prompt_tokens=audio_bytes,  # для STT храним байты в prompt_tokens как метрику
        cost_usd=cost,
        session_id=session_id,
        db=db,
    )
