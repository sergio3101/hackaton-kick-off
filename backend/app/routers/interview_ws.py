"""WebSocket-протокол голосового интервью.

Маршрут `/ws/interview/{session_id}` поддерживает ДВА режима:

* **Realtime** (по умолчанию, `VOICE_REALTIME_ENABLED=True`) — голосовая
  часть отдана gpt-4o-realtime: server-VAD ловит конец реплики, потоковый
  TTS, частичные транскрипты, barge-in. Сообщения см. в `_run_realtime` и
  фронтовом `useVoiceSession.ts`.
* **Legacy** (для отката + текстовых сессий) — последовательный пайплайн
  TTS-batch / Whisper-batch / evaluate. Полностью сохранён ниже как
  `_run_legacy`.

Текстовые сессии (`session.mode == "text"`) всегда идут через legacy:
Realtime — про голос, для текста он избыточен.

Legacy-протокол (клиент — сервер):
  {"type": "hello"}                     — поздороваться, получить первый voice-вопрос.
  {"type": "answer", "audio_b64": ...}  — отправить webm-аудио ответа (base64).
  {"type": "answer_text", "text": ...}  — отправить ответ текстом/кодом (без STT).
  {"type": "skip" | "next" | "replay" | "finish"}.

Realtime-протокол (клиент — сервер):
  {"type": "hello"}                     — стартовая точка, инициирует первый вопрос.
  {"type": "audio", "audio_b64": ...}   — PCM16 24 kHz чанк (~50 мс).
  {"type": "interrupt"}                 — клиент детектил голос поверх TTS,
                                           прервать генерацию (barge-in).
  {"type": "finish"}                    — завершить досрочно.

Realtime-протокол (сервер — клиент):
  {"type": "question", "item_id": int, "idx": int, "topic": str, "text": str,
                       "is_follow_up": bool}
        — модель ВОТ-ВОТ начнёт зачитывать вопрос; клиент использует для
          подсветки темы/счётчика. Аудио вопроса прилетает чанками отдельно.
  {"type": "tts_chunk", "audio_b64": str}     — PCM16 24 kHz, проиграть.
  {"type": "tts_done"}                         — текущий ответ модели завершён.
  {"type": "vad", "state": "speech"|"idle"}   — server-VAD сигнал.
  {"type": "partial_transcript", "text": str} — частичный транскрипт пользователя.
  {"type": "transcript", "item_id": int, "text": str}  — финальный транскрипт.
  {"type": "evaluation", "item_id": int, "verdict": str, ...} — оценка от gpt-4o-mini.
  {"type": "time_warning", "remaining_sec": int}
  {"type": "done", "reason": "completed"|"time_up"}
  {"type": "error", "code": str, "message": str, "recoverable": bool}
"""

from __future__ import annotations

import asyncio
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from openai import OpenAIError

