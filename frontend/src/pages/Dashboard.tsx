import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type {
  AnalyticsOverviewOut,
  RequirementsOut,
  SessionOut,
} from "../api/types";
import Icon from "../components/Icon";
import { Kpi, StatusPill, Wave } from "../components/UI";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const projectsQ = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
    enabled: isAdmin,
  });
  const sessionsQ = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<SessionOut[]>("/api/sessions")).data,
    enabled: isAdmin,
  });
  const analyticsQ = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () =>
      (await api.get<AnalyticsOverviewOut>("/api/analytics/overview")).data,
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/me/assignments" replace />;

  const projects = projectsQ.data ?? [];
  const sessions = (sessionsQ.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const isEmpty = !projectsQ.isLoading && projects.length === 0;
  const activeSession = sessions.find((s) => s.status === "active");
  const lastFinished = sessions.find((s) => s.status === "finished");
  const overview = analyticsQ.data;
  const activeCount = sessions.filter((s) => s.status === "active").length;

  if (isEmpty) {
    return <OnboardingWizard />;
  }

  const trendData = overview?.trend_30d?.map((t) => t.sessions) ?? [];
  const scoreData =
    overview?.trend_30d?.map((t) => Math.round(t.avg_score * 100)) ?? [];

  const now = new Date();
  const dateLine = now
    .toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
  const timeLine = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--accent)", marginBottom: 8 }}>
            <span className="dot dot--live" style={{ marginRight: 6 }} />
            {dateLine} · {timeLine}
          </div>
          <h1 className="page-title">Дашборд команды</h1>
          <div className="page-sub">
            Привет, {user?.email?.split("@")[0]}. У вас{" "}
            <strong style={{ color: "var(--ink-1)" }}>
              {activeCount} активн{activeCount === 1 ? "ая" : "ых"} сесси
              {activeCount === 1 ? "я" : "й"}
            </strong>{" "}
            и <strong style={{ color: "var(--ink-1)" }}>{projects.length} проект
            {projects.length === 1 ? "" : projects.length < 5 ? "а" : "ов"}</strong> в
            работе.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/upload" className="btn">
            <Icon name="upload" size={14} />
            Загрузить ТЗ
          </Link>
          <Link to="/admin/assignments" className="btn btn--primary">
            <Icon name="tag" size={14} />
            Назначить kick-off
          </Link>
        </div>
      </div>

      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <Kpi
            label="Сессий завершено"
            value={overview.finished_sessions}
            delta={overview.finished_sessions > 0 ? `+${overview.finished_sessions}` : undefined}
            deltaType="up"
            hint="всего"
            sparkData={trendData.length ? trendData : [0, 1, 0, 2, 1, 3, 2]}
          />
          <Kpi
            label="Средний score"
            value={
              overview.total_questions_answered > 0
                ? `${Math.round(overview.overall_avg_score * 100)}%`
                : "—"
            }
            hint="по ответам"
            sparkData={scoreData.length ? scoreData : [40, 50, 45, 60, 55, 65, 70]}
          />
          <Kpi
            label="Ответов"
            value={overview.total_questions_answered}
            hint="суммарно"
            sparkData={[1, 2, 1, 3, 2, 4, 3, 5, 4, 6]}
          />
          <Kpi
            label="Активных сейчас"
            value={activeCount}
            hint={activeCount > 0 ? "в эфире · live" : "нет активных"}
            sparkColor="var(--warn)"
            sparkData={[2, 3, 2, 4, 3, 5, 4, 3, 4, 3]}
          />
        </div>
      )}

      {activeSession && (
        <div
          className="card"
          style={{ marginBottom: 18, position: "relative", overflow: "hidden", padding: 0 }}
        >
          <div
            className="zebra-stripes--soft"
            style={{ position: "absolute", inset: 0, opacity: 0.7 }}
          />
          <div
            style={{
              position: "relative",
              padding: 22,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div>
              <div
                className="mono upper"
                style={{ color: "var(--accent)", marginBottom: 8 }}
              >
                <span className="dot dot--live" style={{ marginRight: 6 }} />
                АКТИВНАЯ СЕССИЯ — В ЭФИРЕ
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  marginBottom: 6,
                }}
              >
                Сессия #{activeSession.id} · уровень{" "}
                <span className="mono" style={{ color: "var(--accent)" }}>
                  {activeSession.selected_level}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  color: "var(--ink-2)",
                  fontSize: 13,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Темы:{" "}
                  <span className="mono">
                    {activeSession.selected_topics.join(", ") || "—"}
                  </span>
                </span>
                <span style={{ color: "var(--ink-4)" }}>·</span>
                <span>
                  Режим:{" "}
                  <span className="mono">{activeSession.mode}</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Wave bars={20} intense={0.7} />
              <Link
                to={`/admin/sessions/${activeSession.id}`}
                className="btn btn--primary"
              >
                Открыть сессию <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 0, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--bg-line)",
            }}
          >
            <span style={{ fontWeight: 500 }}>Последние сессии</span>
            <Link to="/sessions" className="btn btn--sm btn--ghost">
              Вся история <Icon name="arrow-right" size={12} />
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Сессии появятся здесь после первого запуска
            </div>
          ) : (
            sessions.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                to={
                  s.status === "finished"
                    ? `/sessions/${s.id}/report`
                    : `/admin/sessions/${s.id}`
                }
                style={{
                  padding: "12px 20px",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 140px 80px 110px",
                  gap: 16,
                  alignItems: "center",
                  borderBottom: "1px solid var(--bg-line)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <span className="mono" style={{ color: "var(--ink-3)" }}>
                  #{s.id}
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {s.selected_topics.slice(0, 3).join(", ") || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {s.mode} · {s.target_duration_min} мин
                  </div>
                </div>
                <span
                  className="mono"
                  style={{ color: "var(--ink-3)", fontSize: 12 }}
                >
                  {new Date(s.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="pill" style={{ background: "transparent" }}>
                  {s.selected_level}
                </span>
                <StatusPill status={s.status} />
              </Link>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minWidth: 0,
          }}
        >
          <div className="card">
            <div className="card__label">Быстрые действия</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Link
                to="/admin/assignments"
                className="btn"
                style={{ justifyContent: "flex-start", padding: 12 }}
              >
                <Icon name="tag" size={14} />
                Назначить kick-off
              </Link>
              <Link
                to="/upload"
                className="btn"
                style={{ justifyContent: "flex-start", padding: 12 }}
              >
                <Icon name="upload" size={14} />
                Загрузить ТЗ
              </Link>
              <Link
                to="/sessions"
                className="btn"
                style={{ justifyContent: "flex-start", padding: 12 }}
              >
                <Icon name="search" size={14} />
                Найти сессию
              </Link>
              <Link
                to="/analytics"
                className="btn"
                style={{ justifyContent: "flex-start", padding: 12 }}
              >
                <Icon name="chart" size={14} />
                Аналитика
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--bg-line)",
              }}
            >
              <span style={{ fontWeight: 500 }}>Проекты</span>
              <Link to="/upload" className="btn btn--sm btn--ghost">
                <Icon name="plus" size={12} />
              </Link>
            </div>
            {projects.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                Загрузите первый ТЗ
              </div>
            ) : (
              projects.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/requirements/${p.id}`}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.title}
                    >
                      {p.title}
                    </div>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.topics.length} тем
                    </span>
                  </div>
                  {p.summary && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        marginBottom: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.summary}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.topics.slice(0, 4).map((t) => (
                      <span key={t.name} className="tag">
                        {t.name}
                      </span>
                    ))}
                    {p.topics.length > 4 && (
                      <span className="tag">+{p.topics.length - 4}</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {lastFinished && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card__label">Последний отчёт</div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                Сессия #{lastFinished.id} · {lastFinished.selected_level}
              </div>
              <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}
              >
                {new Date(lastFinished.created_at).toLocaleString("ru-RU")}
              </div>
            </div>
            <Link to={`/sessions/${lastFinished.id}/report`} className="btn btn--sm">
              Открыть отчёт <Icon name="arrow-right" size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingWizard() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--accent)", marginBottom: 8 }}>
            ONBOARDING · 3 ШАГА
          </div>
          <h1 className="page-title">Добро пожаловать!</h1>
          <div className="page-sub">
            Тренировочное интервью за 3 шага. Начните с загрузки ТЗ вашего проекта.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Step
          n={1}
          title="Загрузите ТЗ"
          desc="Markdown-файлы или вставьте текст. ИИ извлечёт темы и сгенерирует банк вопросов."
          cta="Загрузить ТЗ"
          to="/upload"
          primary
        />
        <Step
          n={2}
          title="Создайте сессию"
          desc="Выберите темы и уровень. Длительность 10–15 минут."
          cta="После шага 1"
          to="/projects"
        />
        <Step
          n={3}
          title="Получите отчёт"
          desc="Голосовое Q&A + лайв-кодинг. Эталонные ответы и слабые места — в отчёте."
          cta="После шага 2"
          to="/analytics"
        />
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  cta,
  to,
  primary = false,
}: {
  n: number;
  title: string;
  desc: string;
  cta: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <div className="card">
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: primary ? "var(--accent)" : "var(--bg-2)",
          color: primary ? "var(--accent-ink)" : "var(--ink-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        {n}
      </div>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.55 }}>
        {desc}
      </div>
      {primary ? (
        <Link to={to} className="btn btn--primary btn--sm">
          {cta} <Icon name="arrow-right" size={12} />
        </Link>
      ) : (
        <span className="mono upper" style={{ color: "var(--ink-4)" }}>
          {cta}
        </span>
      )}
    </div>
  );
}
