"""Мост между нашим WS-клиентом и OpenAI Realtime API.

OpenAI Realtime говорит JSON-сообщениями через WebSocket; модель сама делает
STT, ведёт диалог голосом, детектит конец реплики (server VAD), шлёт частичные
транскрипты и аудио-чанки. Здесь — только трансляция событий и обёртка
над ключевыми клиентскими действиями (`session.update`, `input_audio_buffer.append`,
`response.cancel`, отдача `function_call_output`).

Бизнес-логика интервью (банк вопросов, evaluation через gpt-4o-mini) живёт
в `routers/interview_ws.py` — он подписывается на server-events моста через
обычный `async for ev in bridge.events()`.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any, AsyncIterator

from websockets.asyncio.client import ClientConnection, connect as ws_connect

from app.config import get_settings
from app.llm.prompts import REALTIME_INTERVIEWER_SYSTEM, SUBMIT_ANSWER_TOOL

logger = logging.getLogger(__name__)

REALTIME_URL = "wss://api.openai.com/v1/realtime?model={model}"

# Параметры server-VAD: подобраны под русскую речь и среднюю студийную тишину.
# silence_duration_ms=500 — короче пауза → быстрее переход к следующему
# вопросу (главная цель плана), но не настолько, чтобы рвать речь на «ну…».
DEFAULT_TURN_DETECTION = {
    "type": "server_vad",
    "threshold": 0.5,
    "prefix_padding_ms": 300,
    "silence_duration_ms": 500,
    "create_response": True,
}

# Список голосов Realtime API — единственный допустимый. Если в сессии
# сохранён несовместимый голос (старый assignment), валидируем на whitelist
# и падаем на дефолт без маппинга.
REALTIME_VOICES = {
    "alloy", "ash", "ballad", "coral", "echo",
    "sage", "shimmer", "verse", "marin", "cedar",
}
DEFAULT_REALTIME_VOICE = "alloy"


def resolve_realtime_voice(voice: str | None) -> str:
    if voice and voice in REALTIME_VOICES:
        return voice
    if voice:
        logger.info(
            "realtime: voice %r не поддерживается Realtime API, использую %r",
            voice, DEFAULT_REALTIME_VOICE,
        )
    return DEFAULT_REALTIME_VOICE


def _build_questions_block(questions: list[dict[str, Any]]) -> str:
    """Текстовый блок вопросов для system-prompt.

    Формат — `[id=42] (Тема) Текст вопроса`. id используется моделью при
    вызове tool `submit_answer`, тема — при озвучке связки «Давайте
    поговорим о ...».
    """
    lines: list[str] = []
    for q in questions:
        lines.append(
            f"[id={q['question_id']}] ({q['topic']}) {q['prompt_text']}"
        )
    return "\n".join(lines) if lines else "(вопросов нет)"


def build_session_config(
    *,
    project_summary: str,
    questions: list[dict[str, Any]],
    voice: str,
) -> dict[str, Any]:
    """Подготовить payload для `session.update`.

    Голос берётся из per-session настроек (admin может выставить при
    назначении), модальности — голос+текст: текст нужен для частичных
    транскриптов в `response.audio_transcript.delta`.
    """
    instructions = REALTIME_INTERVIEWER_SYSTEM.format(
        project_summary=project_summary or "(контекст не указан)",
        questions_block=_build_questions_block(questions),
    )
    return {
        "modalities": ["audio", "text"],
        "instructions": instructions,
        "voice": resolve_realtime_voice(voice),
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "input_audio_transcription": {"model": "whisper-1"},
        "turn_detection": DEFAULT_TURN_DETECTION,
        "tools": [SUBMIT_ANSWER_TOOL],
        "tool_choice": "auto",
        "temperature": 0.8,  # повыше — для живых связок и наводящих подсказок
    }


class RealtimeBridge:
    """Тонкая обёртка над WebSocket к OpenAI Realtime.

    Использование:

        async with RealtimeBridge(session_config=...) as bridge:
            async for event in bridge.events():
                ...

    События приходят как dict (распарсенный JSON server-event). Параллельно
    можно слать `append_audio`, `cancel_response`, `submit_tool_output`.
    """

    def __init__(self, *, session_config: dict[str, Any]) -> None:
        self._session_config = session_config
        self._ws: ClientConnection | None = None
        self._send_lock = asyncio.Lock()

    async def __aenter__(self) -> "RealtimeBridge":
        settings = get_settings()
        url = REALTIME_URL.format(model=settings.openai_realtime_model)
        # websockets.asyncio.client.connect: для аутентификации и OpenAI-Beta
        # пробрасываем кастомные заголовки через `additional_headers`.
        self._ws = await ws_connect(
            url,
            additional_headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            },
            max_size=16 * 1024 * 1024,  # большие audio.delta в одном кадре
            open_timeout=15,
            ping_interval=20,
            ping_timeout=20,
        )
        # Сразу шлём session.update, чтобы система начала с нашими
        # инструкциями/инструментами/VAD-настройками. До первого
        # `session.updated` модель не примет input_audio_buffer.append.
        await self._send({"type": "session.update", "session": self._session_config})
        logger.info("RealtimeBridge: connected, session.update sent")
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()

    async def close(self) -> None:
        ws, self._ws = self._ws, None
        if ws is None:
            return
        try:
            await ws.close()
        except Exception:
            logger.debug("RealtimeBridge: close raised", exc_info=True)

    async def _send(self, payload: dict[str, Any]) -> None:
        ws = self._ws
        if ws is None:
            raise RuntimeError("RealtimeBridge not connected")
        # Сериализация заранее — чтобы под send_lock было максимально коротко.
        data = json.dumps(payload)
        async with self._send_lock:
            await ws.send(data)

    async def append_audio(self, audio_b64: str) -> None:
        """Прокинуть PCM16-чанк от клиента в Realtime."""
        if not audio_b64:
            return
        await self._send(
            {"type": "input_audio_buffer.append", "audio": audio_b64}
        )

    async def cancel_response(self) -> None:
        """Прервать текущую генерацию (barge-in)."""
        await self._send({"type": "response.cancel"})

    async def submit_tool_output(
        self,
        *,
        call_id: str,
        output: dict[str, Any],
        trigger_response: bool = True,
    ) -> None:
        """Отдать результат tool-call обратно модели.

        После function_call_output обязательно нужно `response.create`,
        иначе модель не продолжит генерацию голоса (она сидит и ждёт нашу
        реакцию). `trigger_response=False` оставлен на случай, если в
        будущем понадобится ассемблировать несколько tool-output подряд.
        """
        await self._send(
            {
                "type": "conversation.item.create",
                "item": {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(output, ensure_ascii=False),
                },
            }
        )
        if trigger_response:
            await self._send({"type": "response.create"})

    async def request_response(self) -> None:
        """Принудительно попросить модель сгенерировать следующий ответ.

        Используется при старте диалога: после session.update сервер сам
        ничего не говорит — нужно явно сказать «начинай».
        """
        await self._send({"type": "response.create"})

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        """Итератор server-events от Realtime."""
        ws = self._ws
        if ws is None:
            raise RuntimeError("RealtimeBridge not connected")
        async for raw in ws:
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("RealtimeBridge: non-JSON frame ignored")
                continue
            if not isinstance(event, dict):
                continue
            yield event


def parse_tool_call_arguments(arguments_raw: str) -> dict[str, Any]:
    """Безопасно распарсить аргументы function-call'а.

    Realtime может слать как валидный JSON-объект, так и (редко) обрезок —
    в этом случае возвращаем пустой dict, чтобы вызывающий мог отдать
    осмысленную ошибку через `submit_tool_output`, а не упасть.
    """
    try:
        result = json.loads(arguments_raw)
    except json.JSONDecodeError:
        logger.warning("parse_tool_call_arguments: malformed JSON: %r", arguments_raw[:200])
        return {}
    if not isinstance(result, dict):
        return {}
    return result


def encode_pcm16_chunk(pcm_bytes: bytes) -> str:
    """Помощник для тестов и форвардинга: PCM16-байты → base64 ASCII."""
    return base64.b64encode(pcm_bytes).decode("ascii")
