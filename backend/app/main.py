import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
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
