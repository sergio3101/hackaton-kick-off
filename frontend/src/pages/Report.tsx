import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import Icon from "../components/Icon";
import { Kpi } from "../components/UI";
import { PasteBadge } from "../features/coding/PasteBadge";
import { VERDICT_LABEL_RU, type ReportOut, type Verdict } from "../api/types";

const VERDICT_PILL: Record<Verdict, string> = {
  correct: "pill--accent",
  partial: "pill--warn",
  incorrect: "pill--danger",
  skipped: "",
};

type Tab = "summary" | "voice" | "coding";

export default function Report() {
  const { id } = useParams();
  const sessionId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: async () =>
      (await api.get<ReportOut>(`/api/sessions/${sessionId}/report`)).data,
    enabled: Number.isFinite(sessionId),
    retry: false,
  });
  const status = (error as any)?.response?.status;

  async function downloadPdf() {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const r = await api.get(`/api/sessions/${sessionId}/report.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Сессия истекла — войдите заново"
          : status === 404
            ? "Отчёт не найден"
            : "Не удалось сформировать PDF — попробуйте ещё раз";
      setPdfError(msg);
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка...
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="mono upper" style={{ color: "var(--warn)", marginBottom: 8 }}>
              ОТЧЁТ В ПРОЦЕССЕ ПУБЛИКАЦИИ
            </div>
            <h1 className="page-title">Отчёт ещё не опубликован</h1>
            <div className="page-sub" style={{ maxWidth: 520 }}>
              Спасибо, ответы записаны. Администратор просмотрит результаты и опубликует
              отчёт — после этого вы увидите его в разделе «Мои кикоффы».
            </div>
          </div>
        </div>
        <Link to="/me/assignments" className="btn btn--primary">
          <Icon name="arrow-right" size={14} /> К моим кикоффам
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center", color: "var(--ink-3)" }}>
          Отчёт недоступен.
          <div style={{ marginTop: 12 }}>
            <Link
              to={isAdmin ? "/sessions" : "/me/assignments"}
              className="btn btn--sm"
            >
              ← Назад
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = data.summary;
  const total =
    (summary?.correct ?? 0) +
    (summary?.partial ?? 0) +
    (summary?.incorrect ?? 0) +
    (summary?.skipped ?? 0);
  const score =
    total > 0
      ? ((summary?.correct ?? 0) + (summary?.partial ?? 0) * 0.5) / total
      : 0;

  const voiceItems = data.items.filter((i) => i.type === "voice");
  const codingItems = data.items.filter((i) => i.type === "coding");
  const voiceCount = voiceItems.length;
  const answeredCount = voiceItems.filter((i) => i.verdict && i.verdict !== "skipped").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8 }}
          >
            HISTORY · SESSION #{data.session.id} · REPORT
          </div>
          <h1 className="page-title">Отчёт по интервью #{data.session.id}</h1>
          <div className="page-sub">
            {new Date(data.session.created_at).toLocaleString("ru-RU")} · уровень{" "}
            <span className="mono" style={{ color: "var(--accent)" }}>
              {data.session.selected_level}
            </span>{" "}
            · режим {data.session.mode} · темы:{" "}
            {data.session.selected_topics.join(", ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="btn"
          >
            <Icon name="doc" size={13} />
            {downloadingPdf ? "Готовлю..." : "PDF"}
          </button>
          {isAdmin && (
            <Link
              to={`/admin/sessions/${data.session.id}`}
              className="btn btn--primary"
            >
              <Icon name="settings" size={13} /> Ревью администратора
            </Link>
          )}
        </div>
      </div>

      {pdfError && (
        <div
          className="state-block state-block--danger"
          style={{ marginBottom: 16, fontSize: 13 }}
        >
          <span>{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError(null)}
            className="state-block__close"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* KPI */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${isAdmin ? 4 : 3}, 1fr)`,
            gap: 14,
            marginBottom: 18,
          }}
        >
          <Kpi
            label="Score"
            value={`${Math.round(score * 100)}%`}
            hint={`${total} пунктов`}
          />
          <Kpi
            label="Покрытие"
            value={`${answeredCount}/${voiceCount}`}
            hint="вопросов задано"
          />
          <Kpi
            label="Верно"
            value={summary.correct}
            hint={`${summary.partial} частично`}
          />
          {isAdmin && (
            <Kpi
              label="Стоимость"
              value={
                data.total_cost_usd
                  ? `$${data.total_cost_usd.toFixed(4)}`
                  : "—"
              }
              hint="LLM/TTS/STT"
              sparkColor="var(--warn)"
            />
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--bg-line)",
          marginBottom: 18,
        }}
      >
        {(
          [
            { k: "summary" as const, l: "Резюме" },
            { k: "voice" as const, l: `Голос · ${voiceCount}` },
            { k: "coding" as const, l: `Кодинг · ${codingItems.length}` },
          ] satisfies { k: Tab; l: string }[]
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: tab === t.k ? "var(--ink-1)" : "var(--ink-3)",
              marginBottom: -1,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${
                tab === t.k ? "var(--accent)" : "transparent"
              }`,
              cursor: "pointer",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "summary" && summary && (
        <div className="card">
          <div
            style={{
              fontWeight: 500,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="sparkle" size={14} />
            AI-резюме
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--ink-2)",
              whiteSpace: "pre-wrap",
            }}
          >
            {summary.overall || "Резюме не сформировано"}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <VerdictStat
              label="Верно"
              value={summary.correct}
              color="var(--accent)"
            />
            <VerdictStat
              label="Частично"
              value={summary.partial}
              color="var(--warn)"
            />
            <VerdictStat
              label="Неверно"
              value={summary.incorrect}
              color="var(--danger)"
            />
            <VerdictStat
              label="Пропущено"
              value={summary.skipped}
              color="var(--ink-3)"
            />
          </div>
        </div>
      )}

      {tab === "voice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {voiceItems.length === 0 ? (
            <div
              className="card"
              style={{ color: "var(--ink-3)", textAlign: "center" }}
            >
              Голосовых вопросов в сессии нет.
            </div>
          ) : (
            voiceItems.map((item) => (
              <div key={item.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      className="mono upper"
                      style={{ color: "var(--accent)", marginBottom: 4 }}
                    >
                      {item.topic}
                    </div>
                    <div style={{ fontWeight: 500 }}>{item.prompt_text}</div>
                  </div>
                  {item.verdict && (
                    <span className={`pill ${VERDICT_PILL[item.verdict]}`}>
                      {VERDICT_LABEL_RU[item.verdict]}
                    </span>
                  )}
                </div>
                <ReportBlock label="Ответ кандидата">
                  {item.answer_text || "(пусто)"}
                </ReportBlock>
                {item.rationale && (
                  <ReportBlock label="Обоснование">{item.rationale}</ReportBlock>
                )}
                {item.explanation && (
                  <ReportBlock label="Что упущено" variant="warn">
                    {item.explanation}
                  </ReportBlock>
                )}
                {item.expected_answer && (
                  <ReportBlock label="Эталонный ответ" variant="accent">
                    {item.expected_answer}
                  </ReportBlock>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "coding" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {codingItems.length === 0 ? (
            <div
              className="card"
              style={{ color: "var(--ink-3)", textAlign: "center" }}
            >
              Кодинг-задач в сессии нет.
            </div>
          ) : (
            codingItems.map((item) => (
              <div key={item.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      className="mono upper"
                      style={{ color: "var(--accent)", marginBottom: 4 }}
                    >
                      {item.topic}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.prompt_text}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    {item.verdict && (
                      <span className={`pill ${VERDICT_PILL[item.verdict]}`}>
                        {VERDICT_LABEL_RU[item.verdict]}
                      </span>
                    )}
                    {isAdmin && (item.paste_chars ?? 0) > 0 && (
                      <PasteBadge
                        pasteChars={item.paste_chars ?? 0}
                        codeLen={item.answer_text?.length ?? 0}
                      />
                    )}
                  </div>
                </div>
                {item.answer_text && (
                  <pre
                    style={{
                      background: "var(--editor-bg)",
                      color: "var(--ink-1)",
                      fontSize: 12,
                      padding: 12,
                      borderRadius: "var(--r-2)",
                      border: "1px solid var(--bg-line)",
                      overflow: "auto",
                      margin: "0 0 12px",
                      fontFamily: "var(--font-mono)",
                      lineHeight: 1.55,
                    }}
                  >
                    {item.answer_text}
                  </pre>
                )}
                {item.rationale && (
                  <ReportBlock label="Обоснование">{item.rationale}</ReportBlock>
                )}
                {item.explanation && (
                  <ReportBlock label="Что упущено" variant="warn">
                    {item.explanation}
                  </ReportBlock>
                )}
                {item.expected_answer && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      className="mono upper"
                      style={{ color: "var(--accent)", marginBottom: 6 }}
                    >
                      Эталонное решение
                    </div>
                    <pre
                      style={{
                        background: "var(--editor-bg)",
                        color: "var(--accent)",
                        fontSize: 12,
                        padding: 12,
                        borderRadius: "var(--r-2)",
                        border: "1px solid var(--accent-border)",
                        overflow: "auto",
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.55,
                      }}
                    >
                      {item.expected_answer}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function VerdictStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
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

function ReportBlock({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "warn" | "accent";
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "var(--bg-2)",
      borderColor: "var(--bg-line)",
      color: "var(--ink-1)",
    },
    warn: {
      background: "var(--warn-soft)",
      borderColor: "var(--warn-border)",
      color: "var(--warn)",
    },
    accent: {
      background: "var(--accent-soft)",
      borderColor: "var(--accent-border)",
      color: "var(--accent)",
    },
  };
  return (
    <div style={{ marginTop: 10 }}>
      <div
        className="mono upper"
        style={{ color: "var(--ink-3)", marginBottom: 6 }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "var(--r-2)",
          border: "1px solid",
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          ...styles[variant],
        }}
      >
        {children}
      </div>
    </div>
  );
}
