import { verdictLabel } from "../../api/types";
import Icon from "../../components/Icon";
import type { CodingState } from "./useCodingState";

interface Props {
  state: CodingState;
}

export default function CodingResults({ state }: Props) {
  const { codingItems, activeId, setActiveId, resultById, runOutputById, errorById, busyId, runningId } = state;

  const active = codingItems.find((i) => i.id === activeId) ?? null;

  if (codingItems.length === 0) {
    return (
      <div
        className="card"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-3)",
          fontSize: 13,
          textAlign: "center",
          padding: 20,
        }}
      >
        Кодинг-задач в этой сессии нет.
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
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header — список задач + статусы */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--bg-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono upper" style={{ color: "var(--ink-3)" }}>
            CODING RESULTS
          </span>
          <span className="pill">
            {Object.values(resultById).filter((r) => r.verdict === "correct").length}
            /{codingItems.length}
          </span>
        </div>
      </div>

      {/* Tabs/quick switcher по задачам */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--bg-line)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
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
              className="pill"
              style={{
                cursor: "pointer",
                padding: "5px 10px",
                background: isActive ? "var(--accent)" : "var(--bg-2)",
                color: isActive ? "var(--accent-ink)" : "var(--ink-2)",
                borderColor: isActive ? "var(--accent)" : "var(--bg-line)",
              }}
            >
              <span className="mono">#{idx + 1}</span>
              <span>{it.topic}</span>
              {result && (
                <span
                  className="dot"
                  style={{
                    background:
                      result.verdict === "correct"
                        ? "var(--accent-ink)"
                        : result.verdict === "partial"
                          ? "var(--warn)"
                          : "var(--danger)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active task content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {!active && (
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
            Выберите задачу слева, чтобы увидеть результаты.
          </div>
        )}

        {active && !activeResult && !activeRunOutput && !activeError && (
          <div
            style={{
              color: "var(--ink-3)",
              fontSize: 13,
              padding: "20px 0",
              textAlign: "center",
              border: "1px dashed var(--bg-line)",
              borderRadius: "var(--r-2)",
            }}
          >
            {busyId === active.id || runningId === active.id ? (
              <>
                <Icon name="refresh" size={14} /> Обрабатываем решение…
              </>
            ) : (
              <>Решение ещё не отправлено. Напишите код слева и нажмите «Отправить».</>
            )}
          </div>
        )}

        {activeError && (
          <div className="state-block state-block--danger" style={{ fontSize: 12 }}>
            {activeError}
          </div>
        )}

        {activeRunOutput && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="mono upper"
              style={{ color: "var(--ink-3)" }}
            >
              Run output
              <span style={{ marginLeft: 8, color: "var(--ink-4)" }}>
                exit={activeRunOutput.exit_code} · {activeRunOutput.duration_ms} мс
                {activeRunOutput.timed_out && " · TIMEOUT"}
                {activeRunOutput.truncated && " · обрезан"}
              </span>
            </div>
            {activeRunOutput.stdout && (
              <pre
                style={{
                  background: "var(--editor-bg)",
                  color: "var(--accent)",
                  fontSize: 12,
                  padding: 12,
                  borderRadius: "var(--r-2)",
                  border: "1px solid var(--bg-line)",
                  maxHeight: 240,
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
                  background: "var(--state-danger-bg)",
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                  padding: 12,
                  borderRadius: "var(--r-2)",
                  border: "1px solid var(--state-danger-border)",
                  maxHeight: 240,
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

        {activeResult && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              {(activeResult.codeLen ?? 0) > 0 && (
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  {activeResult.codeLen} симв
                  {(activeResult.pasteChars ?? 0) > 0 && (
                    <>
                      {" · "}
                      📋 {activeResult.pasteChars}
                    </>
                  )}
                </span>
              )}
            </div>
            {activeResult.rationale && (
              <div className="insight" style={{ fontSize: 13 }}>
                <div className="insight__icon">i</div>
                <div
                  style={{
                    flex: 1,
                    whiteSpace: "pre-wrap",
                    color: "var(--ink-1)",
                    lineHeight: 1.6,
                  }}
                >
                  {activeResult.rationale}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
