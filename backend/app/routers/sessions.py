import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from sqlalchemy import func

from app.auth import get_current_user, is_admin, require_admin
from app.db import get_db
from app.lang_detect import detect_coding_language
from app.llm.evaluate import make_overall_summary, review_code
from app.llm.generate import generate_coding_tasks
from app.models import (
    Assignment,
    AssignmentStatus,
    InterviewSession,
    LLMUsage,
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
from app.sandbox.runner import UnsupportedLanguageError, run as sandbox_run
from app.schemas import (
    CodingReviewIn,
    CodingRunIn,
    CodingRunOut,
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
    """Темы для кодинг-задач — сгруппированно (повторы темы идут подряд)."""
    if not selected:
        return []
    n = len(selected)
    base, remainder = divmod(count, n)
    out: list[str] = []
    for i, t in enumerate(selected):
        quota = base + (1 if i < remainder else 0)
        out.extend([t] * quota)
    return out[:count]


@router.get("", response_model=list[SessionOut])
def list_sessions(
    requirements_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    q = db.query(InterviewSession)
    # Админ видит все сессии всех пользователей (история команды);
    # обычный пользователь — только свои.
    if not is_admin(user):
        q = q.filter(InterviewSession.user_id == user.id)
    if requirements_id is not None:
        q = q.filter(InterviewSession.requirements_id == requirements_id)
    rows = q.order_by(InterviewSession.created_at.desc()).all()
    # Обычный user видит только опубликованные отчёты завершённых сессий.
    if not is_admin(user):
        rows = [r for r in rows if r.published_at is not None or r.status != SessionStatus.finished]
    return [SessionOut.model_validate(r) for r in rows]


@router.post("", response_model=SessionDetailOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    user: User = Depends(require_admin),
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

    # Дедупликация по нормализованному prompt_text — защищает от LLM-сгенерированных
    # одинаковых вопросов с разными bank.id (баг повторов в одной сессии).
    seen_prompts: set[str] = set()
    raw_by_topic: dict[str, list[QuestionBank]] = {}
    for q in bank:
        norm = " ".join((q.prompt or "").split()).lower()
        if not norm or norm in seen_prompts:
            continue
        seen_prompts.add(norm)
        raw_by_topic.setdefault(q.topic, []).append(q)

    # Группировка вопросов идёт в том порядке, в каком темы перечислены в
    # selected_topics — иначе порядок тем определяется QuestionBank.id и
    # стеки в интервью идут «случайно». Темы из bank, которых нет в выборе
    # админа (защита от рассинхрона), добавляем в хвост.
    by_topic: dict[str, list[QuestionBank]] = {}
    for t in payload.selected_topics:
        if t in raw_by_topic:
            by_topic[t] = raw_by_topic[t]
    for t, items in raw_by_topic.items():
        if t not in by_topic:
            by_topic[t] = items

    chosen = _pick_voice_questions(by_topic, VOICE_QUESTIONS_PER_SESSION)

    # Создаём session запись до генерации coding tasks, чтобы привязать LLM-usage к session_id.
    sess = InterviewSession(
        user_id=user.id,
        requirements_id=req.id,
        selected_topics=payload.selected_topics,
        selected_level=payload.selected_level,
        status=SessionStatus.draft,
        coding_task_prompt="",
        coding_task_language="python",
        mode=payload.mode,
        target_duration_min=payload.target_duration_min,
    )
    db.add(sess)
    db.flush()

    coding_topics = _pick_coding_topics(payload.selected_topics, CODING_TASKS_PER_SESSION)
    task_set = generate_coding_tasks(
        summary=req.summary,
        topics=coding_topics,
        level=payload.selected_level.value,
        session_id=sess.id,
        requirements_id=req.id,
        db=db,
    )
    primary_prompt = task_set.tasks[0].prompt if task_set.tasks else ""
    sess.coding_task_prompt = primary_prompt
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


@router.post("/{session_id}/coding/run/{item_id}", response_model=CodingRunOut)
def run_coding(
    session_id: int,
    item_id: int,
    payload: CodingRunIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CodingRunOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None or sess.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    coding_item = next(
        (i for i in sess.items if i.id == item_id and i.type == QuestionType.coding),
        None,
    )
    if coding_item is None:
        raise HTTPException(status_code=404, detail="Coding task not found in session")

    item_lang = (
        coding_item.coding_language
        or detect_coding_language(coding_item.topic, sess.coding_task_language)
    )
    try:
        result = sandbox_run(item_lang, payload.code)
    except UnsupportedLanguageError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Запуск кода для языка {exc.language!r} пока не поддерживается",
        )

    logger.info(
        "run_coding: session_id=%d, item_id=%d, lang=%s, exit=%d, duration_ms=%d",
        sess.id, coding_item.id, result.language, result.exit_code, result.duration_ms,
    )
    return CodingRunOut(
        language=result.language,
        exit_code=result.exit_code,
        stdout=result.stdout,
        stderr=result.stderr,
        duration_ms=result.duration_ms,
        timed_out=result.timed_out,
        truncated=result.truncated,
    )


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

    review_lang = (
        coding_item.coding_language
        or detect_coding_language(coding_item.topic, sess.coding_task_language)
    )
    review = review_code(
        task_prompt=coding_item.prompt_text,
        language=review_lang,
        code=payload.code,
        session_id=sess.id,
        db=db,
    )

    coding_item.answer_text = payload.code
    coding_item.verdict = Verdict(review.verdict) if review.verdict in {v.value for v in Verdict} else Verdict.incorrect
    coding_item.rationale = review.rationale
    coding_item.expected_answer = review.expected_answer
    coding_item.explanation = review.explanation
    # Клиент мог прислать испорченное значение — обрезаем по обе стороны до валидного диапазона.
    # Сам факт и доля вставки показываются отдельным бейджем «Использован буфер обмена»
    # в UI и отчёте, чтобы не смешивать с LLM-обоснованием.
    coding_item.paste_chars = max(0, min(payload.paste_chars, len(payload.code)))
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

    overall = ""
    if lines:
        try:
            overall = make_overall_summary(
                "\n\n".join(lines), session_id=sess.id, db=db
            )
        except Exception:
            # LLM-ошибка не должна блокировать завершение сессии — ставим пустой
            # overall и продолжаем; админ при ревью может перегенерировать.
            logger.exception("finish_session: make_overall_summary failed for session_id=%d", sess.id)
            overall = ""

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
    if sess.assignment is not None and sess.assignment.status != AssignmentStatus.published:
        sess.assignment.status = AssignmentStatus.completed
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
        total_cost_usd=_session_cost_usd(db, sess.id),
    )


@router.get("/{session_id}/report", response_model=ReportOut)
def get_report(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if not is_admin(user):
        if sess.user_id != user.id:
            raise HTTPException(status_code=404, detail="Session not found")
        if sess.status == SessionStatus.finished and sess.published_at is None:
            raise HTTPException(status_code=403, detail="Отчёт ещё не опубликован администратором")
    return ReportOut(
        session=SessionOut.model_validate(sess),
        summary=SummaryOut.model_validate(sess.summary) if sess.summary else None,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
        total_cost_usd=_session_cost_usd(db, sess.id),
    )


def _session_cost_usd(db: Session, session_id: int) -> float:
    total = (
        db.query(func.coalesce(func.sum(LLMUsage.cost_usd), 0.0))
        .filter(LLMUsage.session_id == session_id)
        .scalar()
    )
    return float(total or 0.0)


@router.get("/{session_id}/report.pdf")
def get_report_pdf(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if not is_admin(user):
        if sess.user_id != user.id:
            raise HTTPException(status_code=404, detail="Session not found")
        if sess.status == SessionStatus.finished and sess.published_at is None:
            raise HTTPException(status_code=403, detail="Отчёт ещё не опубликован администратором")

    from app.reports.pdf import render_session_pdf

    cost = _session_cost_usd(db, sess.id)
    pdf_bytes = render_session_pdf(
        sess,
        total_cost_usd=cost,
        show_paste_signal=is_admin(user),
    )
    filename = f"interview-{sess.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
