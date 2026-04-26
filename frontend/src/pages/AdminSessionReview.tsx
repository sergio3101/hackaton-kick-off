import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { verdictLabel, type ReportOut } from "../api/types";
import Icon from "../components/Icon";
import { PasteBadge } from "../features/coding/PasteBadge";

export default function AdminSessionReview() {
  const { id } = useParams<{ id: string }>();
  const sid = Number(id);
  const qc = useQueryClient();

  const reportQ = useQuery({
    queryKey: ["admin", "session-report", sid],
    queryFn: async () => (await api.get<ReportOut>(`/api/admin/sessions/${sid}`)).data,
    enabled: !!sid,
  });

  const invalidateAfterPublishToggle = () => {
    qc.invalidateQueries({ queryKey: ["admin", "session-report", sid] });
    qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };
  const publishM = useMutation({
    mutationFn: async () => (await api.post(`/api/admin/sessions/${sid}/publish`)).data,
    onSuccess: invalidateAfterPublishToggle,
  });
  const unpublishM = useMutation({
    mutationFn: async () => (await api.delete(`/api/admin/sessions/${sid}/publish`)).data,
    onSuccess: invalidateAfterPublishToggle,
  });

  if (reportQ.isLoading) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка...
      </div>
    );
  }
  if (!reportQ.data) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Сессия не найдена.
      </div>
    );
  }

  const { session, summary, items } = reportQ.data;
  const isFinished = session.status === "finished";
  const isPublished = !!session.published_at;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8 }}
          >
            ADMIN · SESSION REVIEW · #{session.id}
          </div>
          <h1 className="page-title">
            Сессия #{session.id} · {session.selected_level}
          </h1>
          <div className="page-sub">
            Статус: <span className="mono">{session.status}</span> · темы:{" "}
            {session.selected_topics.join(", ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to="/admin/assignments" className="btn btn--sm">
            ← К назначениям
          </Link>
          {isPublished && (
            <span className="pill pill--accent">
              <Icon name="check" size={11} /> Опубликовано
            </span>
          )}
          {isFinished && !isPublished && (
            <button
              type="button"
              onClick={() => publishM.mutate()}
              disabled={publishM.isPending}
              className="btn btn--primary"
            >
              {publishM.isPending ? "Публикую..." : "Опубликовать"}
            </button>
          )}
          {isPublished && (
            <button
              type="button"
              onClick={() => unpublishM.mutate()}
              disabled={unpublishM.isPending}
              className="btn"
            >
              {unpublishM.isPending ? "..." : "Отозвать"}
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Stat label="Верно" value={summary.correct} color="var(--accent)" />
            <Stat label="Частично" value={summary.partial} color="var(--warn)" />
            <Stat label="Неверно" value={summary.incorrect} color="var(--danger)" />
            <Stat label="Пропущено" value={summary.skipped} color="var(--ink-3)" />
            <Stat
              label="cost · LLM/TTS/STT"
              value={
                reportQ.data?.total_cost_usd
                  ? `$${reportQ.data.total_cost_usd.toFixed(4)}`
                  : "—"
              }
              color="var(--warn)"
            />
          </div>
          {summary.overall && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                whiteSpace: "pre-wrap",
                paddingTop: 12,
                borderTop: "1px solid var(--bg-line)",
              }}
            >
              {summary.overall}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                className="mono upper"
                style={{ color: "var(--accent)" }}
              >
                [{it.type}] {it.topic}{" "}
                {it.verdict && (
                  <span style={{ color: "var(--ink-3)" }}>· {verdictLabel(it.verdict)}</span>
                )}
              </div>
              {it.type === "coding" && (it.paste_chars ?? 0) > 0 && (
                <PasteBadge
                  pasteChars={it.paste_chars ?? 0}
                  codeLen={it.answer_text?.length ?? 0}
                />
              )}
            </div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{it.prompt_text}</div>
            {it.answer_text && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  whiteSpace: "pre-wrap",
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--bg-line)",
                  borderRadius: "var(--r-2)",
                  marginBottom: 8,
                }}
              >
                <span className="mono upper" style={{ color: "var(--ink-3)" }}>
                  ОТВЕТ
                </span>
                <div style={{ marginTop: 4 }}>{it.answer_text}</div>
              </div>
            )}
            {it.rationale && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-2)",
                  marginBottom: 8,
                }}
              >
                <span className="mono upper" style={{ color: "var(--ink-3)" }}>
                  ОБОСНОВАНИЕ
                </span>
                <div style={{ marginTop: 4 }}>{it.rationale}</div>
              </div>
            )}
            {it.expected_answer && (
              <details style={{ fontSize: 13 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  Эталон
                </summary>
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    background: "var(--accent-soft)",
                    color: "var(--ink-1)",
                    borderRadius: "var(--r-2)",
                    border: "1px solid var(--accent-border)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {it.expected_answer}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--bg-line)",
        borderRadius: "var(--r-2)",
        padding: "12px 14px",
        textAlign: "center",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 24,
          fontWeight: 500,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        className="mono upper"
        style={{ color: "var(--ink-3)", marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}
