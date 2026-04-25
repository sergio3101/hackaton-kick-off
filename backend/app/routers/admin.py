"""Admin-эндпойнты: управление пользователями, назначения кикоффов, публикация результатов."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin
from app.db import get_db
from app.models import (
    Assignment,
    AssignmentStatus,
    InterviewSession,
    Requirements,
    SessionStatus,
    User,
    UserRole,
)
from app.schemas import (
    AdminUserCreate,
    AdminUserPatch,
    AssignmentCreate,
    AssignmentDetailOut,
    AssignmentOut,
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
    return [_assignment_detail(a) for a in rows]


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

    assignment = Assignment(
        admin_id=admin.id,
        user_id=user.id,
        requirements_id=req.id,
        selected_topics=payload.selected_topics,
        selected_level=payload.selected_level,
        mode=payload.mode,
        target_duration_min=payload.target_duration_min,
        note=payload.note or "",
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


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if a.status in (AssignmentStatus.started, AssignmentStatus.completed, AssignmentStatus.published):
        raise HTTPException(status_code=400, detail="Нельзя удалить начатое назначение")
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
    return [SessionOut.model_validate(s) for s in rows]


@router.get("/sessions/{session_id}", response_model=ReportOut)
def get_any_session_report(
    session_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ReportOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return ReportOut(
        session=SessionOut.model_validate(sess),
        summary=SummaryOut.model_validate(sess.summary) if sess.summary else None,
        items=[SessionItemOut.model_validate(i) for i in sess.items],
        total_cost_usd=0.0,
    )


@router.post("/sessions/{session_id}/publish", response_model=SessionOut)
def publish_session(
    session_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SessionOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status != SessionStatus.finished:
        raise HTTPException(status_code=400, detail="Сессия ещё не завершена")
    sess.published_at = datetime.now(timezone.utc)
    if sess.assignment is not None:
        sess.assignment.status = AssignmentStatus.published
    db.commit()
    db.refresh(sess)
    logger.info("admin.publish_session: id=%d, user=%d", sess.id, sess.user_id)
    return SessionOut.model_validate(sess)


@router.delete("/sessions/{session_id}/publish", response_model=SessionOut)
def unpublish_session(
    session_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SessionOut:
    sess = db.get(InterviewSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.published_at = None
    if sess.assignment is not None and sess.assignment.status == AssignmentStatus.published:
        sess.assignment.status = AssignmentStatus.completed
    db.commit()
    db.refresh(sess)
    return SessionOut.model_validate(sess)


# --- helpers -----------------------------------------------------------------------------

def _assignment_detail(a: Assignment) -> AssignmentDetailOut:
    sess_id = a.session.id if a.session else None
    published_at = a.session.published_at if a.session else None
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
        created_at=a.created_at,
        user_email=a.user.email if a.user else "",
        user_full_name=(a.user.full_name if a.user else "") or "",
        requirements_title=a.requirements.title if a.requirements else "",
        session_id=sess_id,
        published_at=published_at,
    )
