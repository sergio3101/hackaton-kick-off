"""Обёртки над OpenAI Whisper (STT) и TTS."""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

from openai import BadRequestError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.llm.client import get_openai
from app.llm.cost_tracker import record_stt_usage, record_tts_usage

logger = logging.getLogger(__name__)

MIN_AUDIO_BYTES = 1500
# Зазор между Whisper-сегментами, который считаем «значимой» паузой кандидата.
LONG_PAUSE_SEC = 0.7


class AudioTooShortError(Exception):
    """STT отказался обрабатывать слишком короткое/тихое аудио."""


@dataclass(slots=True)
class VoiceMetrics:
    """Эвристика «уверенности» голоса для контекста LLM-оценки.

    speaking_rate_wps типично 2.0–2.8 для уверенной речи на родном языке;
    <1.5 — медленно/раздумывая, >3.2 — быстро/заученно.
    """

    audio_seconds: float
    word_count: int
    speaking_rate_wps: float
    pauses_count: int

    def confidence_hint(self) -> str:
        """Короткая словесная характеристика для system-prompt."""
        rate = self.speaking_rate_wps
        if self.audio_seconds < 3.0:
            tempo = "очень короткий ответ"
        elif rate == 0:
            tempo = "темп речи неизвестен"
        elif rate < 1.5:
            tempo = "медленно, с раздумьями"
        elif rate > 3.2:
            tempo = "очень быстро (возможно — заученно)"
        else:
            tempo = "ровный темп"
        pauses = (
            "без длинных пауз"
            if self.pauses_count == 0
            else f"{self.pauses_count} значимых пауз"
        )
        return (
            f"длительность {self.audio_seconds:.1f} сек, "
            f"{self.word_count} слов, темп {rate:.1f} сл/сек ({tempo}), {pauses}"
        )


@dataclass(slots=True)
class TranscriptionResult:
    text: str
    metrics: VoiceMetrics


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    *,
    session_id: int | None = None,
    db: Session | None = None,
) -> TranscriptionResult:
    if len(audio_bytes) < MIN_AUDIO_BYTES:
        logger.info("transcribe_audio: too short (%d bytes), aborting before STT", len(audio_bytes))
        raise AudioTooShortError()

    settings = get_settings()
    client = get_openai()
    bio = io.BytesIO(audio_bytes)
    bio.name = filename
    try:
        # verbose_json даёт duration и segments — нужны для метрик уверенности (C3).
        transcription = client.audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=bio,
            response_format="verbose_json",
        )
    except BadRequestError as exc:
        msg = (str(exc) or "").lower()
        if "audio_too_short" in msg or "minimum audio" in msg or "too short" in msg:
            logger.info("transcribe_audio: whisper rejected as too short")
            raise AudioTooShortError() from exc
        raise

    text = (getattr(transcription, "text", "") or "").strip()
    duration = float(getattr(transcription, "duration", 0.0) or 0.0)
    segments = list(getattr(transcription, "segments", None) or [])

    if not segments and text:
        # Старая версия SDK или другой формат ответа — pauses не посчитаются, voice_signals
        # будет менее информативным, но это не должно ломать остальную логику.
        logger.warning("transcribe_audio: verbose_json вернул text без segments")

    word_count = len(text.split()) if text else 0
    speaking_rate = (word_count / duration) if duration > 0 else 0.0

    pauses = 0
    prev_end: float | None = None
    for seg in segments:
        start = float(getattr(seg, "start", 0.0) or 0.0)
        end = float(getattr(seg, "end", start) or start)
        if prev_end is not None and (start - prev_end) >= LONG_PAUSE_SEC:
            pauses += 1
        prev_end = end

    metrics = VoiceMetrics(
        audio_seconds=duration,
        word_count=word_count,
        speaking_rate_wps=speaking_rate,
        pauses_count=pauses,
    )

    record_stt_usage(
        model=settings.openai_stt_model,
        audio_bytes=len(audio_bytes),
        audio_seconds=duration if duration > 0 else None,
        session_id=session_id,
        db=db,
    )
    logger.info(
        "transcribe_audio: bytes=%d, transcript_len=%d, duration=%.1fs, "
        "words=%d, wps=%.2f, pauses=%d",
        len(audio_bytes), len(text), duration, word_count, speaking_rate, pauses,
    )
    return TranscriptionResult(text=text, metrics=metrics)


def synthesize_speech(
    text: str,
    *,
    session_id: int | None = None,
    db: Session | None = None,
    voice: str | None = None,
) -> bytes:
    settings = get_settings()
    tts_voice = voice or settings.openai_tts_voice
    client = get_openai()
    response = client.audio.speech.create(
        model=settings.openai_tts_model,
        voice=tts_voice,
        input=text,
        response_format="mp3",
    )
    audio = response.read()
    record_tts_usage(
        model=settings.openai_tts_model,
        char_count=len(text),
        session_id=session_id,
        db=db,
    )
    logger.info("synthesize_speech: text_len=%d, audio_bytes=%d", len(text), len(audio))
    return audio
