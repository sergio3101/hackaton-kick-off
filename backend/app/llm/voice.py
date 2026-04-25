"""Обёртки над OpenAI Whisper (STT) и TTS."""

import io

from app.config import get_settings
from app.llm.client import get_openai


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    settings = get_settings()
    client = get_openai()
    bio = io.BytesIO(audio_bytes)
    bio.name = filename
    transcription = client.audio.transcriptions.create(
        model=settings.openai_stt_model,
        file=bio,
        response_format="text",
    )
    if isinstance(transcription, str):
        return transcription.strip()
    return getattr(transcription, "text", "").strip()


def synthesize_speech(text: str) -> bytes:
    settings = get_settings()
    client = get_openai()
    response = client.audio.speech.create(
        model=settings.openai_tts_model,
        voice=settings.openai_tts_voice,
        input=text,
        response_format="mp3",
    )
    return response.read()
