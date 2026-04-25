import { useEffect } from "react";

import { useVoiceSession } from "./useVoiceSession";

interface Props {
  sessionId: number;
  totalVoice: number;
  autoConnect?: boolean;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "Готов начать",
  speaking: "ИИ говорит...",
  listening: "Готов слушать",
  thinking: "Анализ ответа...",
  done: "Голосовые вопросы пройдены",
  error: "Ошибка соединения",
};

const PHASE_COLOR: Record<string, string> = {
  idle: "bg-slate-300",
  speaking: "bg-sky-500",
  listening: "bg-emerald-500",
  thinking: "bg-amber-500",
  done: "bg-slate-400",
  error: "bg-rose-500",
};

export default function VoicePanel({ sessionId, totalVoice, autoConnect = true }: Props) {
  const v = useVoiceSession(sessionId);

  useEffect(() => {
    if (autoConnect) v.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;
  const canRecord = v.phase === "listening" || v.recording;
  const canSubmit = v.phase === "listening" && (v.recording || v.segments > 0);
  const canDiscard = v.phase === "listening" && !v.recording && v.segments > 0;

  let micHelp = "";
  if (v.recording) {
    micHelp = "Идёт запись — нажмите микрофон, чтобы поставить на паузу";
  } else if (v.phase === "listening" && v.segments > 0) {
    micHelp = `Записано сегментов: ${v.segments}. Можно дописать или нажать «Отправить ответ».`;
  } else if (v.phase === "listening") {
    micHelp = "Нажмите микрофон, чтобы начать запись";
  } else if (v.phase === "speaking") {
    micHelp = "Слушайте вопрос...";
  } else if (v.phase === "thinking") {
    micHelp = "Подождите...";
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Голосовое интервью</h3>
          <span className="text-xs text-slate-500">
            {completed}/{totalVoice}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${PHASE_COLOR[v.phase] || "bg-slate-300"} ${
              v.phase === "speaking" || v.phase === "thinking" ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs text-slate-600">{PHASE_LABEL[v.phase] || v.phase}</span>
        </div>
      </div>

      <div className="p-4 border-b min-h-[110px]">
        {v.current ? (
          <>
            <div className="text-xs uppercase text-slate-400">
              {v.current.topic}
              {v.current.isFollowUp && " • follow-up"}
            </div>
            <div className="mt-1 text-slate-900 leading-relaxed">{v.current.text}</div>
          </>
        ) : (
          <div className="text-slate-400 text-sm">
            {v.phase === "done" ? "Все вопросы заданы" : "Ожидание вопроса..."}
          </div>
        )}
      </div>

      {v.error && (
        <div className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-3">
          <div className="flex-1 text-sm text-rose-800">{v.error.message}</div>
          <button
            type="button"
            onClick={v.dismissError}
            className="text-xs text-rose-700 hover:text-rose-900 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      <div className="p-4 border-b flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={v.toggleRecording}
          disabled={!canRecord}
          aria-pressed={v.recording}
          aria-label={v.recording ? "Поставить запись на паузу" : "Начать запись"}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
            v.recording
              ? "bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-200"
              : canRecord
              ? "bg-brand hover:bg-brand-dark"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {v.recording && (
            <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
          )}
          <MicIcon muted={!v.recording && !canRecord} />
        </button>
        <div className="text-xs text-slate-600 text-center min-h-[16px] px-2">{micHelp}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={v.submitAnswer}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Отправить ответ
          </button>
          <button
            type="button"
            onClick={v.discardSegments}
            disabled={!canDiscard}
            className="border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Очистить
          </button>
        </div>
        <button
          type="button"
          onClick={v.skip}
          disabled={!v.current || v.recording}
          className="text-xs text-slate-500 hover:text-slate-700 underline disabled:opacity-40 disabled:no-underline"
        >
          Пропустить вопрос
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {v.log.map((entry, idx) => (
          <div key={idx} className="border rounded-lg p-3 bg-slate-50">
            <div className="text-xs uppercase text-slate-400">
              {entry.topic}
              {entry.isFollowUp && " • follow-up"}
            </div>
            <div className="text-sm text-slate-700 mt-1">{entry.question}</div>
            <div className="text-sm text-slate-900 mt-2">
              <span className="text-slate-500">Ответ: </span>
              {entry.answer || "(пусто)"}
            </div>
            {entry.verdict && (
              <div className="mt-2 flex items-start gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    entry.verdict === "correct"
                      ? "bg-emerald-100 text-emerald-800"
                      : entry.verdict === "partial"
                      ? "bg-amber-100 text-amber-800"
                      : entry.verdict === "skipped"
                      ? "bg-slate-200 text-slate-600"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {entry.verdict}
                </span>
                <span className="text-xs text-slate-600 leading-snug">{entry.rationale}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MicIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-8 h-8 relative ${muted ? "opacity-70" : ""}`}
      aria-hidden
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}
