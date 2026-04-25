import json
import logging
from functools import lru_cache
from json import JSONDecodeError

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
