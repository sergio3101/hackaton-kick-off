import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { RequirementsOut, RequirementsStatsOut } from "../api/types";
import Icon from "../components/Icon";

export default function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
  });

  const statsQueries = useQueries({
    queries: (data || []).map((r) => ({
      queryKey: ["requirements-stats", r.id],
      queryFn: async () =>
        (await api.get<RequirementsStatsOut>(`/api/requirements/${r.id}/stats`)).data,
      enabled: !!r.id,
    })),
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
            PROJECTS · {data?.length ?? 0}
          </div>
          <h1 className="page-title">Проекты</h1>
          <div className="page-sub">
            Загруженные ТЗ и сгенерированные банки вопросов.
          </div>
        </div>
        <Link to="/upload" className="btn btn--primary">
          <Icon name="plus" size={14} /> Новый проект
        </Link>
      </div>

      {isLoading && (
        <div className="card" style={{ color: "var(--ink-3)", textAlign: "center" }}>
          Загрузка...
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--ink-3)",
          }}
        >
          У вас ещё нет загруженных проектов.
          <div style={{ marginTop: 14 }}>
            <Link to="/upload" className="btn btn--primary">
              <Icon name="upload" size={14} /> Загрузить .md артефакты
            </Link>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 14,
        }}
      >
        {data?.map((r, idx) => {
          const stats = statsQueries[idx]?.data;
          return (
            <div key={r.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      margin: 0,
                    }}
                  >
                    {r.title}
                  </h3>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}
                  >
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>
              </div>

              {stats && stats.sessions_total > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <span className="mono" style={{ color: "var(--ink-1)" }}>
                      {stats.sessions_total}
                    </span>{" "}
                    сессий
                  </span>
                  {stats.sessions_finished > 0 && (
                    <span>
                      score{" "}
                      <span className="mono" style={{ color: "var(--accent)" }}>
                        {Math.round(stats.avg_score * 100)}%
                      </span>
                    </span>
                  )}
                  {stats.last_session_at && (
                    <span>{timeAgo(stats.last_session_at)}</span>
                  )}
                </div>
              )}

              {r.summary && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    margin: "0 0 12px",
                  }}
                >
                  {r.summary}
                </p>
              )}

              {r.topics.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                  {r.topics.slice(0, 8).map((t) => (
                    <span key={t.name} className="tag">
                      {t.name}
                    </span>
                  ))}
                  {r.topics.length > 8 && (
                    <span className="tag">+{r.topics.length - 8}</span>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  to={`/requirements/${r.id}`}
                  className="btn btn--sm"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Открыть
                </Link>
                <Link
                  to={`/admin/assignments?new=1&requirements_id=${r.id}`}
                  className="btn btn--primary btn--sm"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Icon name="tag" size={11} /> Назначить
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн назад`;
  const months = Math.floor(days / 30);
  return `${months} мес назад`;
}
