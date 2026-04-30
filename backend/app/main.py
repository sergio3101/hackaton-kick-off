import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAIError

from app.config import get_settings
from app.llm.client import format_openai_error
from app.logging_setup import setup_logging
from app.routers import admin, analytics, auth, interview_ws, me, requirements, sessions

settings = get_settings()
setup_logging(settings.log_level)
logger = logging.getLogger("app")

app = FastAPI(title="Kick-off Prep Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OpenAIError)
async def handle_openai_error(_: Request, exc: OpenAIError) -> JSONResponse:
    """Превращаем любую OpenAI-ошибку в 502 с понятным русским сообщением,
    чтобы фронт мог показать её в UI вместо `500 Internal Server Error`.

    Кодом 502 говорим: «бэк жив, но downstream-сервис (OpenAI) подвёл».
    """
    detail = format_openai_error(exc)
    logger.warning("openai_error: %s — %s", exc.__class__.__name__, detail)
    return JSONResponse(status_code=502, content={"detail": detail})


app.include_router(auth.router)
app.include_router(requirements.router)
app.include_router(sessions.router)
app.include_router(analytics.router)
app.include_router(interview_ws.router)
app.include_router(admin.router)
app.include_router(me.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


logger.info("App started, cors=%s", settings.cors_origins)
