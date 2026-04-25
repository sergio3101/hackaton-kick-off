"""WebSocket-протокол голосового интервью.

Клиент — сервер:
  {"type": "hello"}                     — поздороваться, получить первый voice-вопрос.
  {"type": "answer", "audio_b64": ...}  — отправить webm-аудио ответа (base64).
  {"type": "answer_text", "text": ...}  — отправить ответ текстом/кодом (без STT).
                                          Полезно для вопросов, требующих кодового
                                          ответа: кандидат пишет в редакторе и шлёт.
  {"type": "skip"}                      — пометить текущий вопрос пропущенным.
  {"type": "next"}                      — продолжить к следующему после follow-up.
  {"type": "replay"}                    — повторно проиграть текущий вопрос (TTS),
                                          без перетранскрипции и оценки.
  {"type": "finish"}                    — завершить досрочно.

Сервер — клиент:
  {"type": "question", "item_id": int, "idx": int, "topic": str, "text": str,
                       "audio_b64": str, "is_follow_up": bool}
  {"type": "transcript", "item_id": int, "text": str}
  {"type": "evaluation", "item_id": int, "verdict": str, "rationale": str,
                         "expected_answer": str, "explanation": str}
  {"type": "time_warning", "remaining_sec": int}  — за <=120 сек до истечения, шлётся один раз.
  {"type": "done", "reason": "completed"|"time_up"} — все voice-вопросы пройдены или
                         истекло время сессии.
  {"type": "error", "code": str, "message": str, "recoverable": bool}
       Известные code: audio_too_short, invalid_audio, stt_failed, eval_failed.
       recoverable=True означает, что текущий вопрос не сменился — клиент может
       перезаписать ответ, не теряя прогресса.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.auth import decode_token
from app.db import SessionLocal
from app.llm.evaluate import evaluate_voice_answer
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
    session_id: int | None = None,
    db: Session | None = None,
    skip_audio: bool = False,
) -> None:
    text = follow_up_text or item.prompt_text
    audio_b64 = ""
    if not skip_audio:
        audio = synthesize_speech(text, session_id=session_id, db=db)
        audio_b64 = base64.b64encode(audio).decode("ascii")
    await ws.send_json({
        "type": "question",
        "item_id": item.id,
        "idx": item.idx,
        "topic": item.topic,
        "text": text,
        "audio_b64": audio_b64,
        "is_follow_up": follow_up_text is not None,
    })


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: int) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        user_id = decode_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

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

        pending_follow_up: str | None = None
        time_warning_sent = False

        text_only = sess.mode == "text"

        async def _send_q(
            item: SessionQuestion,
            *,
            follow_up_text: str | None = None,
        ) -> None:
            await _send_question(
                websocket, item,
                follow_up_text=follow_up_text,
                session_id=sess.id,
                db=db,
                skip_audio=text_only,
            )

        async def _send_done(reason: str) -> None:
            await websocket.send_json({"type": "done", "reason": reason})

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
        ) -> str | None:
            """Общий пайплайн обработки ответа (голосового или текстового).

            Делает evaluate → save → отправить evaluation → решить про follow-up или
            следующий вопрос. Возвращает новое значение `pending_follow_up`.
            """
            current_pending = pending_follow_up
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
                await _send_q(item, follow_up_text=evaluation.follow_up_question)
            else:
                nxt = _next_unanswered(sess)
                if nxt is None:
                    await _send_done("completed")
                else:
                    await _send_q(nxt)
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
                item = _next_unanswered(sess)
                if item is None:
                    await _send_done("completed")
                    continue
                item.verdict = Verdict.skipped
                item.rationale = "Пропущено кандидатом"
                db.commit()
                db.refresh(sess)
                pending_follow_up = None
                nxt = _next_unanswered(sess)
                if nxt is None:
                    await _send_done("completed")
                else:
                    await _send_q(nxt)

            elif mtype == "next":
                pending_follow_up = None
                nxt = _next_unanswered(sess)
                if nxt is None:
                    await _send_done("completed")
                else:
                    await _send_q(nxt)

            elif mtype == "replay":
                # F2: повтор текущего вопроса (или follow-up, если он активен).
                item = _next_unanswered(sess)
                if item is None:
                    await _send_done("completed")
                    continue
                replay_text = pending_follow_up or item.prompt_text
                await _send_q(item, follow_up_text=pending_follow_up)
                logger.info(
                    "replay: session_id=%d, item_id=%d, follow_up=%s",
                    sess.id, item.id, pending_follow_up is not None,
                )
                # replay_text используется только для логов в _send_question, поэтому здесь noop.
                _ = replay_text

            elif mtype == "answer":
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
                except Exception as exc:
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
                    pending_follow_up = await _evaluate_and_advance(
                        item, answer_text_in=transcript, voice_signals=voice_signals,
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

            elif mtype == "answer_text":
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
                    pending_follow_up = await _evaluate_and_advance(
                        item, answer_text_in=text_answer, voice_signals=None,
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

            elif mtype == "finish":
                await _send_done("completed")
                break

            else:
                await websocket.send_json({"type": "error", "message": f"Unknown type: {mtype}"})
    finally:
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass
