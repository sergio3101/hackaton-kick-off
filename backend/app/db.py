from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    future=True,
)
# expire_on_commit=False: после db.commit() атрибуты ORM-объектов НЕ
# инвалидируются. Это важно для WS-обработчика интервью (interview_ws.py),
# где параллельно идут две корутины (client_to_bridge + bridge_to_client) и
# ещё фоновая evaluate_voice_answer через asyncio.to_thread. С дефолтным
# expire_on_commit=True любое чтение атрибута sess.* после commit'а
# триггерило ленивый SELECT, который мог конфликтовать с другой
# конкурентной операцией на той же Session — отсюда
# `InvalidRequestError: This session is provisioning a new connection`.
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
