import hashlib
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, is_admin, require_admin
from app.db import get_db
from app.llm.extract import (
    ExtractedQuestion,
    ExtractedTopic,
    ensure_full_bank,
    extract_requirements,
    generate_questions_for_pair,
)
from app.models import (
    Assignment,
    InterviewSession,
    Level,
    QuestionBank,
    QuestionType,
    Requirements,
    SessionQuestion,
    SessionStatus,
    User,
    Verdict,
)
from app.schemas import (
    QuestionOut,
    RequirementsDetailOut,
    RequirementsOut,
    RequirementsStatsOut,
    TopicOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/requirements", tags=["requirements"])


class RequirementsPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=10_000)


class RegenerateRequest(BaseModel):
    questions_per_pair: int = Field(default=5, ge=1, le=10)


@router.get("", response_model=list[RequirementsOut])
def list_my_requirements(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RequirementsOut]:
    rows = (
        db.query(Requirements)
        .filter(Requirements.user_id == user.id)
        .order_by(Requirements.created_at.desc())
        .all()
    )
    return [RequirementsOut.model_validate(r) for r in rows]


@router.post("", response_model=RequirementsDetailOut, status_code=status.HTTP_201_CREATED)
async def upload_requirements(
    files: list[UploadFile] = File(default_factory=list),
    title: str = Form(default="Untitled"),
    text: str | None = Form(default=None),
    questions_per_pair: int = Form(default=5, ge=1, le=10),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    chunks: list[str] = []
    if text and text.strip():
        chunks.append(f"# {title or 'inline.md'}\n\n{text.strip()}")

    for f in files:
        if not f.filename or not f.filename.lower().endswith(".md"):
            raise HTTPException(status_code=400, detail=f"Допускаются только .md файлы (получен: {f.filename})")
        content = (await f.read()).decode("utf-8", errors="replace")
        chunks.append(f"# {f.filename}\n\n{content}")

    if not chunks:
        raise HTTPException(status_code=400, detail="Нужен хотя бы один .md файл или поле text")

    raw_text = "\n\n---\n\n".join(chunks)
    if len(raw_text) > 200_000:
        raise HTTPException(status_code=413, detail="Слишком большой объём требований (>200K символов)")

    logger.info(
        "upload_requirements: user_id=%d, files=%d, has_text=%s, raw_len=%d",
        user.id, len(files), bool(text and text.strip()), len(raw_text),
    )

    # C6: dedup по hash — если этот же материал уже разбирали, копируем результат без LLM.
    # Не считаем «битый» кэш (extract упал → summary пустой) как кэш-хит.
    content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    existing = (
        db.query(Requirements)
        .filter(
            Requirements.user_id == user.id,
            Requirements.content_hash == content_hash,
            Requirements.summary != "",
        )
        .order_by(Requirements.created_at.desc())
        .first()
    )
    if existing is not None:
        logger.info(
            "upload_requirements: cache hit (req_id=%d) for user_id=%d hash=%s — copying bank",
            existing.id, user.id, content_hash[:8],
        )
        clone = Requirements(
            user_id=user.id,
            title=title or existing.title,
            raw_text=raw_text,
            summary=existing.summary,
            topics=existing.topics,
            content_hash=content_hash,
        )
        db.add(clone)
        db.flush()
        existing_bank = (
            db.query(QuestionBank)
            .filter(QuestionBank.requirements_id == existing.id)
            .all()
        )
        for q in existing_bank:
            db.add(QuestionBank(
                requirements_id=clone.id,
                topic=q.topic,
                level=q.level,
                prompt=q.prompt,
                criteria=q.criteria,
            ))
        db.commit()
        db.refresh(clone)
        return _to_detail(clone, db)

    # Создаём запись заранее, чтобы все LLM-вызовы могли привязать usage к requirements_id.
    # content_hash оставляем пустым до успешного extract — иначе при падении LLM «битая»
    # запись будет считаться кэш-хитом для следующих загрузок того же материала.
    req = Requirements(
        user_id=user.id,
        title=title or "Untitled",
        raw_text=raw_text,
        summary="",
        topics=[],
        content_hash="",
    )
    db.add(req)
    db.flush()

    extracted = extract_requirements(
        raw_text,
        requirements_id=req.id,
        db=db,
        questions_per_pair=questions_per_pair,
    )
    full_questions = ensure_full_bank(
        extracted.summary, extracted.topics, extracted.questions,
        target=questions_per_pair,
        requirements_id=req.id, db=db,
    )

    req.summary = extracted.summary
    req.topics = [{"name": t.name, "description": t.description} for t in extracted.topics]
    # Hash проставляем только после успешного extract — теперь запись валидна для C6-кэша.
    req.content_hash = content_hash

    _persist_bank(db, req.id, full_questions)
    db.commit()
    db.refresh(req)
    logger.info(
        "upload_requirements: created req_id=%d, topics=%d, questions=%d",
        req.id, len(extracted.topics), len(full_questions),
    )

    return _to_detail(req, db)


@router.get("/{req_id}", response_model=RequirementsDetailOut)
def get_requirements(
    req_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = _get_visible(db, req_id, user)
    return _to_detail(req, db)


@router.get("/{req_id}/stats", response_model=RequirementsStatsOut)
def get_requirements_stats(
    req_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsStatsOut:
    req = _get_owned(db, req_id, user)
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.requirements_id == req.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    finished = [s for s in sessions if s.status == SessionStatus.finished]
    last_at = sessions[0].finished_at or sessions[0].created_at if sessions else None

    # Средний score по всем завершённым сессиям: correct=1, partial=0.5, остальное=0;
    # skipped исключаем из расчёта.
    weight = {
        Verdict.correct: 1.0,
        Verdict.partial: 0.5,
        Verdict.incorrect: 0.0,
    }
    total = 0.0
    count = 0
    for s in finished:
        for it in s.items:
            if it.type != QuestionType.voice:
                continue
            if it.verdict is None or it.verdict == Verdict.skipped:
                continue
            total += weight.get(it.verdict, 0.0)
            count += 1
    avg = (total / count) if count else 0.0

    return RequirementsStatsOut(
        requirements_id=req.id,
        sessions_total=len(sessions),
        sessions_finished=len(finished),
        avg_score=avg,
        last_session_at=last_at,
    )


@router.patch("/{req_id}", response_model=RequirementsDetailOut)
def update_requirements(
    req_id: int,
    patch: RequirementsPatch,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = _get_owned(db, req_id, user)
    if patch.title is not None:
        req.title = patch.title.strip() or "Untitled"
    if patch.summary is not None:
        req.summary = patch.summary.strip()
    db.commit()
    db.refresh(req)
    return _to_detail(req, db)


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirements(
    req_id: int,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    req = _get_owned(db, req_id, user)
    db.delete(req)
    db.commit()
    logger.info("delete_requirements: req_id=%d, user_id=%d", req_id, user.id)


@router.post("/{req_id}/regenerate", response_model=RequirementsDetailOut)
def regenerate_bank(
    req_id: int,
    payload: RegenerateRequest | None = None,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = _get_owned(db, req_id, user)

    topics = [ExtractedTopic(name=t.get("name", ""), description=t.get("description", ""))
              for t in (req.topics or []) if t.get("name")]
    if not topics:
        raise HTTPException(status_code=400, detail="У проекта нет тем — нечего перегенерировать")

    n = (payload.questions_per_pair if payload else 5)
    logger.info("regenerate_bank: req_id=%d, topics=%d, n_per_pair=%d", req.id, len(topics), n)
    questions: list[ExtractedQuestion] = []
    for topic in topics:
        for level in ("junior", "middle", "senior"):
            try:
                questions.extend(generate_questions_for_pair(
                    req.summary, topic, level, n,
                    requirements_id=req.id, db=db,
                ))
            except Exception:
                logger.exception("regenerate_bank: pair gen failed topic=%s level=%s", topic.name, level)
                continue
    full = ensure_full_bank(
        req.summary, topics, questions, target=n,
        requirements_id=req.id, db=db,
    )

    db.query(QuestionBank).filter(QuestionBank.requirements_id == req.id).delete()
    db.flush()
    _persist_bank(db, req.id, full)
    db.commit()
    db.refresh(req)
    logger.info("regenerate_bank: req_id=%d, persisted=%d", req.id, len(full))
    return _to_detail(req, db)


def _persist_bank(db: Session, req_id: int, questions: list[ExtractedQuestion]) -> None:
    for q in questions:
        try:
            level = Level(q.level)
        except ValueError:
            continue
        db.add(QuestionBank(
            requirements_id=req_id,
            topic=q.topic,
            level=level,
            prompt=q.prompt,
            criteria=q.criteria,
        ))


def _get_owned(db: Session, req_id: int, user: User) -> Requirements:
    req = db.get(Requirements, req_id)
    if req is None or req.user_id != user.id:
        raise HTTPException(status_code=404, detail="Requirements not found")
    return req


def _get_visible(db: Session, req_id: int, user: User) -> Requirements:
    """Доступ для просмотра: владелец-admin или пользователь, у которого есть
    сессия/назначение по этим требованиям."""
    req = db.get(Requirements, req_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Requirements not found")
    if is_admin(user) and req.user_id == user.id:
        return req
    has_session = (
        db.query(InterviewSession.id)
        .filter(
            InterviewSession.user_id == user.id,
            InterviewSession.requirements_id == req.id,
        )
        .first()
    )
    if has_session is not None:
        return req
    has_assignment = (
        db.query(Assignment.id)
        .filter(Assignment.user_id == user.id, Assignment.requirements_id == req.id)
        .first()
    )
    if has_assignment is not None:
        return req
    raise HTTPException(status_code=404, detail="Requirements not found")


def _to_detail(req: Requirements, db: Session) -> RequirementsDetailOut:
    bank = (
        db.query(QuestionBank)
        .filter(QuestionBank.requirements_id == req.id)
        .order_by(QuestionBank.topic, QuestionBank.level, QuestionBank.id)
        .all()
    )
    return RequirementsDetailOut(
        id=req.id,
        title=req.title,
        summary=req.summary,
        topics=[TopicOut(**t) for t in (req.topics or [])],
        created_at=req.created_at,
        bank=[QuestionOut.model_validate(q) for q in bank],
    )