from app.auth import decode_token, decode_ws_ticket
from app.config import get_settings
from app.db import SessionLocal
from app.llm.client import format_openai_error
from app.llm.cost_tracker import record_realtime_usage
from app.llm.evaluate import evaluate_voice_answer
from app.llm.realtime import (
    RealtimeBridge,
    build_session_config,
    parse_tool_call_arguments,
)
from app.llm.voice import AudioTooShortError, synthesize_speech, transcribe_audio
from app.models import (
    InterviewSession,
    QuestionType,
    SessionQuestion,
    SessionStatus,
    Verdict,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _voice_items(sess: InterviewSession) -> list[SessionQuestion]:
    return [i for i in sess.items if i.type == QuestionType.voice]


def _next_unanswered(sess: InterviewSession) -> SessionQuestion | None:
    for item in _voice_items(sess):
        if item.verdict is None:
            return item
    return None


def _remaining_seconds(sess: InterviewSession) -> int | None:
    """Сколько секунд осталось до конца сессии.

    None — если started_at не установлен. Может быть отрицательным после истечения.
    """
    if sess.started_at is None:
        return None
    deadline = sess.started_at + timedelta(minutes=sess.target_duration_min)
    return int((deadline - datetime.now(timezone.utc)).total_seconds())


def _is_time_up(sess: InterviewSession) -> bool:
    rem = _remaining_seconds(sess)
    return rem is not None and rem <= 0


async def _send_question(
    ws: WebSocket,
    item: SessionQuestion,
    *,
    follow_up_text: str | None = None,
    intro_text: str | None = None,
    session_id: int | None = None,
    db: Session | None = None,
    skip_audio: bool = False,
    voice: str | None = None,
) -> None:
    text = follow_up_text or item.prompt_text
    audio_b64 = ""
    intro_audio_b64: str | None = None
    if not skip_audio:
        audio = synthesize_speech(text, session_id=session_id, db=db, voice=voice)
        audio_b64 = base64.b64encode(audio).decode("ascii")
        if intro_text:
            intro_audio = synthesize_speech(intro_text, session_id=session_id, db=db, voice=voice)
            intro_audio_b64 = base64.b64encode(intro_audio).decode("ascii")
    await ws.send_json({
        "type": "question",
        "item_id": item.id,
        "idx": item.idx,
        "topic": item.topic,
        "text": text,
        "audio_b64": audio_b64,
        "is_follow_up": follow_up_text is not None,
        "intro_text": intro_text,
        "intro_audio_b64": intro_audio_b64,
    })


async def _authenticate_ws(websocket: WebSocket, session_id: int) -> int | None:
    """Авторизация WS-подключения. Возвращает user_id или None, если отказ
    (websocket уже закрыт с policy_violation)."""
    ticket = websocket.query_params.get("ticket")
    token = websocket.query_params.get("token")
    if ticket:
        try:
            ticket_user_id, ticket_session_id = decode_ws_ticket(ticket)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        if ticket_session_id != session_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        return ticket_user_id
    if token:
        try:
            return decode_token(token)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    return None


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: int) -> None:
    user_id = await _authenticate_ws(websocket, session_id)
    if user_id is None:
        return

    settings = get_settings()
    db: Session = SessionLocal()
    try:
        sess = db.get(InterviewSession, session_id)
        if sess is None or sess.user_id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.accept()

        if sess.status == SessionStatus.draft:
            sess.status = SessionStatus.active
            sess.started_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(sess)

        # Realtime — только для голосовых сессий и при включённом флаге.
        # Текст всегда едет легаси-веткой (Realtime для текста бесполезен).
        if settings.voice_realtime_enabled and sess.mode != "text":
            try:
                await _run_realtime(websocket, sess, db)
            except WebSocketDisconnect:
                pass
            except OpenAIError as exc:
                # 403 (регион/ключ), 401, 429 и пр. — отдаём понятный текст,
                # чтобы пользователь понял что чинить (VPN/прокси/ключ/квоту).
                detail = format_openai_error(exc)
                logger.warning(
                    "realtime: openai error, session_id=%d — %s", sess.id, detail
                )
                try:
                    await websocket.send_json({
                        "type": "error",
                        "code": "openai_unavailable",
                        "message": detail,
                        "recoverable": False,
                    })
                except Exception:
                    pass
            except Exception:
                logger.exception("realtime: unexpected error, session_id=%d", sess.id)
                try:
                    await websocket.send_json({
                        "type": "error",
                        "code": "realtime_failed",
                        "message": "Голосовой канал недоступен — обновите страницу.",
                        "recoverable": False,
                    })
                except Exception:
                    pass
            return

        try:
            await _run_legacy(websocket, sess, db)
        except WebSocketDisconnect:
            # Клиент закрыл WS первым — это норма (например, нажал «Завершить»
            # и фронт ушёл на отчёт раньше, чем сервер успел отправить done).
            pass
    finally:
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass


