from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_BCRYPT_MAX = 72  # bcrypt принимает не больше 72 байт пароля


def _to_pw_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_pw_bytes(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_pw_bytes(plain), hashed.encode("ascii"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        if sub is None:
            raise JWTError("missing sub")
        return int(sub)
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# WS-тикет — короткоживущий одноразовый токен для подключения к WebSocket.
# JWT в URL-параметре access-токена (?token=...) светится в логах nginx, в
# Referer и в DevTools. Тикет живёт ~2 минуты — ровно столько, сколько нужно
# на handshake; даже если он попадёт в логи, сделать с ним ничего нельзя.
WS_TICKET_TTL_SECONDS = 120


def create_ws_ticket(user_id: int, session_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=WS_TICKET_TTL_SECONDS)
    payload = {"sub": str(user_id), "wss": session_id, "exp": expire, "kind": "ws"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_ws_ticket(ticket: str) -> tuple[int, int]:
    """Возвращает (user_id, session_id). Бросает HTTPException 401 если невалиден."""
    try:
        payload = jwt.decode(ticket, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("kind") != "ws":
            raise JWTError("not a ws ticket")
        sub = payload.get("sub")
        wss = payload.get("wss")
        if sub is None or wss is None:
            raise JWTError("missing claims")
        return int(sub), int(wss)
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired WS ticket",
        ) from exc


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_token(token)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    from app.models import UserRole

    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user


def is_admin(user: User) -> bool:
    from app.models import UserRole

    return user.role == UserRole.admin
