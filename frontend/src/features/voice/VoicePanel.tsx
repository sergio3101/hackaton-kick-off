import { useEffect } from "react";

import { useVoiceSession } from "./useVoiceSession";

interface Props {
  sessionId: number;
  totalVoice: number;
}

const PHASE_LABEL: Record<string, string> = {
  idle: "Подключение...",
  speaking: "ИИ говорит...",
  listening: "Готов слушать",
  thinking: "Анализ ответа...",
  done: "Голосовые вопросы пройдены",
  error: "Ошибка",
};

export default function VoicePanel({ sessionId, totalVoice }: Props) {
  const v = useVoiceSession(sessionId);

  useEffect(() => {
    v.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Голосовое интервью</h3>
          <span className="text-xs text-slate-500">
            {completed}/{totalVoice}
          </span>
        </div>
        <div
          className={`text-xs mt-1 ${
            v.phase === "error" ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {PHASE_LABEL[v.phase] || v.phase}
          {v.error && ` — ${v.error}`}
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

      <div className="p-4 border-b flex items-center gap-3">
        <button
          type="button"
          onMouseDown={v.startRecording}
          onMouseUp={v.stopRecording}
          onTouchStart={v.startRecording}
          onTouchEnd={v.stopRecording}
          disabled={v.phase !== "listening" && !v.recording}
          className={`flex-1 py-3 rounded-lg text-white text-sm font-medium ${
            v.recording
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-brand hover:bg-brand-dark disabled:opacity-40"
          }`}
        >
          {v.recording ? "● Запись... отпусти, чтобы отправить" : "Удерживай для записи"}
        </button>
        <button
          type="button"
          onClick={v.skip}
          disabled={!v.current}
          className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
        >
          Пропустить
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