async def _run_legacy(websocket: WebSocket, sess: InterviewSession, db: Session) -> None:
    """Прежний пайплайн: TTS-batch / Whisper-batch / синхронная evaluate.

    Сохранён без изменений для текстовых сессий и как fallback при
    `VOICE_REALTIME_ENABLED=False`.
    """
    # Состояние follow-up разнесено на две фазы:
    # * pending_follow_up — текст уже сгенерирован LLM, но клиенту не отправлен;
    #   уйдёт как question после клика «к следующему».
    # * active_follow_up  — follow-up уже отправлен клиенту, ждём ответ
    #   (нужен, чтобы _evaluate_and_advance понял: следующий answer относится
    #   к follow-up, а не к основному вопросу).
    pending_follow_up: str | None = None
    active_follow_up: str | None = None
    # ID последнего вопроса, отправленного клиенту. Для follow-up-веток нельзя
    # полагаться на _next_unanswered: основной item уже имеет verdict, и поиск
    # вернул бы СЛЕДУЮЩИЙ вопрос, а не текущий.
    current_item_id: int | None = None
    # Темы, по которым уже прозвучало голосовое intro ("Давайте поговорим о ...")
    # в рамках этого WS-подключения. На reconnect множество сбрасывается —
    # это допустимо, повтор intro не критичен для UX.
    intro_played: set[str] = set()
    time_warning_sent = False

    text_only = sess.mode == "text"
    # Per-session настройки, если admin их выставил при назначении.
    # NULL → fallback на дефолты в synthesize_speech / evaluate_voice_answer.
    sess_voice = sess.voice
    sess_llm_model = sess.llm_model

    async def _send_q(
        item: SessionQuestion,
        *,
        follow_up_text: str | None = None,
    ) -> None:
        nonlocal current_item_id
        current_item_id = item.id
        # Intro проигрывается ровно один раз для каждой темы — перед первым
        # её вопросом. Follow-up — не отдельный вопрос темы, intro не шлём.
        intro_text: str | None = None
        if (
            follow_up_text is None
            and item.topic
            and item.topic not in intro_played
        ):
            intro_text = f"Давайте поговорим о {item.topic}"
            intro_played.add(item.topic)
        await _send_question(
            websocket, item,
            follow_up_text=follow_up_text,
            intro_text=intro_text,
            session_id=sess.id,
            db=db,
            skip_audio=text_only,
            voice=sess_voice,
        )

    async def _send_done(reason: str) -> None:
        # Гонка: фронт может закрыть WS сразу после finish — тогда send_json
        # бросит WebSocketDisconnect. Это норма, не падаем.
        try:
            await websocket.send_json({"type": "done", "reason": reason})
        except WebSocketDisconnect:
            logger.debug("legacy: client closed before done could be sent")
        except RuntimeError:
            # starlette может бросить RuntimeError если websocket уже в closed state
            logger.debug("legacy: send_json on closed ws")

    async def _send_awaiting_next(item_id: int) -> None:
        try:
            await websocket.send_json({"type": "awaiting_next", "item_id": item_id})
        except (WebSocketDisconnect, RuntimeError):
            logger.debug("legacy: send awaiting_next on closed ws")

    async def _advance_to_next() -> None:
        """Отправить следующий unanswered-вопрос или done, если их нет.
        Используется и при `next`, и при `skip`."""
        nxt = _next_unanswered(sess)
        if nxt is None:
            await _send_done("completed")
        else:
            await _send_q(nxt)

    async def _maybe_warn_time() -> None:
        nonlocal time_warning_sent
        rem = _remaining_seconds(sess)
        if rem is not None and 0 < rem <= 120 and not time_warning_sent:
            time_warning_sent = True
            await websocket.send_json({"type": "time_warning", "remaining_sec": rem})

    async def _evaluate_and_advance(
        item: SessionQuestion,
        *,
        answer_text_in: str,
        voice_signals: str | None,
        current_pending: str | None,
    ) -> str | None:
        """Общий пайплайн обработки ответа (голосового или текстового).

        Делает evaluate → save → отправить evaluation → отправить awaiting_next.
        Не отправляет следующий вопрос/done автоматом — это делает обработчик
        `next` после явного клика на фронте.

        Возвращает текст pending follow-up (если evaluation предложила
        уточнение к основному вопросу), либо None.
        """
        question_for_eval = current_pending or item.prompt_text
        criteria = item.criteria if not current_pending else (
            item.criteria + "\n(уточняющий follow-up: оцени ответ относительно дополнения к исходному вопросу)"
        )
        evaluation = evaluate_voice_answer(
            summary=sess.requirements.summary,
            question=question_for_eval,
            criteria=criteria,
            answer_text=answer_text_in,
            session_id=sess.id,
            voice_signals=voice_signals,
            db=db,
            model=sess_llm_model,
        )

        if current_pending:
            item.answer_text = (item.answer_text + "\n\n[follow-up] " + answer_text_in).strip()
            item.rationale = (item.rationale + "\n\n[follow-up] " + evaluation.rationale).strip()
            if evaluation.explanation:
                item.explanation = (item.explanation + "\n\n[follow-up] " + evaluation.explanation).strip()
            if evaluation.verdict == Verdict.correct.value and item.verdict == Verdict.partial:
                item.verdict = Verdict.correct
            elif evaluation.verdict == Verdict.incorrect.value and item.verdict != Verdict.correct:
                item.verdict = Verdict.incorrect
        else:
            item.answer_text = answer_text_in
            item.rationale = evaluation.rationale
            item.expected_answer = evaluation.expected_answer
            item.explanation = evaluation.explanation
            try:
                item.verdict = Verdict(evaluation.verdict)
            except ValueError:
                item.verdict = Verdict.incorrect
        db.commit()
        db.refresh(item)

        await websocket.send_json({
            "type": "evaluation",
            "item_id": item.id,
            "verdict": (item.verdict or Verdict.skipped).value,
            "rationale": item.rationale,
            "expected_answer": item.expected_answer,
            "explanation": item.explanation,
        })

        new_pending: str | None = None
        allow_followup = (
            not current_pending
            and bool(evaluation.follow_up_question)
            and item.verdict != Verdict.incorrect
        )
        if allow_followup:
            new_pending = evaluation.follow_up_question

        await _send_awaiting_next(item.id)
        return new_pending

    while True:
        try:
            msg = await websocket.receive_json()
        except WebSocketDisconnect:
            break

        mtype = msg.get("type")

        # Soft-finish при истечении тайм-лимита: даём досжать только finish/skip/next-as-done.
        if _is_time_up(sess) and mtype not in ("finish",):
            # Помечаем оставшиеся voice-вопросы как skipped (time_up),
            # чтобы в отчёте было видно, что они не задавались, а не висели null.
            # Это также стабилизирует state: GET /api/sessions/{id} вернёт согласованную
            # картину независимо от того, нажмёт ли клиент потом «Завершить досрочно».
            for it in _voice_items(sess):
                if it.verdict is None:
                    it.verdict = Verdict.skipped
                    it.rationale = "Не задано — время сессии вышло"
            db.commit()
            await _send_done("time_up")
            break

        await _maybe_warn_time()

        if mtype == "hello":
            item = _next_unanswered(sess)
            if item is None:
                await _send_done("completed")
                continue
            await _send_q(item)

        elif mtype == "skip":
            # Если активен follow-up — skip означает «не отвечу на follow-up,
            # хочу к следующему вопросу». Основной item уже имеет verdict —
            # его не трогаем, иначе затрём результат оценки.
            if active_follow_up is not None:
                active_follow_up = None
                pending_follow_up = None
                await _advance_to_next()
                continue
            # Стандартный путь: пропустить текущий неотвеченный вопрос.
            item = _next_unanswered(sess)
            if item is None:
                await _send_done("completed")
                continue
            item.verdict = Verdict.skipped
            item.rationale = "Пропущено кандидатом"
            db.commit()
            db.refresh(sess)
            pending_follow_up = None
            await _advance_to_next()

        elif mtype == "next":
            # Сначала отдадим pending follow-up (LLM сгенерила, ждали клика).
            if pending_follow_up is not None and current_item_id is not None:
                item = db.get(SessionQuestion, current_item_id)
                if item is not None:
                    active_follow_up = pending_follow_up
                    pending_follow_up = None
                    await _send_q(item, follow_up_text=active_follow_up)
                    continue
            # Иначе — к следующему вопросу или done.
            pending_follow_up = None
            active_follow_up = None
            await _advance_to_next()

        elif mtype == "replay":
            # F2: повтор текущего вопроса (либо follow-up, если он активен).
            # active_follow_up имеет приоритет: если он установлен, основной
            # item уже оценён, и _next_unanswered вернул бы СЛЕДУЮЩИЙ вопрос.
            item: SessionQuestion | None = None
            if active_follow_up is not None and current_item_id is not None:
                item = db.get(SessionQuestion, current_item_id)
            if item is None:
                item = _next_unanswered(sess)
            if item is None:
                await _send_done("completed")
                continue
            await _send_q(item, follow_up_text=active_follow_up)
            logger.info(
                "replay: session_id=%d, item_id=%d, follow_up=%s",
                sess.id, item.id, active_follow_up is not None,
            )

        elif mtype == "answer":
            if active_follow_up is not None and current_item_id is not None:
                item = db.get(SessionQuestion, current_item_id)
            else:
                item = _next_unanswered(sess)
            if item is None:
                await _send_done("completed")
                continue

            audio_b64 = msg.get("audio_b64") or ""
            try:
                audio = base64.b64decode(audio_b64)
            except Exception:
                await websocket.send_json({
                    "type": "error",
                    "code": "invalid_audio",
                    "message": "Невалидное аудио",
                    "recoverable": True,
                })
                continue
            if not audio:
                await websocket.send_json({
                    "type": "error",
                    "code": "audio_too_short",
                    "message": "Запись пустая — нажмите и говорите",
                    "recoverable": True,
                })
                continue

            try:
                stt_result = transcribe_audio(
                    audio, filename="answer.webm", session_id=sess.id, db=db,
                )
            except AudioTooShortError:
                await websocket.send_json({
                    "type": "error",
                    "code": "audio_too_short",
                    "message": "Слишком короткая запись — попробуйте ответить ещё раз",
                    "recoverable": True,
                })
                continue
            except Exception:
                logger.exception("STT failed")
                await websocket.send_json({
                    "type": "error",
                    "code": "stt_failed",
                    "message": "Не удалось распознать речь, попробуйте ещё раз",
                    "recoverable": True,
                })
                continue

            transcript = stt_result.text
            voice_signals = stt_result.metrics.confidence_hint()

            await websocket.send_json({"type": "transcript", "item_id": item.id, "text": transcript})

            try:
                new_pending = await _evaluate_and_advance(
                    item,
                    answer_text_in=transcript,
                    voice_signals=voice_signals,
                    current_pending=active_follow_up,
                )
            except Exception:
                logger.exception("Eval failed")
                await websocket.send_json({
                    "type": "error",
                    "code": "eval_failed",
                    "message": "Не удалось оценить ответ, попробуйте сформулировать иначе",
                    "recoverable": True,
                })
                continue
            pending_follow_up = new_pending
            active_follow_up = None

        elif mtype == "answer_text":
            if active_follow_up is not None and current_item_id is not None:
                item = db.get(SessionQuestion, current_item_id)
            else:
                item = _next_unanswered(sess)
            if item is None:
                await _send_done("completed")
                continue
            text_answer = (msg.get("text") or "").strip()
            if len(text_answer) < 5:
                await websocket.send_json({
                    "type": "error",
                    "code": "answer_too_short",
                    "message": "Ответ слишком короткий — напишите подробнее",
                    "recoverable": True,
                })
                continue

            # Эхо-сообщение transcript, чтобы фронт показал ответ в логе как и для голоса.
            await websocket.send_json({
                "type": "transcript", "item_id": item.id, "text": text_answer,
            })

            try:
                new_pending = await _evaluate_and_advance(
                    item,
                    answer_text_in=text_answer,
                    voice_signals=None,
                    current_pending=active_follow_up,
                )
            except Exception:
                logger.exception("Eval failed (text)")
                await websocket.send_json({
                    "type": "error",
                    "code": "eval_failed",
                    "message": "Не удалось оценить ответ, попробуйте сформулировать иначе",
                    "recoverable": True,
                })
                continue
            pending_follow_up = new_pending
            active_follow_up = None

        elif mtype == "finish":
            await _send_done("completed")
            break

        else:
            await websocket.send_json({"type": "error", "message": f"Unknown type: {mtype}"})


