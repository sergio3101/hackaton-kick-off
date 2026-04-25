from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.llm.extract import extract_requirements
from app.models import Level, QuestionBank, Requirements, User
from app.schemas import QuestionOut, RequirementsDetailOut, RequirementsOut, TopicOut

router = APIRouter(prefix="/api/requirements", tags=["requirements"])


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

    extracted = extract_requirements(raw_text)

    req = Requirements(
        user_id=user.id,
        title=title or "Untitled",
        raw_text=raw_text,
        summary=extracted.summary,
        topics=[{"name": t.name, "description": t.description} for t in extracted.topics],
    )
    db.add(req)
    db.flush()

    for q in extracted.questions:
        try:
            level = Level(q.level)
        except ValueError:
            continue
        db.add(QuestionBank(
            requirements_id=req.id,
            topic=q.topic,
            level=level,
            prompt=q.prompt,
            criteria=q.criteria,
        ))
    db.commit()
    db.refresh(req)

    return _to_detail(req, db)


@router.get("/{req_id}", response_model=RequirementsDetailOut)
def get_requirements(
    req_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequirementsDetailOut:
    req = db.get(Requirements, req_id)
    if req is None or req.user_id != user.id:
        raise HTTPException(status_code=404, detail="Requirements not found")
    return _to_detail(req, db)


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
