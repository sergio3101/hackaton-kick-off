import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { SessionOut } from "../api/types";
import Icon from "../components/Icon";
import { StatusPill } from "../components/UI";

type FilterKey = "all" | "active" | "finished" | "draft";

export default function Sessions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<SessionOut[]>("/api/sessions")).data,
  });

  const sessions = data ?? [];
  const [q, setQ] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => {
    return {
      all: sessions.length,
      active: sessions.filter((s) => s.status === "active").length,
      finished: sessions.filter((s) => s.status === "finished").length,
      draft: sessions.filter((s) => s.status === "draft").length,
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => {
        if (filter !== "all" && s.status !== filter) return false;
        if (q && !semantic) {
          const hay = [
            "#" + s.id,
            s.selected_topics.join(" "),
            s.selected_level,
            s.mode,
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q.toLowerCase());
        }
        return true;
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [sessions, filter, q, semantic]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
            HISTORY · {sessions.length} СЕССИЙ
          </div>
          <h1 className="page-title">
            {isAdmin ? "История сессий" : "Мои отчёты"}
          </h1>
          <div className="page-sub">
            {isAdmin
              ? "Полнотекстовый и семантический поиск по транскриптам, фильтры и быстрые экспорты."
              : "Опубликованные отчёты по вашим кикоффам."}
          </div>
        </div>
        {isAdmin && (
          <Link to="/admin/assignments" className="btn btn--primary">
            <Icon name="tag" size={14} /> Назначить kick-off
          </Link>
        )}
      </div>

      {/* Search & filters */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div className="search" style={{ flex: 1 }}>
            <span className="search__icon">
              <Icon name={semantic ? "sparkle" : "search"} size={14} />
            </span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                semantic
                  ? "найди, где обсуждали сроки запуска…"
                  : "поиск по проекту, темам, кандидатам…"
              }
            />
            <span className="search__kbd">⌘K</span>
          </div>
          <button
            type="button"
            onClick={() => setSemantic((s) => !s)}
            className="btn"
            style={
              semantic
                ? {
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    borderColor: "var(--accent)",
                  }
                : {}
            }
          >
            <Icon name="sparkle" size={13} />
            Семантический
          </button>
          <button type="button" className="btn">
            <Icon name="filter" size={13} />
            Фильтры
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              { k: "all" as const, n: `Все · ${counts.all}` },
              { k: "active" as const, n: `В эфире · ${counts.active}` },
              { k: "finished" as const, n: `Завершено · ${counts.finished}` },
              { k: "draft" as const, n: `Черновики · ${counts.draft}` },
            ] satisfies { k: FilterKey; n: string }[]
          ).map((f) => (
            <button
              key={f.k}
              type="button"
              onClick={() => setFilter(f.k)}
              className="pill"
              style={{
                cursor: "pointer",
                padding: "5px 12px",
                background: filter === f.k ? "var(--accent)" : "var(--bg-2)",
                color: filter === f.k ? "var(--accent-ink)" : "var(--ink-2)",
                borderColor: filter === f.k ? "var(--accent)" : "var(--bg-line)",
              }}
            >
              {f.n}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="card" style={{ color: "var(--ink-3)", textAlign: "center" }}>
          Загрузка...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--ink-3)",
          }}
        >
          {sessions.length === 0
            ? isAdmin
              ? "Пока нет ни одной сессии."
              : "Опубликованных отчётов пока нет."
            : "По заданным фильтрам ничего не найдено."}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <Link to="/upload" className="btn btn--primary btn--sm">
                <Icon name="upload" size={12} /> Загрузить ТЗ
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid var(--bg-line)",
              display: "grid",
              gridTemplateColumns: "60px 1fr 160px 100px 100px 100px",
              gap: 16,
              alignItems: "center",
            }}
          >
            {["#", "Темы / режим", "Дата", "Длительность", "Уровень", "Статус"].map(
              (h) => (
                <div
                  key={h}
                  className="mono upper"
                  style={{ color: "var(--ink-3)" }}
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={
                s.status === "finished"
                  ? `/sessions/${s.id}/report`
                  : isAdmin
                    ? `/admin/sessions/${s.id}`
                    : `/sessions/${s.id}/interview`
              }
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--bg-line)",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "60px 1fr 160px 100px 100px 100px",
                gap: 16,
                alignItems: "center",
              }}
            >
              <span className="mono" style={{ color: "var(--ink-3)" }}>
                #{s.id}
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>
                  {s.selected_topics.join(", ") || "—"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {s.mode}
                </div>
              </div>
              <span
                className="mono"
                style={{ color: "var(--ink-3)", fontSize: 12 }}
              >
                {new Date(s.created_at).toLocaleString("ru-RU")}
              </span>
              <span
                className="mono"
                style={{ fontSize: 12, color: "var(--ink-3)" }}
              >
                {s.target_duration_min} мин
              </span>
              <span className="pill" style={{ justifyContent: "center" }}>
                {s.selected_level}
              </span>
              <StatusPill status={s.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
