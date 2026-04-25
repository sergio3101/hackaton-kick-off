"""Обёртки над OpenAI Whisper (STT) и TTS."""

from __future__ import annotations

import io
import logging

from openai import BadRequestError

from app.config import get_settings
from app.llm.client import get_openai

logger = logging.getLogger(__name__)

MIN_AUDIO_BYTES = 1500


class AudioTooShortError(Exception):
    """STT отказался обрабатывать слишком короткое/тихое аудио."""


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    if len(audio_bytes) < MIN_AUDIO_BYTES:
        logger.info("transcribe_audio: too short (%d bytes), aborting before STT", len(audio_bytes))
        raise AudioTooShortError()

    settings = get_settings()
    client = get_openai()
    bio = io.BytesIO(audio_bytes)
    bio.name = filename
    try:
        transcription = client.audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=bio,
            response_format="text",
        )
    except BadRequestError as exc:
        msg = (str(exc) or "").lower()
        if "audio_too_short" in msg or "minimum audio" in msg or "too short" in msg:
            logger.info("transcribe_audio: whisper rejected as too short")
            raise AudioTooShortError() from exc
        raise
    text = transcription.strip() if isinstance(transcription, str) else getattr(transcription, "text", "").strip()
    logger.info("transcribe_audio: bytes=%d, transcript_len=%d", len(audio_bytes), len(text))
    return text


def synthesize_speech(text: str) -> bytes:
    settings = get_settings()
    client = get_openai()
    response = client.audio.speech.create(
        model=settings.openai_tts_model,
        voice=settings.openai_tts_voice,
        input=text,
        response_format="mp3",
    )
    audio = response.read()
    logger.info("synthesize_speech: text_len=%d, audio_bytes=%d", len(text), len(audio))
    return audio
