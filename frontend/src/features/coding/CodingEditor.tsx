import Editor, { type OnMount } from "@monaco-editor/react";

import { verdictLabel } from "../../api/types";
import { useAuth } from "../../auth/AuthProvider";
import Icon from "../../components/Icon";
import { useTheme } from "../../theme/theme";
import { PasteBadge } from "./PasteBadge";
import type { CodingState } from "./useCodingState";

interface Props {
  state: CodingState;
  onMonacoMount?: OnMount;
  onSubmit: () => void;
  frozen?: boolean;
}

export default function CodingEditor({
  state,
  onMonacoMount,
  onSubmit,
  frozen = false,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [theme] = useTheme();
  const monacoTheme = theme === "light" ? "vs-light" : "vs-dark";

  const {
    codingItems,
    langFor,
    activeId,
    setActiveId,
    codeById,
    setCode,
    resultById,
    pasteCharsById,
    busyId,
    activeIdRef,
    addPasteChars,
  } = state;

  const active = codingItems.find((i) => i.id === activeId) ?? null;
  const activeLang = active ? langFor(active) : "plaintext";
  const alreadySubmitted = !!(active && resultById[active.id]);

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

  return (
    <div
      className="card ce-stack"
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
        <span className="pill pill--accent" style={{ marginBottom: 8 }}>
          <Icon name="code" size={11} /> {activeLang}
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
          background: "var(--editor-bg)",
        }}
      >
        {/* key={active?.id} — пересоздаём Editor при переключении таба.
            Без этого @monaco-editor/react держит одну модель и при гонке
            language+value показывает код от предыдущего таба. */}
        <Editor
          key={active?.id ?? "empty"}
          height="100%"
          language={activeLang}
          value={active ? codeById[active.id] ?? "" : ""}
          onChange={(v) => {
            if (!active) return;
            setCode(active.id, v ?? "");
          }}
          onMount={(editor, monaco) => {
            editor.onDidPaste((e) => {
              const id = activeIdRef.current;
              if (id === null) return;
              const model = editor.getModel();
              if (!model) return;
              const inserted = model.getValueInRange(e.range);
              addPasteChars(id, inserted.length);
            });
            onMonacoMount?.(editor, monaco);
          }}
          theme={monacoTheme}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            fontFamily: "var(--font-mono)",
            readOnly: frozen || alreadySubmitted,
          }}
        />
      </div>

      {/* Footer / actions */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--bg-line)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={
            !active || busyId !== null || frozen || alreadySubmitted
          }
          className="btn btn--primary btn--sm"
          title={
            alreadySubmitted
              ? "Решение уже отправлено на проверку"
              : undefined
          }
        >
          <Icon name="check" size={11} />
          {busyId === active?.id
            ? "Анализ..."
            : alreadySubmitted
              ? "Отправлено"
              : "Отправить"}
        </button>
        <button
          type="button"
          onClick={() => state.run()}
          disabled={
            !active || state.runningId !== null || frozen || alreadySubmitted
          }
          className="btn btn--sm"
          title="Запустить код в sandbox"
        >
          <Icon name="play" size={11} />
          {state.runningId === active?.id ? "Запуск..." : "Запустить"}
        </button>
        {frozen && (
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--danger)", marginLeft: 8 }}
          >
            ⏱ ВРЕМЯ СЕССИИ ИСТЕКЛО
          </span>
        )}
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
            {verdictLabel(activeResult.verdict)}
          </span>
        )}
        {isAdmin && activeResult && (activeResult.pasteChars ?? 0) > 0 && (
          <PasteBadge
            pasteChars={activeResult.pasteChars ?? 0}
            codeLen={activeResult.codeLen ?? 0}
          />
        )}
        {pasteCharsById[active?.id ?? -1] && !activeResult && (
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: "auto" }}
            title="Будет учтено после отправки"
          >
            📋 paste: {pasteCharsById[active?.id ?? -1]} симв
          </span>
        )}
      </div>
    </div>
  );
}
