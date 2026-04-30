import json
import logging
from functools import lru_cache
from json import JSONDecodeError

from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    OpenAIError,
    PermissionDeniedError,
    RateLimitError,
)
from openai import OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_openai() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def safe_json_loads(content: str | None, *, kind: str) -> dict:
    """Парсинг LLM-ответа с гарантией dict при любой ошибке. Логирует raw для диагностики."""
    if not content:
        logger.warning("llm.%s: empty LLM response", kind)
        return {}
    try:
        result = json.loads(content)
        if isinstance(result, dict):
            return result
        logger.warning("llm.%s: LLM returned non-dict (%s), using fallback", kind, type(result).__name__)
        return {}
    except JSONDecodeError as exc:
        logger.warning("llm.%s: malformed JSON from LLM (%s), raw=%r", kind, exc, content[:500])
        return {}


def format_openai_error(exc: BaseException) -> str:
    """Преобразовать openai-исключение в человеко-читаемое сообщение для UI.

    Распознаёт типичные коды (403 region-block, 401 auth, 429 rate-limit, network)
    и возвращает короткий русский текст. Для нераспознанных — generic-фоллбек.
    """
    # 403 — чаще всего unsupported_country_region_territory.
    if isinstance(exc, PermissionDeniedError):
        body = getattr(exc, "body", None) or {}
        code = ""
        if isinstance(body, dict):
            err = body.get("error") or {}
            if isinstance(err, dict):
                code = err.get("code") or ""
        if code == "unsupported_country_region_territory":
            return (
                "OpenAI недоступен в вашем регионе. Используйте VPN или настройте "
                "прокси через переменную OPENAI_BASE_URL и перезапустите backend."
            )
        return "OpenAI отказал в доступе (403). Проверьте права API-ключа."

    if isinstance(exc, AuthenticationError):
        return (
            "Неверный OPENAI_API_KEY. Обновите ключ в .env и перезапустите backend."
        )

    if isinstance(exc, RateLimitError):
        return (
            "OpenAI вернул rate-limit (429). Попробуйте через минуту или повысьте "
            "квоту аккаунта."
        )

    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        return (
            "Не удалось связаться с OpenAI API (сетевая ошибка). "
            "Проверьте подключение и переменную OPENAI_BASE_URL."
        )

    if isinstance(exc, OpenAIError):
        msg = str(exc) or exc.__class__.__name__
        return f"Ошибка OpenAI: {msg}"

    return f"Ошибка LLM: {exc}"
