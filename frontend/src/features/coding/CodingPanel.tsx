import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import type { SessionDetailOut, SessionItem } from "../../api/types";
import Icon from "../../components/Icon";

interface Props {
  session: SessionDetailOut;
  onSubmitted?: (item: SessionItem) => void;
}

const STARTER: Record<string, string> = {
  python: "# напиши решение здесь\n\n",
  javascript: "// напиши решение здесь\n\n",
  typescript: "// напиши решение здесь\n\n",
  go: "package main\n\nfunc main() {\n}\n",
  java: "public class Solution {\n  public static void main(String[] args) {\n  }\n}\n",
};

interface TaskResult {
  verdict: string;
  rationale: string;
  pasteChars?: number;
  codeLen?: number;
}

interface RunOutput {
  language: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  truncated: boolean;
}

export default function CodingPanel({ session, onSubmitted }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const lang = (session.coding_task_language || "python").toLowerCase();
  const codingItems = useMemo(
    () =>
      session.items
        .filter((i) => i.type === "coding")
        .sort((a, b) => a.idx - b.idx),
    [session.items],
  );

  const [activeId, setActiveId] = useState<number | null>(codingItems[0]?.id ?? null);
  const [codeById, setCodeById] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const it of codingItems) {
      init[it.id] = it.answer_text || STARTER[lang] || "";
    }
    return init;
  });
  const [resultById, setResultById] = useState<Record<number, TaskResult>>(() => {
    const init: Record<number, TaskResult> = {};
    for (const it of codingItems) {
      if (it.verdict) {
        init[it.id] = {
          verdict: it.verdict,
          rationale: it.rationale,
          pasteChars: it.paste_chars,
          codeLen: it.answer_text?.length,
        };
      }
    }
    return init;
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runOutputById, setRunOutputById] = useState<Record<number, RunOutput>>({});
  const [pasteCharsById, setPasteCharsById] = useState<Record<number, number>>({});
  const [errorById, setErrorById] = useState<Record<number, string>>({});
  const activeIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    setPasteCharsById({});
    setRunOutputById({});
  }, [session.id]);

  useEffect(() => {
    if (activeId === null && codingItems.length > 0) {
      setActiveId(codingItems[0].id);
    }
  }, [codingItems, activeId]);

  useEffect(() => {
    setCodeById((prev) => {
      const next = { ...prev };
      for (const it of codingItems) {
        if (next[it.id] === undefined) {
          next[it.id] = it.answer_text || STARTER[lang] || "";
        }
      }
      return next;
    });
  }, [codingItems, lang]);

  const active = codingItems.find((i) => i.id === activeId) ?? null;

  async function onSubmit() {
    if (!active) return;
    setBusyId(active.id);
    setErrorById((e) => ({ ...e, [active.id]: "" }));
    try {
      const r = await api.post<SessionItem>(
        `/api/sessions/${session.id}/coding/review/${active.id}`,
        {
          code: codeById[active.id] ?? "",
          paste_chars: pasteCharsById[active.id] ?? 0,
        },
      );
      setResultById((prev) => ({
        ...prev,
        [active.id]: {
          verdict: r.data.verdict || "incorrect",
          rationale: r.data.rationale,
          pasteChars: r.data.paste_chars,
          codeLen: r.data.answer_text?.length,
        },
      }));
      onSubmitted?.(r.data);
    } catch (e: any) {
      setErrorById((prev) => ({
        ...prev,
        [active.id]: e?.response?.data?.detail || "Не удалось получить ревью",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function onRun() {
    if (!active) return;
    setRunningId(active.id);
    setErrorById((e) => ({ ...e, [active.id]: "" }));
    try {
      const r = await api.post<RunOutput>(
        `/api/sessions/${session.id}/coding/run/${active.id}`,
        { code: codeById[active.id] ?? "" },
      );
      setRunOutputById((prev) => ({ ...prev, [active.id]: r.data }));
    } catch (e: any) {
      setErrorById((prev) => ({
        ...prev,
        [active.id]: e?.response?.data?.detail || "Не удалось запустить код",
      }));
    } finally {
      setRunningId(null);
    }
  }

  if (codingItems.length === 0) {
    return (
      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 20,
          fontSize: 13,
          color: "var(--ink-3)",
          height: "100%",
        }}
      >
        Кодинг-задачи отсутствуют в сессии.
      </div>
    );
  }

  const activeResult = active ? resultById[active.id] : null;
  const activeError = active ? errorById[active.id] : "";
  const activeRunOutput = active ? runOutputById[active.id] : null;

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          padding: "10px 16px 0",
          borderBottom: "1px solid var(--bg-line)",
          display: "flex",
          gap: 4,
          alignItems: "flex-end",
        }}
      >
        {codingItems.map((it, idx) => {
          const result = resultById[it.id];
          const isActive = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setActiveId(it.id)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 500,
                color: isActive ? "var(--ink-1)" : "var(--ink-3)",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${
                  isActive ? "var(--accent)" : "transparent"
                }`,
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <span className="mono" style={{ color: "var(--ink-4)" }}>
                #{idx + 1}
              </span>
              <span>{it.topic}</span>
              {result && (
                <span
                  className="dot"
                  style={{
                    background:
                      result.verdict === "correct"
                        ? "var(--accent)"
                        : result.verdict === "partial"
                          ? "var(--warn)"
                          : "var(--danger)",
                  }}
                  title={result.verdict}
                />
              )}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <span
          className="pill pill--accent"
          style={{ marginBottom: 8 }}
        >
          <Icon name="code" size={11} /> {lang}
        </span>
      </div>

      {/* Task description */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--bg-line)",
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        {active && (
          <>
            <div
              className="mono upper"
              style={{ color: "var(--accent)", marginBottom: 6 }}
            >
              {active.topic}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{active.prompt_text}</div>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "oklch(0.13 0.005 60)",
        }}
      >
        <Editor
          height="100%"
          language={lang}
          value={active ? codeById[active.id] ?? "" : ""}
          onChange={(v) => {
            if (!active) return;
            setCodeById((prev) => ({ ...prev, [active.id]: v ?? "" }));
          }}
          onMount={(editor) => {
            editor.onDidPaste((e) => {
              const id = activeIdRef.current;
              if (id === null) return;
              const model = editor.getModel();
              if (!model) return;
              const inserted = model.getValueInRange(e.range);
              const len = inserted.length;
              if (len <= 0) return;
              setPasteCharsById((prev) => ({
                ...prev,
                [id]: (prev[id] ?? 0) + len,
              }));
            });
          }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>

      {/* Footer / actions */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--bg-line)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onSubmit}
            disabled={!active || busyId !== null}
            className="btn btn--primary btn--sm"
          >
            <Icon name="check" size={11} />
            {busyId === active?.id ? "Анализ..." : "Отправить"}
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!active || runningId !== null}
            className="btn btn--sm"
            title="Запустить код в sandbox"
          >
            <Icon name="play" size={11} />
            {runningId === active?.id ? "Запуск..." : "Запустить"}
          </button>
          {activeResult && (
            <span
              className={`pill ${
                activeResult.verdict === "correct"
                  ? "pill--accent"
                  : activeResult.verdict === "partial"
                    ? "pill--warn"
                    : "pill--danger"
              }`}
            >
              {activeResult.verdict}
            </span>
          )}
          {isAdmin && activeResult && (activeResult.pasteChars ?? 0) > 0 && (
            <PasteBadge
              pasteChars={activeResult.pasteChars ?? 0}
              codeLen={activeResult.codeLen ?? 0}
            />
          )}
        </div>
        {activeError && (
          <div
            style={{
              fontSize: 12,
              color: "oklch(0.78 0.16 25)",
              padding: "8px 10px",
              background: "var(--danger-soft)",
              border: "1px solid oklch(0.40 0.10 25)",
              borderRadius: "var(--r-2)",
            }}
          >
            {activeError}
          </div>
        )}
        {activeRunOutput && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              exit={activeRunOutput.exit_code} · {activeRunOutput.duration_ms} мс
              {activeRunOutput.timed_out && " · TIMEOUT"}
              {activeRunOutput.truncated && " · вывод обрезан"}
            </div>
            {activeRunOutput.stdout && (
              <pre
                style={{
                  background: "oklch(0.13 0.005 60)",
                  color: "var(--accent)",
                  fontSize: 11,
                  padding: 10,
                  borderRadius: "var(--r-2)",
                  border: "1px solid var(--bg-line)",
                  maxHeight: 160,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {activeRunOutput.stdout}
              </pre>
            )}
            {activeRunOutput.stderr && (
              <pre
                style={{
                  background: "var(--danger-soft)",
                  color: "oklch(0.85 0.20 25)",
                  fontSize: 11,
                  padding: 10,
                  borderRadius: "var(--r-2)",
                  border: "1px solid oklch(0.40 0.10 25)",
                  maxHeight: 160,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {activeRunOutput.stderr}
              </pre>
            )}
          </div>
        )}
        {activeResult?.rationale && (
          <div className="insight" style={{ fontSize: 12 }}>
            <div className="insight__icon">i</div>
            <div style={{ flex: 1, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>
              {activeResult.rationale}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PasteBadge({
  pasteChars,
  codeLen,
}: {
  pasteChars: number;
  codeLen: number;
}) {
  const ratio = codeLen > 0 ? pasteChars / codeLen : 0;
  const percent = Math.round(ratio * 100);
  const heavy = ratio >= 0.7;
  return (
    <span
      title={`Вставлено ${pasteChars} символов из ${codeLen} (~${percent}%)`}
      className={`pill ${heavy ? "pill--danger" : "pill--warn"}`}
    >
      📋 буфер: {pasteChars} симв · {percent}%
    </span>
  );
}
