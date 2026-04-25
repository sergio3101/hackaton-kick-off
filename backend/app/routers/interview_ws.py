"""WebSocket-протокол голосового интервью.

Клиент — сервер:
  {"type": "hello"}                     — поздороваться, получить первый voice-вопрос.
  {"type": "answer", "audio_b64": ...}  — отправить webm-аудио ответа (base64).
  {"type": "skip"}                      — пометить текущий вопрос пропущенным.
  {"type": "next"}                      — продолжить к следующему после follow-up.
  {"type": "finish"}                    — завершить досрочно.

Сервер — клиент:
  {"type": "question", "item_id": int, "idx": int, "topic": str, "text": str,
                       "audio_b64": str, "is_follow_up": bool}
  {"type": "transcript", "item_id": int, "text": str}
  {"type": "evaluation", "item_id": int, "verdict": str, "rationale": str}
  {"type": "done"}                      — все voice-вопросы пройдены.
  {"type": "error", "code": str, "message": str, "recoverable": bool}
       Известные code: audio_too_short, invalid_audio, stt_failed, eval_failed.
       recoverable=True означает, что текущий вопрос не сменился — клиент может
       перезаписать ответ, не теряя прогресса.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone

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


def _tts_b64(text: str) -> str:
    audio = synthesize_speech(text)
    return base64.b64encode(audio).decode("ascii")


async def _send_question(ws: WebSocket, item: SessionQuestion, *, follow_up_text: str | None = None) -> None:
    text = follow_up_text or item.prompt_text
    await ws.send_json({
        "type": "question",
        "item_id": item.id,
        "idx": item.idx,
        "topic": item.topic,
        "text": text,
        "audio_b64": _tts_b64(text),
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

        while True:
            try:
                msg = await websocket.receive_json()
            except WebSocketDisconnect:
                break

            mtype = msg.get("type")

            if mtype == "hello":
                item = _next_unanswered(sess)
                if item is None:
                    await websocket.send_json({"type": "done"})
                    continue
                await _send_question(websocket, item)

            elif mtype == "skip":
                item = _next_unanswered(sess)
                if item is None:
                    await websocket.send_json({"type": "done"})
                    continue
                item.verdict = Verdict.skipped
                item.rationale = "Пропущено кандидатом"
                db.commit()
                db.refresh(sess)
                pending_follow_up = None
                nxt = _next_unanswered(sess)
                if nxt is None:
                    await websocket.send_json({"type": "done"})
                else:
                    await _send_question(websocket, nxt)

            elif mtype == "next":
                pending_follow_up = None
                nxt = _next_unanswered(sess)
                if nxt is None:
                    await websocket.send_json({"type": "done"})
                else:
                    await _send_question(websocket, nxt)

            elif mtype == "answer":
                item = _next_unanswered(sess)
                if item is None:
                    await websocket.send_json({"type": "done"})
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
                    transcript = transcribe_audio(audio, filename="answer.webm")
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

                await websocket.send_json({"type": "transcript", "item_id": item.id, "text": transcript})

                question_for_eval = pending_follow_up or item.prompt_text
                criteria = item.criteria if not pending_follow_up else (
                    item.criteria + "\n(уточняющий follow-up: оцени ответ относительно дополнения к исходному вопросу)"
                )
                try:
                    evaluation = evaluate_voice_answer(
                        summary=sess.requirements.summary,
                        question=question_for_eval,
                        criteria=criteria,
                        answer_text=transcript,
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

                if pending_follow_up:
                    item.answer_text = (item.answer_text + "\n\n[follow-up] " + transcript).strip()
                    item.rationale = (item.rationale + "\n\n[follow-up] " + evaluation.rationale).strip()
                    if evaluation.verdict == Verdict.correct.value and item.verdict == Verdict.partial:
                        item.verdict = Verdict.correct
                    elif evaluation.verdict == Verdict.incorrect.value and item.verdict != Verdict.correct:
                        item.verdict = Verdict.incorrect
                    pending_follow_up = None
                else:
                    item.answer_text = transcript
                    item.rationale = evaluation.rationale
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
                })

                if (
                    pending_follow_up is None
                    and evaluation.follow_up_question
                    and item.verdict == Verdict.partial
                ):
                    pending_follow_up = evaluation.follow_up_question
                    await _send_question(websocket, item, follow_up_text=evaluation.follow_up_question)
                else:
                    nxt = _next_unanswered(sess)
                    if nxt is None:
                        await websocket.send_json({"type": "done"})
                    else:
                        await _send_question(websocket, nxt)

            elif mtype == "finish":
                await websocket.send_json({"type": "done"})
                break

            else:
                await websocket.send_json({"type": "error", "message": f"Unknown type: {mtype}"})
    finally:
        db.close()
        try:
            await websocket.close()
        except Exception:
            pass
