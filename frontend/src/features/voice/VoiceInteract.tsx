import { useEffect, useState } from "react";

import Icon from "../../components/Icon";
import { Orb, Wave } from "../../components/UI";
import type { useVoiceSession } from "./useVoiceSession";

export type VoiceSession = ReturnType<typeof useVoiceSession>;

interface Props {
  v: VoiceSession;
  totalVoice: number;
  continuous?: boolean;
  textMode?: boolean;
  frozen?: boolean;
  /** true — у сессии истекло время или она finished. Голосовая часть и кодинг
   *  замораживаются, баннер красный. false при штатном done(completed) — у
   *  кандидата ещё есть время добить кодинг. */
  sessionTimeUp?: boolean;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "ГОТОВ НАЧАТЬ",
  speaking: "ГОВОРИТ",
  listening: "СЛУШАЕТ",
  thinking: "ДУМАЕТ",
  awaiting_next: "ОТВЕТ ОЦЕНЁН",
  done: "СЕССИЯ ЗАВЕРШЕНА",
  error: "ОШИБКА СОЕДИНЕНИЯ",
};

const PHASE_COLOR: Record<string, string> = {
  idle: "var(--ink-3)",
  speaking: "var(--info)",
  listening: "var(--accent)",
  thinking: "var(--warn)",
  awaiting_next: "var(--accent)",
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

export default function VoiceInteract({
  v,
  totalVoice,
  continuous = false,
  textMode: forceTextMode = false,
  frozen = false,
  sessionTimeUp = false,
}: Props) {
  const [textMode, setTextMode] = useState(forceTextMode);
  const [textDraft, setTextDraft] = useState("");

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
    if (!continuous || forceTextMode || frozen) return;
    // В awaiting_next автозапись не стартуем — пользователь должен явно нажать
    // «К следующему вопросу», чтобы получить новый question.
    if (v.phase === "listening" && !v.recording && v.segments === 0) {
      void v.startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, forceTextMode, frozen, v.phase, v.current?.itemId]);

  const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;
  // Номер текущего вопроса в потоке голосовых: используем серверный idx,
  // который инкрементируется и при ответе, и при skip. Если опираться на
  // длину лога, как раньше, — skipped не попадают (transcript для них не
  // приходит) и счётчик отстаёт ровно на число пропусков.
  // На follow-up idx остаётся тем же (та же запись банка) — счётчик не прыгает.
  const currentNumber = v.current
    ? v.current.idx + 1
    : completed;
  const canRecord = (v.phase === "listening" || v.recording) && !textMode;
  const canSubmit =
    v.phase === "listening" && (v.recording || v.segments > 0) && !textMode;
  const canDiscard =
    v.phase === "listening" && !v.recording && v.segments > 0 && !textMode;
  const canText = v.phase === "listening" && !v.recording;
  // skip только до того, как пользователь ответил (фаза listening). После
  // evaluation сервер ждёт `next`, не `skip` — иначе зальёт verdict как skipped.
  const canSkip =
    !!v.current && !v.recording && v.phase === "listening";
  const canNext = v.phase === "awaiting_next";

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
  else if (v.phase === "awaiting_next")
    micHelp = "Ответ оценён — нажмите «К следующему вопросу», чтобы продолжить";

  return (
    <div
      className="card vi-stack"
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
            {currentNumber}/{totalVoice}
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

      {/* Agent visualization (только для голоса). В textMode скрываем —
          orb с волной съедает половину высоты карточки и вытесняет textarea. */}
      {!forceTextMode && !textMode && (
        <div
          style={{
            position: "relative",
            padding: "12px 18px 10px",
            borderBottom: "1px solid var(--bg-line)",
            overflow: "hidden",
            flexShrink: 0,
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
              gap: 8,
            }}
          >
            <Orb
              state={phaseToOrbState(v.phase)}
              active={v.playing || v.recording}
            />
            <Wave
              bars={32}
              intense={
                v.phase === "speaking" ? 1.0 : v.phase === "listening" ? 0.7 : 0.3
              }
              active={v.playing || v.recording}
            />
          </div>
        </div>
      )}

      {/* Question */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--bg-line)",
          minHeight: 70,
          flexShrink: 0,
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
          className="state-block state-block--warn"
          style={{ margin: "12px 16px 0", fontSize: 12 }}
        >
          <span>
            ⏱ Осталось ~{Math.ceil((v.timeWarningRemainingSec || 0) / 60)} мин —
            постарайтесь закончить текущий вопрос.
          </span>
        </div>
      )}

      {v.reconnecting && (
        <div
          className="state-block state-block--info"
          style={{
            margin: "12px 16px 0",
            fontSize: 12,
            alignItems: "center",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dot dot--live" style={{ background: "var(--info)" }} />
            Восстанавливаем соединение...
          </span>
        </div>
      )}

      {v.error && (
        <div
          className="state-block state-block--danger"
          style={{ margin: "12px 16px 0", fontSize: 12 }}
        >
          <span>{v.error.message}</span>
          <button
            type="button"
            onClick={v.dismissError}
            className="state-block__close"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Mic controls */}
      {!frozen && v.phase !== "done" && !forceTextMode && (
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--bg-line)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={v.toggleRecording}
            disabled={!canRecord}
            aria-pressed={v.recording}
            style={{
              position: "relative",
              width: 56,
              height: 56,
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
                ? "0 0 0 4px var(--mic-recording-ring)"
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
                  background: "var(--mic-recording-pulse)",
                  animation: "breathe 1.2s ease infinite",
                }}
              />
            )}
            <Icon name="mic" size={22} />
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
            {canNext ? (
              <button
                type="button"
                onClick={v.next}
                className="btn btn--primary btn--sm"
                title="К следующему вопросу"
                aria-label="К следующему вопросу"
              >
                К следующему <Icon name="arrow-right" size={11} />
              </button>
            ) : (
              <button
                type="button"
                onClick={v.skip}
                disabled={!canSkip}
                className="btn btn--sm"
                title="Пропустить вопрос"
                aria-label="Пропустить вопрос"
              >
                <Icon name="arrow-right" size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {forceTextMode && !frozen && v.phase !== "done" && (
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

      {textMode && !frozen && (
        <div
          style={{
            padding: "12px 18px",
            background: "var(--bg-0)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            // flex:1 + minHeight:0 — блок забирает всё свободное пространство
            // карточки, textarea ниже растягивается, а кнопка «Отправить текстом»
            // не уезжает за нижнюю границу.
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            Текстовый ответ — голос будет проигнорирован. Подходит для вопросов с кодом.
          </div>
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Напишите ответ или код..."
            className="input textarea mono"
            style={{ resize: "none", fontSize: 12, flex: 1, minHeight: 0 }}
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              {canNext ? (
                <button
                  type="button"
                  onClick={v.next}
                  className="btn btn--primary btn--sm"
                  title="К следующему вопросу"
                >
                  К следующему вопросу <Icon name="arrow-right" size={11} />
                </button>
              ) : (
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
                  Пропустить вопрос →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {frozen && (
        <div
          className={`state-block ${sessionTimeUp ? "state-block--danger" : "state-block--info"}`}
          style={{
            margin: "16px",
            fontSize: 13,
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <span>
            {sessionTimeUp
              ? "⏱ Время сессии истекло. Нажмите «Завершить», чтобы получить отчёт."
              : "✓ Все голосовые вопросы пройдены. Перейдите во вкладку «Лайв-кодинг» или дождитесь окончания таймера и нажмите «Завершить»."}
          </span>
        </div>
      )}
    </div>
  );
}
