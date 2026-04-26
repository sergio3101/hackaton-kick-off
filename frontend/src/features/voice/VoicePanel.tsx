import { useEffect, useRef, useState } from "react";

import Icon from "../../components/Icon";
import { Orb, Wave } from "../../components/UI";
import { useVoiceSession } from "./useVoiceSession";

interface Props {
  sessionId: number;
  totalVoice: number;
  autoConnect?: boolean;
  continuous?: boolean;
  textMode?: boolean;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "ГОТОВ НАЧАТЬ",
  speaking: "ГОВОРИТ",
  listening: "СЛУШАЕТ",
  thinking: "ДУМАЕТ",
  done: "СЕССИЯ ЗАВЕРШЕНА",
  error: "ОШИБКА СОЕДИНЕНИЯ",
};

const PHASE_COLOR: Record<string, string> = {
  idle: "var(--ink-3)",
  speaking: "var(--info)",
  listening: "var(--accent)",
  thinking: "var(--warn)",
  done: "var(--ink-3)",
  error: "var(--danger)",
};

function phaseToOrbState(
  phase: string,
): "listening" | "thinking" | "speaking" | "idle" {
  if (phase === "speaking") return "speaking";
  if (phase === "thinking") return "thinking";
  if (phase === "listening") return "listening";
  return "idle";
}