async def _run_realtime(websocket: WebSocket, sess: InterviewSession, db: Session) -> None:
    """Голосовой канал на gpt-4o-realtime.

    Realtime ведёт диалог: server-VAD ловит конец реплики, потоковый TTS,
    частичные транскрипты, barge-in. Бизнес-логика (банк вопросов, evaluation)
    остаётся за нами: модель вызывает tool `submit_answer` после каждого
    ответа кандидата, мы запускаем evaluate_voice_answer (gpt-4o-mini)
    в фоне и пушим evaluation клиенту, не блокируя голосовой поток.
    """
    sess_voice = sess.voice or get_settings().openai_tts_voice

    # Снимок вопросов для system-prompt — модель должна знать заранее весь
    # порядок, иначе ей придётся импровизировать. Берём только не отвеченные:
    # на reconnect не предлагаем ей задать уже закрытые.
    questions_payload = [
        {
            "question_id": q.id,
            "topic": q.topic,
            "prompt_text": q.prompt_text,
            "criteria": q.criteria,
        }
        for q in _voice_items(sess) if q.verdict is None
    ]

    if not questions_payload:
        # Все вопросы уже отвечены (например, после resume) — ничего не делаем.
        await websocket.send_json({"type": "done", "reason": "completed"})
        return

    session_config = build_session_config(
        project_summary=sess.requirements.summary if sess.requirements else "",
        questions=questions_payload,
        voice=sess_voice,
    )

    # pending_follow_up: если evaluation вернёт уточняющий вопрос — мы кладём
    # его в tool_output, и Realtime сам зачитает. На второй submit_answer
    # с тем же question_id мы понимаем, что это ответ на follow-up.
    active_follow_up_by_qid: dict[int, str] = {}
    time_warning_sent = False
    finished = False
    # Какой вопрос модель сейчас задаёт. Обновляем по `question.started`
    # (наш собственный сигнал, реконструированный из текста response).
    announced_qid: int | None = None
    # Уже отправленные клиенту question-кадры — чтобы не дублировать.
    sent_question_ids: set[int] = set()
    # Активна ли сейчас response Realtime (между response.created и response.done).
    # Нужно для barge-in: response.cancel при пустом state даёт ошибку
    # `response_cancel_not_active`, которую слать не имеет смысла.
    response_active = False

    async def _send_done(reason: str) -> None:
        nonlocal finished
        if finished:
            return
        finished = True
        try:
            await websocket.send_json({"type": "done", "reason": reason})
        except Exception:
            logger.debug("realtime: send done failed", exc_info=True)

    async def _send_question_meta(item: SessionQuestion, *, is_follow_up: bool) -> None:
        if item.id in sent_question_ids and not is_follow_up:
            return
        sent_question_ids.add(item.id)
        await websocket.send_json({
            "type": "question",
            "item_id": item.id,
            "idx": item.idx,
            "topic": item.topic,
            "text": item.prompt_text,
            "is_follow_up": is_follow_up,
        })

    async def _maybe_warn_time() -> None:
        nonlocal time_warning_sent
        rem = _remaining_seconds(sess)
        if rem is not None and 0 < rem <= 120 and not time_warning_sent:
            time_warning_sent = True
            try:
                await websocket.send_json({"type": "time_warning", "remaining_sec": rem})
            except Exception:
                pass

    async def _force_time_up() -> None:
        # Аналог soft-finish из легаси: помечаем оставшиеся вопросы как skipped.
        for it in _voice_items(sess):
            if it.verdict is None:
                it.verdict = Verdict.skipped
                it.rationale = "Не задано — время сессии вышло"
        db.commit()
        await _send_done("time_up")

    def _run_evaluation_sync(
        item_id: int, transcript: str, current_pending: str | None
    ) -> dict[str, Any]:
        """Блокирующий вызов evaluate + запись в БД.

        Запускаем через `asyncio.to_thread` — openai SDK у нас синхронный.
        Возвращаем компактный payload: и для tool_output Realtime, и для
        WS-сообщения evaluation клиенту.
        """
        item = db.get(SessionQuestion, item_id)
        if item is None:
            return {"error": "question_not_found"}

        question_for_eval = current_pending or item.prompt_text
        criteria = item.criteria if not current_pending else (
            item.criteria
            + "\n(уточняющий follow-up: оцени ответ относительно дополнения к исходному вопросу)"
        )
        evaluation = evaluate_voice_answer(
            summary=sess.requirements.summary if sess.requirements else "",
            question=question_for_eval,
            criteria=criteria,
            answer_text=transcript,
            session_id=sess.id,
            voice_signals=None,
            db=db,
            model=sess.llm_model,
        )

        if current_pending:
            item.answer_text = (item.answer_text + "\n\n[follow-up] " + transcript).strip()
            item.rationale = (item.rationale + "\n\n[follow-up] " + evaluation.rationale).strip()
            if evaluation.explanation:
                item.explanation = (
                    item.explanation + "\n\n[follow-up] " + evaluation.explanation
                ).strip()
            if evaluation.verdict == Verdict.correct.value and item.verdict == Verdict.partial:
                item.verdict = Verdict.correct
            elif evaluation.verdict == Verdict.incorrect.value and item.verdict != Verdict.correct:
                item.verdict = Verdict.incorrect
        else:
            item.answer_text = transcript
            item.rationale = evaluation.rationale
            item.expected_answer = evaluation.expected_answer
            item.explanation = evaluation.explanation
            try:
                item.verdict = Verdict(evaluation.verdict)
            except ValueError:
                item.verdict = Verdict.incorrect
        db.commit()
        db.refresh(item)

        # follow-up разрешаем только на основной ответ и не на incorrect —
        # та же эвристика, что в легаси.
        allow_followup = (
            not current_pending
            and bool(evaluation.follow_up_question)
            and item.verdict != Verdict.incorrect
        )
        new_follow_up = evaluation.follow_up_question if allow_followup else None
        next_item = next(
            (q for q in _voice_items(sess) if q.verdict is None),
            None,
        )

        return {
            "item_id": item.id,
            "verdict": (item.verdict or Verdict.skipped).value,
            "rationale": item.rationale,
            "expected_answer": item.expected_answer,
            "explanation": item.explanation,
            "follow_up_question": new_follow_up,
            "next_question_id": next_item.id if next_item else None,
        }

    async with RealtimeBridge(session_config=session_config) as bridge:
        # Сразу зачитываем первый вопрос — Realtime после session.update сам
        # ничего не скажет, нужен явный response.create.
        first_item = _next_unanswered(sess)
        if first_item is not None:
            await _send_question_meta(first_item, is_follow_up=False)
            announced_qid = first_item.id
        await bridge.request_response()

        client_to_bridge_done = asyncio.Event()
        bridge_to_client_done = asyncio.Event()

        async def client_to_bridge() -> None:
            """Читаем сообщения от фронта и проксируем в Realtime."""
            try:
                while not finished:
                    try:
                        msg = await websocket.receive_json()
                    except WebSocketDisconnect:
                        return

                    mtype = msg.get("type")

                    if _is_time_up(sess):
                        await _force_time_up()
                        return

                    await _maybe_warn_time()

                    if mtype == "audio":
                        audio_b64 = msg.get("audio_b64") or ""
                        await bridge.append_audio(audio_b64)
                    elif mtype == "interrupt":
                        # Шлём cancel только если знаем, что response сейчас
                        # активна. Иначе Realtime ответит warning'ом
                        # `response_cancel_not_active`.
                        if response_active:
                            try:
                                await bridge.cancel_response()
                            except Exception:
                                logger.debug("realtime: cancel failed", exc_info=True)
                    elif mtype == "hello":
                        # Идемпотентно — соединение уже открыто, первый вопрос
                        # уже отправлен. Игнорируем.
                        continue
                    elif mtype == "finish":
                        # Останавливаем поток TTS на стороне Realtime — иначе
                        # модель продолжит слать audio.delta, и фронт (если
                        # успеет принять до закрытия WS) всё ещё будет играть.
                        if response_active:
                            try:
                                await bridge.cancel_response()
                            except Exception:
                                logger.debug("realtime: cancel on finish failed", exc_info=True)
                        try:
                            await bridge.close()
                        except Exception:
                            logger.debug("realtime: bridge close failed", exc_info=True)
                        await _send_done("completed")
                        return
                    else:
                        # Неизвестные типы молча игнорируем — фронт может
                        # эволюционировать быстрее бэкенда.
                        logger.debug("realtime: unknown client msg type=%r", mtype)
            finally:
                client_to_bridge_done.set()

        async def bridge_to_client() -> None:
            """Читаем server-events Realtime и форвардим клиенту."""
            nonlocal announced_qid, response_active
            # Аккумулятор аргументов tool-call'а: arguments прилетают чанками
            # `response.function_call_arguments.delta`, а финал — в `done`.
            tool_args_buf: dict[str, list[str]] = {}
            tool_call_meta: dict[str, dict[str, str]] = {}
            # Эти коды Realtime считаем шумовыми — клиенту их не показываем,
            # в логе оставляем debug, чтобы не засорять warning'ами.
            silent_error_codes = {"response_cancel_not_active"}

            try:
                async for event in bridge.events():
                    etype = event.get("type", "")

                    if etype == "error":
                        err = event.get("error", {}) or {}
                        code = err.get("code") or ""
                        if code in silent_error_codes:
                            logger.debug("realtime non-fatal: %s", err)
                            continue
                        logger.warning("realtime error: %s", err)
                        try:
                            await websocket.send_json({
                                "type": "error",
                                "code": "realtime_error",
                                "message": err.get("message") or "Голосовой канал ответил ошибкой",
                                "recoverable": True,
                            })
                        except Exception:
                            pass
                        continue

                    if etype == "response.created":
                        response_active = True
                        continue

                    if etype == "response.audio.delta":
                        delta = event.get("delta")
                        if delta:
                            await websocket.send_json({"type": "tts_chunk", "audio_b64": delta})
                        continue

                    if etype == "response.audio.done":
                        await websocket.send_json({"type": "tts_done"})
                        continue

                    if etype == "input_audio_buffer.speech_started":
                        await websocket.send_json({"type": "vad", "state": "speech"})
                        continue

                    if etype == "input_audio_buffer.speech_stopped":
                        await websocket.send_json({"type": "vad", "state": "idle"})
                        continue

                    if etype == "conversation.item.input_audio_transcription.delta":
                        text = event.get("delta") or ""
                        if text:
                            await websocket.send_json({
                                "type": "partial_transcript", "text": text,
                            })
                        continue

                    if etype == "conversation.item.input_audio_transcription.completed":
                        # Это обычная реплика кандидата (включая уточняющие
                        # вопросы и реплики-маркеры). В лог НЕ кладём — туда
                        # попадают только засчитанные ответы (по submit_answer).
                        # Шлём `speech_completed` чтобы фронт убрал live-транскрипт.
                        await websocket.send_json({"type": "speech_completed"})
                        continue

                    if etype == "response.function_call_arguments.delta":
                        call_id = event.get("call_id") or event.get("item_id") or ""
                        delta = event.get("delta") or ""
                        if call_id and delta:
                            tool_args_buf.setdefault(call_id, []).append(delta)
                        continue

                    if etype == "response.output_item.added":
                        item_obj = event.get("item") or {}
                        if item_obj.get("type") == "function_call":
                            call_id = item_obj.get("call_id") or item_obj.get("id") or ""
                            tool_call_meta[call_id] = {
                                "name": item_obj.get("name") or "",
                                "item_id": item_obj.get("id") or "",
                            }
                        continue

                    if etype == "response.function_call_arguments.done":
                        call_id = event.get("call_id") or event.get("item_id") or ""
                        meta = tool_call_meta.get(call_id, {})
                        name = meta.get("name") or event.get("name") or ""
                        arguments_raw = (
                            event.get("arguments")
                            or "".join(tool_args_buf.pop(call_id, []))
                        )
                        if name != "submit_answer":
                            # Неизвестный tool — отвечаем заглушкой, чтобы Realtime не завис.
                            await bridge.submit_tool_output(
                                call_id=call_id,
                                output={"error": f"unknown_tool:{name}"},
                            )
                            continue
                        args = parse_tool_call_arguments(arguments_raw)
                        question_id = int(args.get("question_id") or 0) or None
                        transcript = (args.get("transcript") or "").strip()

                        if question_id is None:
                            await bridge.submit_tool_output(
                                call_id=call_id,
                                output={"error": "missing_question_id"},
                            )
                            continue

                        # Определяем — это первый ответ или follow-up.
                        current_pending = active_follow_up_by_qid.pop(question_id, None)

                        # Сразу пушим засчитанную реплику в лог — до того как
                        # evaluation отработала, чтобы кандидат видел свой
                        # ответ моментально, а вердикт прикрепится через 1–2 сек.
                        try:
                            await websocket.send_json({
                                "type": "transcript",
                                "item_id": question_id,
                                "text": transcript,
                                "is_follow_up": bool(current_pending),
                            })
                        except Exception:
                            logger.debug("realtime: send transcript failed", exc_info=True)

                        try:
                            payload = await asyncio.to_thread(
                                _run_evaluation_sync,
                                question_id,
                                transcript,
                                current_pending,
                            )
                        except Exception:
                            logger.exception(
                                "realtime: evaluation failed for question_id=%s",
                                question_id,
                            )
                            await bridge.submit_tool_output(
                                call_id=call_id,
                                output={"accepted": False, "error": "eval_failed"},
                            )
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "code": "eval_failed",
                                    "message": "Не удалось оценить ответ — продолжаем дальше",
                                    "recoverable": True,
                                })
                            except Exception:
                                pass
                            continue

                        if payload.get("error"):
                            await bridge.submit_tool_output(
                                call_id=call_id, output=payload,
                            )
                            continue

                        # 1) сообщаем клиенту evaluation
                        try:
                            await websocket.send_json({
                                "type": "evaluation",
                                "item_id": payload["item_id"],
                                "verdict": payload["verdict"],
                                "rationale": payload["rationale"],
                                "expected_answer": payload["expected_answer"],
                                "explanation": payload["explanation"],
                            })
                        except Exception:
                            logger.debug("realtime: send evaluation failed", exc_info=True)

                        follow_up = payload.get("follow_up_question")
                        if follow_up:
                            active_follow_up_by_qid[question_id] = follow_up
                        next_qid = payload.get("next_question_id")
                        # 2) отдаём output модели — она начнёт следующий вопрос
                        # сразу же по `response.create` (см. submit_tool_output).
                        await bridge.submit_tool_output(
                            call_id=call_id,
                            output={
                                "accepted": True,
                                "follow_up_question": follow_up,
                                "next_question_id": next_qid,
                            },
                        )

                        # 3) если есть следующий вопрос — заранее шлём клиенту
                        # question-meta (топик, idx) для UI.
                        if follow_up:
                            cur = db.get(SessionQuestion, question_id)
                            if cur is not None:
                                await _send_question_meta(cur, is_follow_up=True)
                                # announced_qid не меняем — модель продолжит говорить
                                # про тот же question_id.
                        elif next_qid:
                            nxt = db.get(SessionQuestion, next_qid)
                            if nxt is not None:
                                await _send_question_meta(nxt, is_follow_up=False)
                                # Следующий transcript будет про него.
                                announced_qid = nxt.id
                        else:
                            # Вопросов больше нет — пусть модель попрощается, после
                            # `response.done` мы пошлём done клиенту.
                            pass
                        continue

                    if etype == "response.done":
                        response_active = False
                        # Списываем стоимость этого response: токены приходят
                        # в response.usage с разбивкой по каналам (text/audio,
                        # in/out, cached). См. cost_tracker.record_realtime_usage.
                        try:
                            usage = (event.get("response") or {}).get("usage") or {}
                            if usage:
                                in_det = usage.get("input_token_details") or {}
                                out_det = usage.get("output_token_details") or {}
                                cached_det = in_det.get("cached_tokens_details") or {}
                                await asyncio.to_thread(
                                    record_realtime_usage,
                                    model=get_settings().openai_realtime_model,
                                    text_in=int(in_det.get("text_tokens") or 0),
                                    audio_in=int(in_det.get("audio_tokens") or 0),
                                    text_out=int(out_det.get("text_tokens") or 0),
                                    audio_out=int(out_det.get("audio_tokens") or 0),
                                    cached_text_in=int(cached_det.get("text_tokens") or 0),
                                    cached_audio_in=int(cached_det.get("audio_tokens") or 0),
                                    session_id=sess.id,
                                    db=None,  # отдельная транзакция, чтобы не блокировать основную
                                )
                        except Exception:
                            logger.debug("realtime: usage record failed", exc_info=True)
                        # Если все вопросы закрыты и активного follow-up нет —
                        # завершаем сессию.
                        if not _next_unanswered(sess) and not active_follow_up_by_qid:
                            await _send_done("completed")
                            return
                        continue

                    # Прочие server-events игнорируем (session.created/updated,
                    # conversation.item.* и т.п.) — они не меняют UI.
            finally:
                bridge_to_client_done.set()

        await asyncio.gather(client_to_bridge(), bridge_to_client())
