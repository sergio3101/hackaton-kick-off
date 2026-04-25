import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.llm.evaluate import make_overall_summary, review_code
from app.llm.generate import generate_coding_tasks
from app.models import (
    InterviewSession,
    Level,
    QuestionBank,
    QuestionType,
    Requirements,
    SessionQuestion,
    SessionStatus,
    SessionSummary,
    User,
    Verdict,
)
from app.schemas import (
    CodingReviewIn,
    ReportOut,
    SessionCreate,
    SessionDetailOut,
    SessionItemOut,
    SessionOut,
    SummaryOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sessions", tags=["sessions"])

VOICE_QUESTIONS_PER_SESSION = 10
CODING_TASKS_PER_SESSION = 3


def _pick_coding_topics(selected: list[str], count: int) -> list[str]:
    """Подобрать ровно `count` тем для кодинг-задач.

    Если выбранных тем хватает — берём `count` случайных без повторов.
    Если меньше — циклически дополняем до нужного числа.
    """
    if not selected:
        return []
    if len(selected) >= count:
        return random.sample(selected, count)
    out: list[str] = []
    i = 0
    while len(out) < count:
        out.append(selected[i % len(selected)])
        i += 1
    return out


@router.get("", response_model=list[SessionOut])
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    rows = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return [SessionOut.model_validate(r) for r in rows]


@router.post("", response_model=SessionDetailOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    req = db.get(Requirements, payload.requirements_id)
    if req is None or req.user_id != user.id:
        raise HTTPException(status_code=404, detail="Requirements not found")

    bank = (
        db.query(QuestionBank)
        .filter(
            QuestionBank.requirements_id == req.id,
            QuestionBank.level == payload.selected_level,
            QuestionBank.topic.in_(payload.selected_topics),
        )
        .all()
    )
    if not bank:
        raise HTTPException(status_code=400, detail="Не найдено вопросов для выбранных тем и уровня")

    by_topic: dict[str, list[QuestionBank]] = {}
    for q in bank:
        by_topic.setdefault(q.topic, []).append(q)

    chosen: list[QuestionBank] = []
    topics_cycle = list(by_topic.keys())
    while len(chosen) < VOICE_QUESTIONS_PER_SESSION and any(by_topic.values()):
        for t in topics_cycle:
            pool = by_topic.get(t) or []
            if not pool:
                continue
            pick = random.choice(pool)
            pool.remove(pick)
            chosen.append(pick)
            if len(chosen) >= VOICE_QUESTIONS_PER_SESSION:
                break

    coding_topics = _pick_coding_topics(payload.selected_topics, CODING_TASKS_PER_SESSION)
    task_set = generate_coding_tasks(
        summary=req.summary,
        topics=coding_topics,
        level=payload.selected_level.value,
    )
    primary_prompt = task_set.tasks[0].prompt if task_set.tasks else ""

    sess = InterviewSession(
        user_id=user.id,
        requirements_id=req.id,
        selected_topics=payload.selected_topics,
        selected_level=payload.selected_level,
        status=SessionStatus.draft,
        coding_task_prompt=primary_prompt,
        coding_task_language=task_set.language or "python",
    )
    db.add(sess)
    db.flush()

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
    for j, task in enumerate(task_set.tasks):
        db.add(SessionQuestion(
            session_id=sess.id,
            idx=len(chosen) + j,
            type=QuestionType.coding,
            bank_id=None,
            topic=task.topic or "coding",
            prompt_text=task.prompt,
            criteria="",
        ))
    db.commit()
    db.refresh(sess)
    logger.info(
        "create_session: session_id=%d, level=%s, topics=%s, voice=%d, coding=%d",
        sess.id, payload.selected_level.value, payload.selected_topics,
        len(chosen), len(task_set.tasks),
    )
    return _to_detail(sess)


@router.get("/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_detail(sess)


@router.post("/{session_id}/start", response_model=SessionOut)
def start_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status == SessionStatus.draft:
        sess.status = SessionStatus.active
        sess.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sess)
        logger.info("start_session: session_id=%d", sess.id)
    return SessionOut.model_validate(sess)


@router.post("/{session_id}/coding/review/{item_id}", response_model=SessionItemOut)
def submit_coding(
    session_id: int,
    item_id: int,
    payload: CodingReviewIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionItemOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    coding_item = next(
        (i for i in sess.items if i.id == item_id and i.type == QuestionType.coding),
        None,
    )
    if coding_item is None:
        raise HTTPException(status_code=404, detail="Coding task not found in session")

    review = review_code(
        task_prompt=coding_item.prompt_text,
        language=sess.coding_task_language,
        code=payload.code,
    )

    coding_item.answer_text = payload.code
    coding_item.verdict = Verdict(review.verdict) if review.verdict in {v.value for v in Verdict} else Verdict.incorrect
    coding_item.rationale = review.rationale
    db.commit()
    db.refresh(coding_item)
    logger.info(
        "submit_coding: session_id=%d, item_id=%d, topic=%s, verdict=%s",
        sess.id, coding_item.id, coding_item.topic, coding_item.verdict.value,
    )
    return SessionItemOut.model_validate(coding_item)


@router.post("/{session_id}/finish", response_model=ReportOut)
def finish_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    counts = {Verdict.correct: 0, Verdict.partial: 0, Verdict.incorrect: 0, Verdict.skipped: 0}
    lines: list[str] = []
    for item in sess.items:
        v = item.verdict or Verdict.skipped
        counts[v] += 1
        lines.append(
            f"[{item.type.value}] {item.topic}: {item.prompt_text}\n"
            f"  ответ: {item.answer_text or '(пусто)'}\n"
            f"  verdict: {v.value}; обоснование: {item.rationale or '(нет)'}"
        )

    overall = make_overall_summary("\n\n".join(lines)) if lines else ""

    summary = sess.summary
    if summary is None:
        summary = SessionSummary(session_id=sess.id)
        db.add(summary)
    summary.correct = counts[Verdict.correct]
    summary.partial = counts[Verdict.partial]
    summary.incorrect = counts[Verdict.incorrect]
    summary.skipped = counts[Verdict.skipped]
    summary.overall = overall

    sess.status = SessionStatus.finished
    sess.finished_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sess)
    db.refresh(summary)
    logger.info(
        "finish_session: session_id=%d, correct=%d, partial=%d, incorrect=%d, skipped=%d",
        sess.id, summary.correct, summary.partial, summary.incorrect, summary.skipped,
    )

    return ReportOut(
        session=SessionOut.model_validate(sess),
        summary=SummaryOut.model_validate(summary),
        items=[SessionItemOut.model_validate(i) for i in sess.items],
    )


@router.get("/{session_id}/report", response_model=ReportOut)
def get_report(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return ReportOut(
        session=SessionOut.model_validate(sess),
        summary=SummaryOut.model_validate(sess.summary) if sess.summary else None,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
    )


def _to_detail(sess: InterviewSession) -> SessionDetailOut:
    return SessionDetailOut(
        id=sess.id,
        requirements_id=sess.requirements_id,
        selected_topics=sess.selected_topics or [],
        selected_level=sess.selected_level,
        status=sess.status,
        coding_task_prompt=sess.coding_task_prompt,
        coding_task_language=sess.coding_task_language,
        started_at=sess.started_at,
        finished_at=sess.finished_at,
        created_at=sess.created_at,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
    )
