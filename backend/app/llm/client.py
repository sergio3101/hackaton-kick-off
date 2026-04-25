from functools import lru_cache

from openai import OpenAI

from app.config import get_settings


@lru_cache(maxsize=1)
def get_openai() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)
