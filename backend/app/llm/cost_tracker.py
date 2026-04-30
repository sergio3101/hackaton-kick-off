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

# OpenAI Realtime API: расценки за 1M токенов, отдельно текст/аудио и in/out.
# Источник: openai.com/api/pricing на момент 2026-Q1 (gpt-4o-realtime-preview).
# Если используется новая ревизия модели — fallback по prefix-match на базовый.
REALTIME_PRICING_PER_M_TOKENS: dict[str, dict[str, float]] = {
    "gpt-4o-realtime-preview": {
        "text_input": 5.00,
        "text_output": 20.00,
        "audio_input": 100.00,
        "audio_output": 200.00,
    },
}


def _resolve_realtime_rate(model: str) -> dict[str, float] | None:
    rate = REALTIME_PRICING_PER_M_TOKENS.get(model)
    if rate is not None:
        return rate
    # gpt-4o-realtime-preview-2024-12-17 → matches gpt-4o-realtime-preview
    for key, value in REALTIME_PRICING_PER_M_TOKENS.items():
        if model.startswith(key):
            return value
    return None


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


def compute_realtime_cost_usd(
    model: str,
    *,
    text_in: int,
    text_out: int,
    audio_in: int,
    audio_out: int,
    cached_text_in: int = 0,
    cached_audio_in: int = 0,
) -> float:
    """Стоимость одного response Realtime API.

    cached_*_in — кешированные input-токены, тарифицируются вдвое дешевле
    (OpenAI Realtime cache discount). Если pricing для модели неизвестен,
    возвращаем 0.0 — не падаем.
    """
    rate = _resolve_realtime_rate(model)
    if rate is None:
        logger.warning("realtime pricing unknown for model=%s, cost=0", model)
        return 0.0
    fresh_text_in = max(0, text_in - cached_text_in)
    fresh_audio_in = max(0, audio_in - cached_audio_in)
    cost = (
        fresh_text_in * rate["text_input"]
        + cached_text_in * rate["text_input"] * 0.5
        + fresh_audio_in * rate["audio_input"]
        + cached_audio_in * rate["audio_input"] * 0.5
        + text_out * rate["text_output"]
        + audio_out * rate["audio_output"]
    ) / 1_000_000
    return cost


def record_realtime_usage(
    *,
    model: str,
    text_in: int,
    text_out: int,
    audio_in: int,
    audio_out: int,
    cached_text_in: int = 0,
    cached_audio_in: int = 0,
    session_id: int | None = None,
    db: Session | None = None,
) -> None:
    """Записать usage одного Realtime response в LLMUsage(kind='realtime')."""
    cost = compute_realtime_cost_usd(
        model,
        text_in=text_in, text_out=text_out,
        audio_in=audio_in, audio_out=audio_out,
        cached_text_in=cached_text_in, cached_audio_in=cached_audio_in,
    )
    _record(
        kind="realtime",
        model=model,
        # Кладём ВСЕ input-токены (text+audio) в prompt_tokens, output — в completion.
        # Это сохраняет совместимость с агрегатами; разбивку по каналам не теряем,
        # потому что cost_usd уже посчитан по точным тарифам.
        prompt_tokens=text_in + audio_in,
        completion_tokens=text_out + audio_out,
        cost_usd=cost,
        session_id=session_id,
        db=db,
    )
    logger.info(
        "realtime usage: model=%s text_in=%d audio_in=%d text_out=%d audio_out=%d cost=$%.4f",
        model, text_in, audio_in, text_out, audio_out, cost,
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
