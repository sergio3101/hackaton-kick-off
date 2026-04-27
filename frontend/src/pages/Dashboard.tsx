import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import {
  FINAL_VERDICT_LABEL_RU,
  FINAL_VERDICT_PILL,
  type AnalyticsOverviewOut,
  type AssignmentDetailOut,
  type AssignmentSessionInfo,
  type FinalVerdict,
  type RequirementsOut,
  type SessionOut,
  type TopicStat,
  type TrendPoint,
} from "../api/types";
import Icon from "../components/Icon";
import { Kpi, Wave } from "../components/UI";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const projectsQ = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
    enabled: isAdmin,
  });
  // Активная сессия может быть и без assignment (admin создаёт через /api/sessions),
  // поэтому отдельный запрос /api/sessions для блока «в эфире» сохраняем.
  const sessionsQ = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<SessionOut[]>("/api/sessions")).data,
    enabled: isAdmin,
  });
  const assignmentsQ = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentDetailOut[]>("/api/admin/assignments")).data,
    enabled: isAdmin,
  });
  const analyticsQ = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () =>
      (await api.get<AnalyticsOverviewOut>("/api/analytics/overview")).data,
    enabled: isAdmin,
  });

  // hooks выше Navigate, чтобы не нарушать правила хуков (раннее return после).
  const finishedReports = useMemo<FinishedReportRow[]>(() => {
    if (!assignmentsQ.data) return [];
    const rows: FinishedReportRow[] = [];
    for (const a of assignmentsQ.data) {
      for (const s of a.sessions ?? []) {
        if (s.status !== "finished") continue;
        rows.push({
          ...s,
          requirements_title: a.requirements_title,
          user_email: a.user_email,
          user_full_name: a.user_full_name,
        });
      }
    }
    rows.sort((x, y) => {
      const tx = x.finished_at ? Date.parse(x.finished_at) : 0;
      const ty = y.finished_at ? Date.parse(y.finished_at) : 0;
      return ty - tx;
    });
    return rows.slice(0, 12);
  }, [assignmentsQ.data]);

  if (!isAdmin) return <Navigate to="/me/assignments" replace />;

  const projects = projectsQ.data ?? [];
  const sessions = (sessionsQ.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const assignments = (assignmentsQ.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const isEmpty = !projectsQ.isLoading && projects.length === 0;
  const activeSession = sessions.find((s) => s.status === "active");
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
          <Link to="/admin/assignments?new=1" className="btn btn--primary">
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

      {overview && (
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
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
              >
                {overview.by_topic.length} тем
              </span>
            </div>
            {overview.by_topic.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Нет данных</div>
            ) : (
              <TopicBars topics={overview.by_topic} />
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
              {overview.weak_topics.length > 0 && (
                <span className="pill pill--danger">
                  {overview.weak_topics.length} тем
                </span>
              )}
            </div>
            {overview.weak_topics.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Нет проблемных тем — все score ≥ 50%
              </div>
            ) : (
              <TopicBars topics={overview.weak_topics} variant="weak" />
            )}
          </div>
        </div>
      )}

      {overview && (
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
          <TrendChart trend={overview.trend_30d} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minWidth: 0,
          }}
        >
          <AssignmentsBlock assignments={assignments} />
          <ReportsBlock finished={finishedReports} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
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
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Загрузите первый ТЗ
              </div>
            ) : (
              <div style={{ flex: 1, overflow: "auto" }}>
              {projects.slice(0, 10).map((p) => (
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
              ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
          to="/admin/assignments"
        />
      </div>
    </div>
  );
}

type FinishedReportRow = AssignmentSessionInfo & {
  requirements_title: string;
  user_email: string;
  user_full_name: string;
};

function AssignmentsBlock({
  assignments,
}: {
  assignments: AssignmentDetailOut[];
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 20px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--bg-line)",
        }}
      >
        <span style={{ fontWeight: 500 }}>Назначения</span>
        <Link to="/admin/assignments" className="btn btn--sm btn--ghost">
          Все
        </Link>
      </div>
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--bg-line)",
          display: "grid",
          gridTemplateColumns: ASSIGNMENTS_GRID,
          gap: 10,
          alignItems: "center",
          minWidth: 540,
        }}
      >
        {["#", "ПРОЕКТ", "ПОЛЬЗОВАТЕЛЬ", "ДАТА", "ПОПЫТОК"].map((h) => (
          <div key={h} className="mono upper" style={{ color: "var(--ink-3)" }}>
            {h}
          </div>
        ))}
      </div>
      {assignments.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: 13,
          }}
        >
          Назначений пока нет
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {assignments.slice(0, 12).map((a) => (
            <Link
              key={a.id}
              to="/admin/assignments"
              style={{
                padding: "12px 20px",
                display: "grid",
                gridTemplateColumns: ASSIGNMENTS_GRID,
                gap: 10,
                alignItems: "center",
                borderBottom: "1px solid var(--bg-line)",
                fontSize: 13,
                cursor: "pointer",
                minWidth: 540,
              }}
            >
              <span className="mono" style={{ color: "var(--ink-3)" }}>
                #{a.id}
              </span>
              <div
                style={{
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={a.requirements_title || ""}
              >
                {a.requirements_title || "—"}
              </div>
              <div
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={a.user_email || ""}
              >
                <div style={{ fontWeight: 500 }}>
                  {a.user_full_name || a.user_email || "—"}
                </div>
                {a.user_full_name && a.user_email && (
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {a.user_email}
                  </div>
                )}
              </div>
              <span
                className="mono"
                style={{ color: "var(--ink-3)", fontSize: 12 }}
              >
                {formatShortDate(a.created_at)}
              </span>
              <span
                className="mono"
                style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
              >
                {a.attempts_count ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsBlock({ finished }: { finished: FinishedReportRow[] }) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 20px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--bg-line)",
        }}
      >
        <span style={{ fontWeight: 500 }}>Отчёты</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {finished.length}
        </span>
      </div>
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--bg-line)",
          display: "grid",
          gridTemplateColumns: REPORTS_GRID,
          gap: 10,
          alignItems: "center",
          minWidth: 580,
        }}
      >
        {["#", "ПРОЕКТ", "ПОЛЬЗОВАТЕЛЬ", "ДАТА", "SCORE", "ВЕРДИКТ"].map((h) => (
          <div key={h} className="mono upper" style={{ color: "var(--ink-3)" }}>
            {h}
          </div>
        ))}
      </div>
      {finished.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: 13,
          }}
        >
          Отчёты появятся после первого завершённого интервью
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {finished.map((s) => {
            const verdict = s.final_verdict || "";
            const verdictPill = verdict
              ? `pill ${FINAL_VERDICT_PILL[verdict as FinalVerdict]}`
              : "pill pill--accent";
            const verdictLabel = verdict
              ? FINAL_VERDICT_LABEL_RU[verdict as FinalVerdict]
              : "Завершено";
            return (
              <Link
                key={s.id}
                to={`/admin/sessions/${s.id}`}
                style={{
                  padding: "12px 20px",
                  display: "grid",
                  gridTemplateColumns: REPORTS_GRID,
                  gap: 10,
                  alignItems: "center",
                  borderBottom: "1px solid var(--bg-line)",
                  fontSize: 13,
                  cursor: "pointer",
                  minWidth: 580,
                }}
              >
                <span className="mono" style={{ color: "var(--ink-3)" }}>
                  #{s.id}
                </span>
                <div
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={s.requirements_title || ""}
                >
                  {s.requirements_title || "—"}
                </div>
                <div
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={s.user_email || ""}
                >
                  <div style={{ fontWeight: 500 }}>
                    {s.user_full_name || s.user_email || "—"}
                  </div>
                  {s.user_full_name && s.user_email && (
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {s.user_email}
                    </div>
                  )}
                </div>
                <span
                  className="mono"
                  style={{ color: "var(--ink-3)", fontSize: 12 }}
                >
                  {formatShortDate(s.finished_at ?? "")}
                </span>
                <span
                  className="mono"
                  style={{
                    color: scoreColorDash(s.score_pct),
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.score_pct == null ? "—" : `${s.score_pct.toFixed(0)}%`}
                </span>
                <span className={verdictPill}>{verdictLabel}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ASSIGNMENTS_GRID =
  "40px minmax(120px, 1.4fr) minmax(120px, 1.1fr) 90px 80px";
const REPORTS_GRID =
  "40px minmax(120px, 1.3fr) minmax(120px, 1.1fr) 90px 60px 110px";

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColorDash(pct: number | null | undefined): string {
  if (pct == null) return "var(--ink-3)";
  if (pct >= 70) return "var(--accent)";
  if (pct >= 40) return "var(--warn-fg, var(--ink-2))";
  return "var(--danger-fg)";
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
