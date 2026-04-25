"""Аналитика по сессиям пользователя для дашборда `/analytics`."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Iterable

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.db import get_db
from app.models import (
    InterviewSession,
    Level,
    SessionQuestion,
    User,
    Verdict,
)
from app.schemas import SummaryOut  # noqa: F401  (для совместимости)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# Перевод verdict в численный score для агрегатов.
VERDICT_SCORE: dict[Verdict, float] = {
    Verdict.correct: 1.0,
    Verdict.partial: 0.5,
    Verdict.incorrect: 0.0,
}
# skipped исключаем из расчёта среднего.


class TopicStat(BaseModel):
    topic: str
    answered: int
    avg_score: float


class LevelStat(BaseModel):
    level: Level
    sessions: int


class TrendPoint(BaseModel):
    date: date
    sessions: int
    avg_score: float


class AnalyticsOverviewOut(BaseModel):
    total_sessions: int
    finished_sessions: int
    total_questions_answered: int
    overall_avg_score: float
    by_level: list[LevelStat]
    by_topic: list[TopicStat]
    weak_topics: list[TopicStat]
    trend_30d: list[TrendPoint]


def _scored_items(items: Iterable[SessionQuestion]) -> Iterable[tuple[SessionQuestion, float]]:
    for item in items:
        if item.verdict is None or item.verdict == Verdict.skipped:
            continue
        yield item, VERDICT_SCORE.get(item.verdict, 0.0)


@router.get("/overview", response_model=AnalyticsOverviewOut)
def overview(
    user_id: int | None = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewOut:
    q = db.query(InterviewSession)
    if user_id is not None:
        q = q.filter(InterviewSession.user_id == user_id)
    sessions = q.all()

    by_level_counter: dict[Level, int] = defaultdict(int)
    by_topic_sum: dict[str, float] = defaultdict(float)
    by_topic_count: dict[str, int] = defaultdict(int)
    trend_sum: dict[date, float] = defaultdict(float)
    trend_count: dict[date, int] = defaultdict(int)
    trend_sessions: dict[date, set[int]] = defaultdict(set)
    overall_sum = 0.0
    overall_count = 0
    finished_count = 0
    today = datetime.now(timezone.utc).date()
    earliest = today - timedelta(days=29)

    for sess in sessions:
        by_level_counter[sess.selected_level] += 1
        if sess.finished_at is not None:
            finished_count += 1
        sess_date = (
            sess.finished_at.date()
            if sess.finished_at
            else (sess.started_at.date() if sess.started_at else sess.created_at.date())
        )
        for item, score in _scored_items(sess.items):
            topic = item.topic or "(без темы)"
            by_topic_sum[topic] += score
            by_topic_count[topic] += 1
            overall_sum += score
            overall_count += 1
            if sess_date >= earliest:
                trend_sum[sess_date] += score
                trend_count[sess_date] += 1
                trend_sessions[sess_date].add(sess.id)

    by_topic = [
        TopicStat(
            topic=t,
            answered=by_topic_count[t],
            avg_score=(by_topic_sum[t] / by_topic_count[t]) if by_topic_count[t] else 0.0,
        )
        for t in by_topic_sum
    ]
    by_topic.sort(key=lambda x: (-x.answered, x.topic))

    weak_topics = [t for t in by_topic if t.answered >= 2]
    weak_topics.sort(key=lambda x: x.avg_score)
    weak_topics = weak_topics[:3]

    by_level = [LevelStat(level=lv, sessions=cnt) for lv, cnt in by_level_counter.items()]
    by_level.sort(key=lambda x: x.level.value)

    trend: list[TrendPoint] = []
    for i in range(30):
        d = earliest + timedelta(days=i)
        cnt = trend_count.get(d, 0)
        avg = (trend_sum[d] / cnt) if cnt else 0.0
        trend.append(TrendPoint(date=d, sessions=len(trend_sessions.get(d, set())), avg_score=avg))

    overall_avg = (overall_sum / overall_count) if overall_count else 0.0

    logger.info(
        "analytics.overview: scope_user_id=%s, total_sessions=%d, finished=%d, answered=%d",
        user_id, len(sessions), finished_count, overall_count,
    )

    return AnalyticsOverviewOut(
        total_sessions=len(sessions),
        finished_sessions=finished_count,
        total_questions_answered=overall_count,
        overall_avg_score=overall_avg,
        by_level=by_level,
        by_topic=by_topic,
        weak_topics=weak_topics,
        trend_30d=trend,
    )