export default function VoicePanel({
  sessionId,
  totalVoice,
  autoConnect = true,
  continuous = false,
  textMode: forceTextMode = false,
}: Props) {
  const v = useVoiceSession(sessionId);
  const [textMode, setTextMode] = useState(forceTextMode);
  const [textDraft, setTextDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoConnect) v.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [v.log.length]);

  useEffect(() => {
    setTextDraft("");
    if (!forceTextMode) setTextMode(false);
  }, [v.current?.itemId, forceTextMode]);

  useEffect(() => {
    if (forceTextMode) setTextMode(true);
  }, [forceTextMode]);

  useEffect(() => {
    if (v.phase === "done") {
      if (!forceTextMode) setTextMode(false);
      setTextDraft("");
    }
  }, [v.phase, forceTextMode]);

  useEffect(() => {
    if (!continuous || forceTextMode) return;
    if (v.phase === "listening" && !v.recording && v.segments === 0) {
      void v.startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, forceTextMode, v.phase, v.current?.itemId]);

  const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;
  const canRecord = (v.phase === "listening" || v.recording) && !textMode;
  const canSubmit =
    v.phase === "listening" && (v.recording || v.segments > 0) && !textMode;
  const canDiscard =
    v.phase === "listening" && !v.recording && v.segments > 0 && !textMode;
  const canText = v.phase === "listening" && !v.recording;
  const canSkip = !!v.current && !v.recording && v.phase !== "thinking";

  const isTimeUp = v.phase === "done" && v.doneReason === "time_up";
  const phaseLabel = isTimeUp
    ? `ВРЕМЯ ВЫШЛО · ${completed}/${totalVoice}`
    : PHASE_LABEL[v.phase] || v.phase.toUpperCase();
  const phaseColor = isTimeUp
    ? "var(--danger)"
    : PHASE_COLOR[v.phase] || "var(--ink-3)";

  let micHelp = "";
  if (v.recording) micHelp = "Запись идёт — нажмите снова, чтобы поставить на паузу";
  else if (v.phase === "listening" && v.segments > 0)
    micHelp = `Записано сегментов: ${v.segments}. Можно дописать или нажать «Отправить».`;
  else if (v.phase === "listening")
    micHelp = "Нажмите микрофон, чтобы начать запись";
  else if (v.phase === "speaking") micHelp = "Слушайте вопрос...";
  else if (v.phase === "thinking") micHelp = "Подождите...";

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        minHeight: 0,
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--bg-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono upper" style={{ color: "var(--ink-3)" }}>
            {forceTextMode ? "TEXT INTERVIEW" : "VOICE INTERVIEW"}
          </span>
          <span className="pill">
            {completed}/{totalVoice}
          </span>
        </div>
        <span
          className="mono upper"
          style={{
            color: phaseColor,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            className="dot"
            style={{
              background: phaseColor,
              animation:
                v.phase === "speaking" || v.phase === "thinking" || v.phase === "listening"
                  ? "pulse-soft 1.4s ease infinite"
                  : "none",
            }}
          />
          {phaseLabel}
        </span>
      </div>

      {/* Agent visualization (только для голоса) */}
      {!forceTextMode && (
        <div
          style={{
            position: "relative",
            padding: "20px 18px 12px",
            borderBottom: "1px solid var(--bg-line)",
            overflow: "hidden",
          }}
        >
          <div
            className="zebra-stripes--soft"
            style={{ position: "absolute", inset: 0, opacity: 0.4 }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Orb state={phaseToOrbState(v.phase)} />
            <Wave
              bars={32}
              intense={
                v.phase === "speaking" ? 1.0 : v.phase === "listening" ? 0.7 : 0.3
              }
            />
          </div>
        </div>
      )}

      {/* Question */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--bg-line)",
          minHeight: 100,
        }}
      >
        {v.current ? (
          <>
            <div
              className="mono upper"
              style={{
                color: "var(--accent)",
                marginBottom: 6,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {v.current.topic}
              {v.current.isFollowUp && (
                <span className="pill pill--warn">follow-up</span>
              )}
            </div>
            <div style={{ color: "var(--ink-1)", lineHeight: 1.55, fontSize: 14 }}>
              {v.current.text}
            </div>
          </>
        ) : (
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
            {v.phase === "done"
              ? isTimeUp
                ? "Время вышло — нажмите «Завершить досрочно», чтобы получить отчёт"
                : "Все вопросы заданы"
              : "Ожидание вопроса..."}
          </div>
        )}
      </div>

      {v.timeWarningRemainingSec !== null && v.phase !== "done" && (
        <div
          style={{
            margin: "12px 16px 0",
            padding: "8px 12px",
            background: "var(--warn-soft)",
            border: "1px solid oklch(0.40 0.08 75)",
            borderRadius: "var(--r-2)",
            color: "var(--warn)",
            fontSize: 12,
          }}
        >
          ⏱ Осталось ~{Math.ceil((v.timeWarningRemainingSec || 0) / 60)} мин — постарайтесь
          закончить текущий вопрос.
        </div>
      )}

      {v.reconnecting && (
        <div
          style={{
            margin: "12px 16px 0",
            padding: "8px 12px",
            background: "oklch(0.30 0.05 235)",
            border: "1px solid oklch(0.40 0.08 235)",
            borderRadius: "var(--r-2)",
            color: "var(--info)",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="dot dot--live" style={{ background: "var(--info)" }} />
          Восстанавливаем соединение...
        </div>
      )}

      {v.error && (
        <div
          style={{
            margin: "12px 16px 0",
            padding: "8px 12px",
            background: "var(--danger-soft)",
            border: "1px solid oklch(0.40 0.10 25)",
            borderRadius: "var(--r-2)",
            color: "oklch(0.78 0.16 25)",
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>{v.error.message}</span>
          <button
            type="button"
            onClick={v.dismissError}
            style={{
              fontSize: 11,
              color: "oklch(0.78 0.16 25)",
              textDecoration: "underline",
              background: "none",
              border: "none",
            }}
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Mic controls */}
      {v.phase !== "done" && !forceTextMode && (
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--bg-line)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={v.toggleRecording}
            disabled={!canRecord}
            aria-pressed={v.recording}
            style={{
              position: "relative",
              width: 68,
              height: 68,
              borderRadius: "50%",
              border: "none",
              cursor: canRecord ? "pointer" : "not-allowed",
              background: v.recording
                ? "var(--danger)"
                : canRecord
                  ? "var(--accent)"
                  : "var(--bg-3)",
              color: v.recording ? "white" : "var(--accent-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: v.recording
                ? "0 0 0 4px oklch(0.68 0.20 25 / 0.25)"
                : canRecord
                  ? "var(--glow-accent)"
                  : "none",
              transition: "transform 80ms",
            }}
          >
            {v.recording && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "oklch(0.68 0.20 25 / 0.4)",
                  animation: "breathe 1.2s ease infinite",
                }}
              />
            )}
            <Icon name="mic" size={26} />
          </button>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              textAlign: "center",
              minHeight: 16,
              padding: "0 8px",
            }}
          >
            {textMode ? "Печатайте ответ ниже — голос на паузе" : micHelp}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={v.submitAnswer}
              disabled={!canSubmit}
              className="btn btn--primary btn--sm"
            >
              <Icon name="check" size={11} /> Отправить
            </button>
            <button
              type="button"
              onClick={v.discardSegments}
              disabled={!canDiscard}
              className="btn btn--sm"
            >
              <Icon name="trash" size={11} /> Очистить
            </button>
            <button
              type="button"
              onClick={() => setTextMode((m) => !m)}
              disabled={!canText && !textMode}
              className="btn btn--sm"
              style={
                textMode
                  ? {
                      background: "var(--ink-1)",
                      color: "var(--bg-0)",
                      borderColor: "var(--ink-1)",
                    }
                  : {}
              }
            >
              {textMode ? "Закрыть редактор" : "Текстом / кодом"}
            </button>
            <button
              type="button"
              onClick={v.replay}
              disabled={!v.current || v.recording || v.phase === "thinking"}
              className="btn btn--sm"
              title="Повторить текущий вопрос"
            >
              <Icon name="refresh" size={11} />
            </button>
          </div>
          <button
            type="button"
            onClick={v.skip}
            disabled={!canSkip}
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              padding: "5px 10px",
              borderRadius: "var(--r-2)",
              border: "1px dashed var(--bg-line)",
              background: "transparent",
              cursor: canSkip ? "pointer" : "not-allowed",
              opacity: canSkip ? 1 : 0.4,
            }}
          >
            К следующему вопросу <Icon name="arrow-right" size={11} />
          </button>
        </div>
      )}

      {forceTextMode && v.phase !== "done" && (
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--bg-line)",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          Это текстовое интервью — голос отключён. Пишите ответ ниже и нажимайте «Отправить».
        </div>
      )}

      {textMode && (
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--bg-line)",
            background: "var(--bg-0)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            Текстовый ответ — голос будет проигнорирован. Подходит для вопросов с кодом.
          </div>
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Напишите ответ или код..."
            rows={5}
            className="input textarea mono"
            style={{ resize: "vertical", fontSize: 12 }}
            disabled={v.phase === "thinking"}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
              {textDraft.trim().length} символов
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setTextDraft("")}
                disabled={!textDraft || v.phase === "thinking"}
                className="btn btn--sm btn--ghost"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => {
                  void v.submitTextAnswer(textDraft).then(() => setTextDraft(""));
                }}
                disabled={textDraft.trim().length < 5 || v.phase === "thinking"}
                className="btn btn--primary btn--sm"
              >
                Отправить текстом
              </button>
            </div>
          </div>
          {forceTextMode && v.phase !== "done" && (
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <button
                type="button"
                onClick={v.skip}
                disabled={!canSkip}
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  padding: "5px 10px",
                  borderRadius: "var(--r-2)",
                  border: "1px dashed var(--bg-line)",
                  background: "transparent",
                  cursor: canSkip ? "pointer" : "not-allowed",
                  opacity: canSkip ? 1 : 0.4,
                }}
              >
                К следующему вопросу →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transcript log */}
      <div
        ref={logRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 20px 20px",
          minHeight: 0,
        }}
      >
        {v.log.map((entry, idx) => (
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
                style={{ color: "var(--accent)", marginTop: 4, marginBottom: 2 }}
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
                className="mono upper"
                style={{ color: "var(--ink-3)", marginTop: 8, marginBottom: 2 }}
              >
                Ответ
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
              {entry.verdict && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
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
                    {entry.verdict}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.55 }}>
                    {entry.rationale}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
