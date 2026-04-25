import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.llm.extract import (
    ExtractedQuestion,
    ExtractedTopic,
    ensure_full_bank,
    extract_requirements,
    generate_questions_for_pair,
)
from app.models import Level, QuestionBank, Requirements, User
from app.schemas import QuestionOut, RequirementsDetailOut, RequirementsOut, TopicOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/requirements", tags=["requirements"])


class RequirementsPatch(BaseModel):
    title: str = Field(min_length=1, max_length=255)


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
    user: User = Depends(get_current_user),
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
    extracted = extract_requirements(raw_text)
    full_questions = ensure_full_bank(extracted.summary, extracted.topics, extracted.questions)

    req = Requirements(
        user_id=user.id,
        title=title or "Untitled",
        raw_text=raw_text,
        summary=extracted.summary,
        topics=[{"name": t.name, "description": t.description} for t in extracted.topics],
    )
    db.add(req)
    db.flush()

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
    req = _get_owned(db, req_id, user)
    return _to_detail(req, db)


@router.patch("/{req_id}", response_model=RequirementsDetailOut)
def update_requirements(
    req_id: int,
    patch: RequirementsPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = _get_owned(db, req_id, user)
    req.title = patch.title.strip() or "Untitled"
    db.commit()
    db.refresh(req)
    return _to_detail(req, db)


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirements(
    req_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    req = _get_owned(db, req_id, user)
    db.delete(req)
    db.commit()
    logger.info("delete_requirements: req_id=%d, user_id=%d", req_id, user.id)


@router.post("/{req_id}/regenerate", response_model=RequirementsDetailOut)
def regenerate_bank(
    req_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = _get_owned(db, req_id, user)

    topics = [ExtractedTopic(name=t.get("name", ""), description=t.get("description", ""))
              for t in (req.topics or []) if t.get("name")]
    if not topics:
        raise HTTPException(status_code=400, detail="У проекта нет тем — нечего перегенерировать")

    logger.info("regenerate_bank: req_id=%d, topics=%d", req.id, len(topics))
    questions: list[ExtractedQuestion] = []
    for topic in topics:
        for level in ("junior", "middle", "senior"):
            try:
                questions.extend(generate_questions_for_pair(req.summary, topic, level, 5))
            except Exception:
                logger.exception("regenerate_bank: pair gen failed topic=%s level=%s", topic.name, level)
                continue
    full = ensure_full_bank(req.summary, topics, questions)

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
