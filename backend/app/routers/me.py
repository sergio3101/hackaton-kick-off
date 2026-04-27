"""User-эндпойнты: мои назначения, старт сессии из назначения, опубликованные отчёты."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.lang_detect import detect_coding_language
from app.llm.generate import generate_coding_tasks
from app.models import (
    Assignment,
    AssignmentStatus,
    InterviewSession,
    QuestionBank,
    QuestionType,
    Requirements,
    SessionQuestion,
    SessionStatus,
    User,
)
from app.schemas import (
    AssignmentDetailOut,
    AssignmentSessionInfo,
    SessionDetailOut,
    SessionItemOut,
    SessionOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/me", tags=["me"])

VOICE_QUESTIONS_PER_SESSION = 10
CODING_TASKS_PER_SESSION = 3


@router.get("/assignments", response_model=list[AssignmentDetailOut])
def my_assignments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssignmentDetailOut]:
    rows = (
        db.query(Assignment)
        .filter(Assignment.user_id == user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return [_assignment_detail(a) for a in rows]


@router.post("/assignments/{assignment_id}/start", response_model=SessionDetailOut)
def start_assignment(
    assignment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    a = db.get(Assignment, assignment_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Тренажёр: кандидат может перепройти кикофф сколько угодно раз. Если есть
    # незавершённая попытка — возвращаем её (продолжить). Если все прежние
    # попытки finished — создаём НОВУЮ сессию, старые остаются в истории.
    last = max(a.sessions, key=lambda s: s.created_at, default=None)
    if last is not None and last.status in (SessionStatus.draft, SessionStatus.active):
        return _to_detail(last)

    req = db.get(Requirements, a.requirements_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Requirements not found")

    bank = (
        db.query(QuestionBank)
        .filter(
            QuestionBank.requirements_id == req.id,
            QuestionBank.level == a.selected_level,
            QuestionBank.topic.in_(a.selected_topics or []),
        )
        .all()
    )
    if not bank:
        raise HTTPException(status_code=400, detail="Нет вопросов для выбранных тем — обратитесь к администратору")

    seen: set[str] = set()
    by_topic: dict[str, list[QuestionBank]] = {}
    for q in bank:
        norm = " ".join((q.prompt or "").split()).lower()
        if not norm or norm in seen:
            continue
        seen.add(norm)
        by_topic.setdefault(q.topic, []).append(q)

    chosen = _pick_voice_questions(by_topic, VOICE_QUESTIONS_PER_SESSION)

    sess = InterviewSession(
        user_id=user.id,
        requirements_id=req.id,
        selected_topics=a.selected_topics or [],
        selected_level=a.selected_level,
        status=SessionStatus.draft,
        coding_task_prompt="",
        coding_task_language="python",
        mode=a.mode,
        target_duration_min=a.target_duration_min,
        assignment_id=a.id,
        # Per-assignment настройки голоса/модели прокидываем в сессию,
        # чтобы WS-обработчик и evaluate_voice_answer могли их прочитать
        # без дополнительного JOIN-а к assignments.
        voice=a.voice,
        llm_model=a.llm_model,
    )
    db.add(sess)
    db.flush()

    # Кодинг-задачи генерируются через LLM (OpenAI). Если OpenAI откажет
    # (403 региона, 401 ключ, 429 квота, сетевая ошибка) — глобальный
    # exception handler в app.main преобразует её в 502 с понятным русским
    # detail. Транзакция БД откатится автоматически в get_db (нет commit'а).
    coding_topics = _pick_coding_topics(a.selected_topics or [], CODING_TASKS_PER_SESSION)
    task_set = generate_coding_tasks(
        summary=req.summary,
        topics=coding_topics,
        level=a.selected_level.value,
        session_id=sess.id,
        requirements_id=req.id,
        db=db,
    )
    sess.coding_task_prompt = task_set.tasks[0].prompt if task_set.tasks else ""
    sess.coding_task_language = task_set.language or "python"

    for idx, q in enumerate(chosen):
        db.add(SessionQuestion(
            session_id=sess.id,
            idx=idx,
            type=QuestionType.voice,
            bank_id=q.id,
            topic=q.topic,
            prompt_text=q.prompt,
            criteria=q.criteria,
        ))
    session_default_lang = task_set.language or "python"
    for j, task in enumerate(task_set.tasks):
        item_lang = detect_coding_language(task.topic, session_default_lang)
        db.add(SessionQuestion(
            session_id=sess.id,
            idx=len(chosen) + j,
            type=QuestionType.coding,
            bank_id=None,
            topic=task.topic or "coding",
            prompt_text=task.prompt,
            criteria="",
            coding_language=item_lang,
        ))

    a.status = AssignmentStatus.started
    db.commit()
    db.refresh(sess)
    logger.info("me.start_assignment: assignment=%d, session=%d, user=%d", a.id, sess.id, user.id)
    return _to_detail(sess)


def _pick_voice_questions(
    by_topic: dict[str, list[QuestionBank]], target: int
) -> list[QuestionBank]:
    """Берём `target` вопросов сгруппированными по темам — все вопросы одной темы
    идут подряд, чтобы интервью не прыгало между темами."""
    topics = list(by_topic.keys())
    n = len(topics)
    if n == 0:
        return []
    base, remainder = divmod(target, n)
    chosen: list[QuestionBank] = []
    used: set[int] = set()
    for i, t in enumerate(topics):
        quota = base + (1 if i < remainder else 0)
        pool = list(by_topic[t])
        random.shuffle(pool)
        for q in pool[:quota]:
            chosen.append(q)
            used.add(q.id)
    # Если в каких-то темах меньше вопросов, чем квота — добираем из остальных,
    # сохраняя группировку (идём по темам в порядке, а не вперемешку).
    if len(chosen) < target:
        for t in topics:
            for q in by_topic[t]:
                if q.id in used:
                    continue
                chosen.append(q)
                used.add(q.id)
                if len(chosen) >= target:
                    break
            if len(chosen) >= target:
                break
    return chosen


def _pick_coding_topics(selected: list[str], count: int) -> list[str]:
    if not selected:
        return []
    n = len(selected)
    base, remainder = divmod(count, n)
    out: list[str] = []
    for i, t in enumerate(selected):
        quota = base + (1 if i < remainder else 0)
        out.extend([t] * quota)
    return out[:count]


def _to_detail(sess: InterviewSession) -> SessionDetailOut:
    return SessionDetailOut(
        id=sess.id,
        user_id=sess.user_id,
        requirements_id=sess.requirements_id,
        selected_topics=sess.selected_topics or [],
        selected_level=sess.selected_level,
        status=sess.status,
        coding_task_prompt=sess.coding_task_prompt,
        coding_task_language=sess.coding_task_language,
        target_duration_min=sess.target_duration_min,
        mode=sess.mode,
        started_at=sess.started_at,
        finished_at=sess.finished_at,
        published_at=sess.published_at,
        assignment_id=sess.assignment_id,
        created_at=sess.created_at,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
    )


def _session_info(s: InterviewSession) -> AssignmentSessionInfo:
    """Свернуть сессию в срез для списка попыток (без cost — не показываем у user'а)."""
    duration_sec: int | None = None
    if s.started_at and s.finished_at:
        duration_sec = max(0, int((s.finished_at - s.started_at).total_seconds()))

    score_pct: float | None = None
    correct = partial = incorrect = skipped = 0
    if s.summary is not None:
        correct = s.summary.correct
        partial = s.summary.partial
        incorrect = s.summary.incorrect
        skipped = s.summary.skipped
        total = correct + partial + incorrect + skipped
        if total > 0:
            score_pct = round((correct + 0.5 * partial) / total * 100.0, 1)

    final_verdict = (s.summary.final_verdict if s.summary else "") or ""

    return AssignmentSessionInfo(
        id=s.id,
        status=s.status,
        started_at=s.started_at,
        finished_at=s.finished_at,
        duration_sec=duration_sec,
        score_pct=score_pct,
        total_cost_usd=None,
        final_verdict=final_verdict,
        correct=correct,
        partial=partial,
        incorrect=incorrect,
        skipped=skipped,
    )


def _assignment_detail(a: Assignment) -> AssignmentDetailOut:
    sessions_sorted = sorted(a.sessions, key=lambda s: s.created_at)
    sessions_info = [_session_info(s) for s in sessions_sorted]
    last = sessions_info[-1] if sessions_info else None
    sess_id = last.id if last else None

    return AssignmentDetailOut(
        id=a.id,
        admin_id=a.admin_id,
        user_id=a.user_id,
        requirements_id=a.requirements_id,
        selected_topics=a.selected_topics or [],
        selected_level=a.selected_level,
        mode=a.mode,
        target_duration_min=a.target_duration_min,
        status=a.status,
        note=a.note,
        voice=a.voice,
        llm_model=a.llm_model,
        created_at=a.created_at,
        user_email=a.user.email if a.user else "",
        user_full_name=(a.user.full_name if a.user else "") or "",
        requirements_title=a.requirements.title if a.requirements else "",
        session_id=sess_id,
        last_session_id=sess_id,
        attempts_count=len(sessions_info),
        session=last,
        sessions=sessions_info,
    )
