import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";
import type { AnalyticsOverviewOut, TopicStat, TrendPoint } from "../api/types";
import Icon from "../components/Icon";
import { Kpi } from "../components/UI";

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () =>
      (await api.get<AnalyticsOverviewOut>("/api/analytics/overview")).data,
  });

  if (isLoading || !data) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка аналитики...
      </div>
    );
  }

  const empty = data.total_questions_answered === 0;
  const trendData = data.trend_30d.map((t) => t.sessions);
  const scoreSpark = data.trend_30d.map((t) => Math.round(t.avg_score * 100));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
            ANALYTICS · TEAM PERFORMANCE
          </div>
          <h1 className="page-title">Аналитика</h1>
          <div className="page-sub">
            Тренд, темы, слабые места — обновлено сейчас.
          </div>
        </div>
        <button className="btn">
          <Icon name="doc" size={14} /> Экспорт
        </button>
      </div>

      {empty && (
        <div
          className="card"
          style={{
            marginBottom: 18,
            padding: "14px 18px",
            background: "var(--warn-soft)",
            borderColor: "oklch(0.40 0.08 75)",
            color: "var(--warn)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="sparkle" size={14} />
            Пока нет данных для анализа — пройдите хотя бы одно интервью, чтобы увидеть
            статистику по темам и тренд.
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Kpi
          label="Средний score"
          value={`${(data.overall_avg_score * 100).toFixed(0)}%`}
          hint="по всем ответам"
          sparkData={scoreSpark.length ? scoreSpark : [40, 50, 45, 55, 60]}
        />
        <Kpi
          label="Сессий завершено"
          value={data.finished_sessions}
          hint={`всего: ${data.total_sessions}`}
          sparkData={trendData.length ? trendData : [0, 1, 0, 2, 1, 3, 2]}
        />
        <Kpi
          label="Ответов"
          value={data.total_questions_answered}
          hint="суммарно"
          sparkData={[1, 2, 1, 3, 2, 4, 3, 5, 4, 6]}
        />
        <Kpi
          label="Уровней"
          value={data.by_level.length}
          hint="распределение"
          sparkColor="var(--warn)"
          sparkData={data.by_level.map((b) => b.sessions)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 500 }}>Score по темам</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {data.by_topic.length} тем
            </span>
          </div>
          {data.by_topic.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Нет данных</div>
          ) : (
            <TopicBars topics={data.by_topic} />
          )}
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 500 }}>Слабые места — что подтянуть</span>
            {data.weak_topics.length > 0 && (
              <span className="pill pill--danger">
                {data.weak_topics.length} тем
              </span>
            )}
          </div>
          {data.weak_topics.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
              Нет проблемных тем — все score ≥ 50%
            </div>
          ) : (
            <TopicBars topics={data.weak_topics} variant="weak" />
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span style={{ fontWeight: 500 }}>Активность за 30 дней</span>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 11,
              color: "var(--ink-3)",
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--accent)" }} /> ≥ 70%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--warn)" }} /> 40–70%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="dot" style={{ background: "var(--danger)" }} /> &lt; 40%
            </span>
          </div>
        </div>
        <TrendChart trend={data.trend_30d} />
      </div>

      <div className="card">
        <div style={{ fontWeight: 500, marginBottom: 12 }}>Сессии по уровням</div>
        {data.by_level.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Нет сессий</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {data.by_level.map((b) => (
              <div
                key={b.level}
                style={{
                  padding: "10px 16px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--bg-line)",
                  borderRadius: "var(--r-2)",
                }}
              >
                <div className="mono upper" style={{ color: "var(--ink-3)" }}>
                  {b.level}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    marginTop: 4,
                    color: "var(--ink-1)",
                  }}
                >
                  {b.sessions}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopicBars({
  topics,
  variant = "default",
}: {
  topics: TopicStat[];
  variant?: "default" | "weak";
}) {
  return (
    <div>
      {topics.map((t) => {
        const pct = Math.round(t.avg_score * 100);
        const fillVariant =
          variant === "weak"
            ? "bar-row__fill--danger"
            : pct >= 70
              ? ""
              : pct >= 40
                ? "bar-row__fill--warn"
                : "bar-row__fill--danger";
        return (
          <div key={t.topic} className="bar-row">
            <div className="bar-row__label" title={t.topic}>
              {t.topic}
            </div>
            <div className="bar-row__track">
              <div
                className={`bar-row__fill ${fillVariant}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="bar-row__num">
              {pct}% · {t.answered}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = Math.max(1, ...trend.map((p) => p.sessions));
  const totalSessions = trend.reduce((acc, p) => acc + p.sessions, 0);
  if (totalSessions === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
        Нет активности за последние 30 дней
      </div>
    );
  }
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 140,
        }}
      >
        {trend.map((p) => {
          const h = (p.sessions / max) * 100;
          const color =
            p.sessions === 0
              ? "var(--bg-3)"
              : p.avg_score >= 0.7
                ? "var(--accent)"
                : p.avg_score >= 0.4
                  ? "var(--warn)"
                  : "var(--danger)";
          return (
            <div
              key={p.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
              }}
              title={`${p.date}: ${p.sessions} сессий, score ${(p.avg_score * 100).toFixed(0)}%`}
            >
              <div
                style={{
                  background: color,
                  height: `${h}%`,
                  minHeight: p.sessions ? 6 : 2,
                  borderRadius: 3,
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        className="mono"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-4)",
          marginTop: 6,
        }}
      >
        <span>{trend[0]?.date}</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  );
}
