import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type {
  BankQuestion,
  Level,
  RequirementsDetailOut,
  SessionOut,
} from "../api/types";
import Icon from "../components/Icon";
import { StatusPill } from "../components/UI";

const LEVELS: Level[] = ["junior", "middle", "senior"];

export default function RequirementsDetail() {
  const { id } = useParams();
  const reqId = Number(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", reqId],
    queryFn: async () =>
      (await api.get<RequirementsDetailOut>(`/api/requirements/${reqId}`)).data,
    enabled: Number.isFinite(reqId),
  });

  const sessionsQ = useQuery({
    queryKey: ["sessions", "by-req", reqId],
    queryFn: async () =>
      (await api.get<SessionOut[]>(`/api/sessions?requirements_id=${reqId}`)).data,
    enabled: Number.isFinite(reqId),
  });

  const renameMut = useMutation({
    mutationFn: async (title: string) =>
      (await api.patch<RequirementsDetailOut>(`/api/requirements/${reqId}`, { title })).data,
    onSuccess: (d) => {
      qc.setQueryData(["requirements", reqId], d);
      qc.invalidateQueries({ queryKey: ["requirements"] });
      setEditing(false);
    },
  });

  const summaryMut = useMutation({
    mutationFn: async (summary: string) =>
      (await api.patch<RequirementsDetailOut>(`/api/requirements/${reqId}`, { summary })).data,
    onSuccess: (d) => {
      qc.setQueryData(["requirements", reqId], d);
      qc.invalidateQueries({ queryKey: ["requirements"] });
      setEditingSummary(false);
    },
  });

  const regenerateMut = useMutation({
    mutationFn: async (questionsPerPair: number) =>
      (
        await api.post<RequirementsDetailOut>(
          `/api/requirements/${reqId}/regenerate`,
          { questions_per_pair: questionsPerPair },
        )
      ).data,
    onSuccess: (d) => {
      qc.setQueryData(["requirements", reqId], d);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/requirements/${reqId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      navigate("/projects");
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Map<Level, BankQuestion[]>>();
    for (const q of data?.bank ?? []) {
      const t = map.get(q.topic) ?? new Map<Level, BankQuestion[]>();
      const arr = t.get(q.level) ?? [];
      arr.push(q);
      t.set(q.level, arr);
      map.set(q.topic, t);
    }
    return map;
  }, [data?.bank]);

  const expectedPerPair = useMemo(() => {
    let max = 0;
    for (const byLevel of grouped.values()) {
      for (const arr of byLevel.values()) {
        if (arr.length > max) max = arr.length;
      }
    }
    return max > 0 ? max : 5;
  }, [grouped]);

  if (isLoading || !data) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8 }}
          >
            REQUIREMENTS · {data.topics.length} ТЕМ · {data.bank.length} ВОПРОСОВ
          </div>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (titleDraft.trim()) renameMut.mutate(titleDraft.trim());
              }}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="input"
                style={{ fontSize: 22, fontWeight: 500, flex: 1 }}
                maxLength={255}
              />
              <button
                type="submit"
                disabled={renameMut.isPending}
                className="btn btn--primary btn--sm"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn--sm"
              >
                Отмена
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {data.title}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(data.title);
                  setEditing(true);
                }}
                className="btn btn--sm btn--ghost"
                title="Переименовать"
              >
                <Icon name="edit" size={11} />
              </button>
            </div>
          )}
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}
          >
            создан {new Date(data.created_at).toLocaleString("ru-RU")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              const raw = prompt(
                "Сколько вопросов на пару тема × уровень? (1–10)\nСуществующий банк будет заменён.",
                "5",
              );
              if (raw === null) return;
              const n = Number(raw);
              if (!Number.isFinite(n) || n < 1 || n > 10) {
                alert("Введите целое число от 1 до 10");
                return;
              }
              regenerateMut.mutate(Math.round(n));
            }}
            disabled={regenerateMut.isPending}
            className="btn"
          >
            <Icon name="refresh" size={13} />
            {regenerateMut.isPending ? "Генерирую..." : "Перегенерировать"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Удалить проект безвозвратно? Все связанные сессии и отчёты тоже будут удалены.",
                )
              ) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
            className="btn btn--danger"
          >
            <Icon name="trash" size={13} /> Удалить
          </button>
          <Link to="/admin/assignments" className="btn btn--primary">
            <Icon name="tag" size={13} /> Назначить пользователю
          </Link>
        </div>
      </div>

      {regenerateMut.isError && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--danger-soft)",
            border: "1px solid oklch(0.40 0.10 25)",
            borderRadius: "var(--r-2)",
            color: "oklch(0.78 0.16 25)",
            fontSize: 13,
          }}
        >
          Не удалось перегенерировать банк. Попробуйте ещё раз.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        {/* Left: Summary + Bank */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontWeight: 500 }}>Описание проекта</span>
              {!editingSummary && (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryDraft(data.summary || "");
                    setEditingSummary(true);
                  }}
                  className="btn btn--sm btn--ghost"
                >
                  <Icon name="edit" size={11} />
                  {data.summary ? "редактировать" : "добавить"}
                </button>
              )}
            </div>
            {editingSummary ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  summaryMut.mutate(summaryDraft);
                }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <textarea
                  autoFocus
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  rows={8}
                  maxLength={10000}
                  className="input textarea"
                  style={{ resize: "vertical" }}
                  placeholder="Краткое описание проекта — задача, стек, ключевые компоненты..."
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-4)" }}
                  >
                    {summaryDraft.length} / 10000
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setEditingSummary(false)}
                      className="btn btn--sm"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={summaryMut.isPending}
                      className="btn btn--primary btn--sm"
                    >
                      {summaryMut.isPending ? "Сохраняю..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              </form>
            ) : data.summary ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  lineHeight: 1.65,
                  whiteSpace: "pre-line",
                  margin: 0,
                }}
              >
                {data.summary}
              </p>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-4)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                Описание не задано.
              </p>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--bg-line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                Банк вопросов ({data.bank.length})
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
              >
                ~{data.topics.length * 3 * expectedPerPair} ожидается
              </span>
            </div>

            {data.topics.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  fontSize: 13,
                  color: "var(--ink-3)",
                }}
              >
                Сначала загрузите темы.
              </div>
            ) : (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {data.topics.map((t) => {
                  const byLevel = grouped.get(t.name);
                  const totalCount = LEVELS.reduce(
                    (acc, lvl) => acc + (byLevel?.get(lvl)?.length ?? 0),
                    0,
                  );
                  return (
                    <details
                      key={t.name}
                      style={{
                        border: "1px solid var(--bg-line)",
                        borderRadius: "var(--r-2)",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          listStyle: "none",
                        }}
                      >
                        <span>{t.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                          {totalCount} вопр.
                        </span>
                      </summary>
                      <div
                        style={{
                          padding: "0 14px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {LEVELS.map((lvl) => {
                          const items = byLevel?.get(lvl) ?? [];
                          const ok = items.length >= expectedPerPair;
                          return (
                            <div key={lvl}>
                              <div
                                className="mono upper"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 6,
                                  color: "var(--ink-3)",
                                }}
                              >
                                <span>{lvl}</span>
                                <span
                                  className={`pill ${
                                    ok
                                      ? "pill--accent"
                                      : items.length > 0
                                        ? "pill--warn"
                                        : "pill--danger"
                                  }`}
                                >
                                  {items.length}/{expectedPerPair}
                                </span>
                              </div>
                              {items.length === 0 ? (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--ink-4)",
                                    fontStyle: "italic",
                                  }}
                                >
                                  — нет вопросов —
                                </div>
                              ) : (
                                <ol
                                  style={{
                                    fontSize: 13,
                                    color: "var(--ink-2)",
                                    paddingLeft: 18,
                                    margin: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                  }}
                                >
                                  {items.map((q) => (
                                    <li key={q.id} style={{ lineHeight: 1.55 }}>
                                      {q.prompt}
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Topics + Sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card__label">Темы ({data.topics.length})</div>
            {data.topics.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Темы не извлечены.
              </div>
            ) : (
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {data.topics.map((t) => (
                  <li
                    key={t.name}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--bg-line)",
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                    {t.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink-3)",
                          marginTop: 4,
                          lineHeight: 1.45,
                        }}
                      >
                        {t.description}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--bg-line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                Сессии · {sessionsQ.data?.length ?? 0}
              </span>
              <Link to="/admin/assignments" className="btn btn--sm">
                <Icon name="tag" size={11} /> Назначить
              </Link>
            </div>
            {sessionsQ.isLoading && (
              <div
                style={{
                  padding: 20,
                  fontSize: 13,
                  color: "var(--ink-3)",
                }}
              >
                Загрузка...
              </div>
            )}
            {!sessionsQ.isLoading && (sessionsQ.data?.length ?? 0) === 0 && (
              <div
                style={{
                  padding: 20,
                  fontSize: 13,
                  color: "var(--ink-3)",
                  textAlign: "center",
                }}
              >
                По этому проекту ещё не было сессий.
              </div>
            )}
            {(sessionsQ.data?.length ?? 0) > 0 &&
              sessionsQ.data?.map((s) => (
                <Link
                  key={s.id}
                  to={
                    s.status === "finished"
                      ? `/sessions/${s.id}/report`
                      : `/admin/sessions/${s.id}`
                  }
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>
                        #{s.id}
                      </span>{" "}
                      {s.selected_level}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(s.created_at).toLocaleString("ru-RU")} · {s.mode}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
