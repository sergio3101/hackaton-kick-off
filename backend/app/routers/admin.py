"""Admin-эндпойнты: управление пользователями, назначения кикоффов, публикация результатов."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin
from app.db import get_db
from app.models import (
    Assignment,
    AssignmentStatus,
    InterviewSession,
    LLMUsage,
    Requirements,
    User,
    UserRole,
)
from app.schemas import (
    ALLOWED_LLM_MODELS,
    ALLOWED_VOICES,
    AdminUserCreate,
    AdminUserPatch,
    AssignmentCreate,
    AssignmentDetailOut,
    AssignmentOut,
    AssignmentPatch,
    AssignmentSessionInfo,
    ReportOut,
    SessionItemOut,
    SessionOut,
    SummaryOut,
    UserOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Управление пользователями -----------------------------------------------------------

@router.get("/users", response_model=list[UserOut])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    rows = db.query(User).order_by(User.created_at.asc()).all()
    return [UserOut.model_validate(u) for u in rows]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email уже зарегистрирован")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name or "",
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("admin.create_user: id=%d, email=%s, role=%s", user.id, user.email, user.role.value)
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: AdminUserPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.email is not None and payload.email != user.email:
        if db.query(User).filter(User.email == payload.email, User.id != user_id).first():
            raise HTTPException(status_code=409, detail="Email уже используется")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.role is not None:
        if user.id == admin.id and payload.role != UserRole.admin:
            raise HTTPException(status_code=400, detail="Нельзя снять роль admin с самого себя")
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == admin.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Нельзя деактивировать самого себя")
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    db.delete(user)
    db.commit()


# --- Назначения --------------------------------------------------------------------------

@router.get("/assignments", response_model=list[AssignmentDetailOut])
def list_assignments(
    user_id: int | None = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentDetailOut]:
    q = db.query(Assignment)
    if user_id is not None:
        q = q.filter(Assignment.user_id == user_id)
    rows = q.order_by(Assignment.created_at.desc()).all()

    # Аггрегируем стоимость одним запросом по всем session_id, чтобы не делать
    # N запросов в цикле — для админского списка это критично при росте истории.
    # После перехода на 1-ко-многим: проходим по всем попыткам каждого assignment'а.
    session_ids = [s.id for a in rows for s in a.sessions]
    cost_by_session: dict[int, float] = {}
    if session_ids:
        cost_rows = (
            db.query(LLMUsage.session_id, func.coalesce(func.sum(LLMUsage.cost_usd), 0.0))
            .filter(LLMUsage.session_id.in_(session_ids))
            .group_by(LLMUsage.session_id)
            .all()
        )
        cost_by_session = {sid: float(c or 0.0) for sid, c in cost_rows}

    return [_assignment_detail(a, cost_by_session=cost_by_session) for a in rows]


@router.post("/assignments", response_model=AssignmentDetailOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentDetailOut:
    user = db.get(User, payload.user_id)
    if user is None or user.role != UserRole.user:
        raise HTTPException(status_code=400, detail="Назначение возможно только обычному пользователю")
    req = db.get(Requirements, payload.requirements_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Requirements not found")

    available_topics = {(t.get("name") or "").strip() for t in (req.topics or [])}
    bad = [t for t in payload.selected_topics if t not in available_topics]
    if bad:
        raise HTTPException(status_code=400, detail=f"Неизвестные темы: {bad}")

    if payload.voice is not None and payload.voice not in ALLOWED_VOICES:
        raise HTTPException(
            status_code=400,
            detail=f"Голос {payload.voice!r} не поддерживается. Доступно: {list(ALLOWED_VOICES)}",
        )
    if payload.llm_model is not None and payload.llm_model not in ALLOWED_LLM_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Модель {payload.llm_model!r} не поддерживается. Доступно: {list(ALLOWED_LLM_MODELS)}",
        )

    assignment = Assignment(
        admin_id=admin.id,
        user_id=user.id,
        requirements_id=req.id,
        selected_topics=payload.selected_topics,
        selected_level=payload.selected_level,
        mode=payload.mode,
        target_duration_min=payload.target_duration_min,
        note=payload.note or "",
        voice=payload.voice,
        llm_model=payload.llm_model,
        status=AssignmentStatus.assigned,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    logger.info(
        "admin.create_assignment: id=%d, user=%d, req=%d, level=%s",
        assignment.id, user.id, req.id, payload.selected_level.value,
    )
    return _assignment_detail(assignment)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentDetailOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentDetailOut:
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Заметка про семантику: если у assignment уже есть сессии, изменения в
    # его настройках НЕ влияют на уже стартованные/завершённые попытки —
    # параметры скопированы в InterviewSession при старте. Правки подтянет
    # только следующий вызов /start (новая попытка). Это норма для тренажёра:
    # админ может скорректировать темы/модель между прогонами кандидата.

    # Если меняется проект — темы должны быть валидны для нового проекта.
    new_req_id = payload.requirements_id if payload.requirements_id is not None else a.requirements_id
    new_topics = payload.selected_topics if payload.selected_topics is not None else (a.selected_topics or [])

    if payload.requirements_id is not None and payload.requirements_id != a.requirements_id:
        req = db.get(Requirements, payload.requirements_id)
        if req is None:
            raise HTTPException(status_code=404, detail="Requirements not found")
        a.requirements_id = req.id
    else:
        req = db.get(Requirements, a.requirements_id)

    if req is not None and new_topics:
        available = {(t.get("name") or "").strip() for t in (req.topics or [])}
        bad = [t for t in new_topics if t not in available]
        if bad:
            raise HTTPException(status_code=400, detail=f"Неизвестные темы: {bad}")

    if payload.selected_topics is not None:
        a.selected_topics = payload.selected_topics
    if payload.selected_level is not None:
        a.selected_level = payload.selected_level
    if payload.mode is not None:
        a.mode = payload.mode
    if payload.target_duration_min is not None:
        a.target_duration_min = payload.target_duration_min
    if payload.note is not None:
        a.note = payload.note
    if payload.voice is not None:
        if payload.voice == "":
            a.voice = None
        else:
            if payload.voice not in ALLOWED_VOICES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Голос {payload.voice!r} не поддерживается. Доступно: {list(ALLOWED_VOICES)}",
                )
            a.voice = payload.voice
    if payload.llm_model is not None:
        if payload.llm_model == "":
            a.llm_model = None
        else:
            if payload.llm_model not in ALLOWED_LLM_MODELS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Модель {payload.llm_model!r} не поддерживается. Доступно: {list(ALLOWED_LLM_MODELS)}",
                )
            a.llm_model = payload.llm_model

    db.commit()
    db.refresh(a)
    logger.info(
        "admin.update_assignment: id=%d, req=%d, level=%s",
        a.id, new_req_id, a.selected_level.value,
    )
    return _assignment_detail(a)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if a.sessions:
        raise HTTPException(
            status_code=400, detail="Нельзя удалить назначение с прохождениями"
        )
    db.delete(a)
    db.commit()


# --- Сессии и публикация -----------------------------------------------------------------

@router.get("/sessions", response_model=list[SessionOut])
def list_all_sessions(
    user_id: int | None = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    q = db.query(InterviewSession)
    if user_id is not None:
        q = q.filter(InterviewSession.user_id == user_id)
    rows = q.order_by(InterviewSession.created_at.desc()).all()
    return [SessionOut.from_session(s) for s in rows]


@router.get("/sessions/{session_id}", response_model=ReportOut)
def get_any_session_report(
    session_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ReportOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    cost = (
        db.query(func.coalesce(func.sum(LLMUsage.cost_usd), 0.0))
        .filter(LLMUsage.session_id == session_id)
        .scalar()
    )
    return ReportOut(
        session=SessionOut.from_session(sess),
        summary=SummaryOut.model_validate(sess.summary) if sess.summary else None,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
        total_cost_usd=float(cost or 0.0),
        requirements_title=sess.requirements.title if sess.requirements else "",
    )


# --- helpers -----------------------------------------------------------------------------

def _session_info_admin(
    s: InterviewSession,
    *,
    cost_by_session: dict[int, float] | None = None,
) -> AssignmentSessionInfo:
    """Свернуть сессию в срез с поддержкой стоимости (только для админа)."""
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
    cost = cost_by_session.get(s.id) if cost_by_session is not None else None

    return AssignmentSessionInfo(
        id=s.id,
        status=s.status,
        started_at=s.started_at,
        finished_at=s.finished_at,
        duration_sec=duration_sec,
        score_pct=score_pct,
        total_cost_usd=cost,
        final_verdict=final_verdict,
        correct=correct,
        partial=partial,
        incorrect=incorrect,
        skipped=skipped,
    )


def _assignment_detail(
    a: Assignment,
    *,
    cost_by_session: dict[int, float] | None = None,
) -> AssignmentDetailOut:
    sessions_sorted = sorted(a.sessions, key=lambda s: s.created_at)
    sessions_info = [
        _session_info_admin(s, cost_by_session=cost_by_session) for s in sessions_sorted
    ]
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
