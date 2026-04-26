import { useEffect, useRef } from "react";

import { verdictLabel } from "../../api/types";
import type { VoiceLogEntry } from "./useVoiceSession";

interface Props {
  log: VoiceLogEntry[];
}

export default function VoiceLog({ log }: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log.length]);

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
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--bg-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="mono upper" style={{ color: "var(--ink-3)" }}>
          ВОПРОСЫ И ОТВЕТЫ
        </span>
        <span className="pill">{log.length}</span>
      </div>

      <div
        ref={logRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 20px 24px",
          minHeight: 0,
        }}
      >
        {log.length === 0 ? (
          <div
            style={{
              color: "var(--ink-3)",
              fontSize: 13,
              padding: "32px 0",
              textAlign: "center",
            }}
          >
            Пока пусто. Ответы появятся по мере прохождения интервью.
          </div>
        ) : (
          log.map((entry, idx) => (
            <div key={idx} className="transcript-row">
              <div className="transcript-row__time mono">{idx + 1}</div>
              <div>
                <div
                  className={`transcript-row__author transcript-row__author--${
                    entry.isFollowUp ? "agent" : "user"
                  }`}
                >
                  {entry.topic.toUpperCase()}
                  {entry.isFollowUp && " · FOLLOW-UP"}
                </div>
                <div
                  className="mono upper"
                  style={{
                    color: "var(--accent)",
                    marginTop: 4,
                    marginBottom: 2,
                  }}
                >
                  Вопрос
                </div>
                <div
                  className="transcript-row__text"
                  style={{ fontSize: 13, color: "var(--ink-2)" }}
                >
                  {entry.question}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    className="mono upper"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Ответ
                  </span>
                  {entry.verdict && (
                    <span
                      className={`pill ${
                        entry.verdict === "correct"
                          ? "pill--accent"
                          : entry.verdict === "partial"
                            ? "pill--warn"
                            : entry.verdict === "skipped"
                              ? ""
                              : "pill--danger"
                      }`}
                    >
                      {verdictLabel(entry.verdict)}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-1)",
                    paddingLeft: 10,
                    borderLeft: "2px solid var(--accent)",
                    background: "var(--bg-2)",
                    padding: "6px 10px",
                    borderRadius: "0 var(--r-2) var(--r-2) 0",
                  }}
                >
                  {entry.answer || (
                    <span style={{ color: "var(--ink-4)" }}>(пусто)</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
