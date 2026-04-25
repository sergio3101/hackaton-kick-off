import { useEffect, useState } from "react";

import { useVoiceSession } from "./useVoiceSession";

interface Props {
  sessionId: number;
  totalVoice: number;
  autoConnect?: boolean;
  continuous?: boolean;  // F1: автозапуск записи после получения вопроса
  textMode?: boolean;    // F3: текстовый режим всей сессии — скрываем микрофон
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

const PHASE_COLOR_TIME_UP = "bg-rose-500";

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

  useEffect(() => {
    if (autoConnect) v.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Сбрасываем черновик при смене вопроса; в text-only режиме textMode не закрываем.
  useEffect(() => {
    setTextDraft("");
    if (!forceTextMode) setTextMode(false);
  }, [v.current?.itemId, forceTextMode]);

  // F3: в режиме «текстовое интервью» — постоянно держим textMode=true.
  useEffect(() => {
    if (forceTextMode) setTextMode(true);
  }, [forceTextMode]);

  // При завершении сессии (time_up или completed) — закрыть текстовый режим.
  useEffect(() => {
    if (v.phase === "done") {
      if (!forceTextMode) setTextMode(false);
      setTextDraft("");
    }
  }, [v.phase, forceTextMode]);

  // F1: непрерывный режим — автостарт записи после получения нового вопроса.
  useEffect(() => {
    if (!continuous || forceTextMode) return;
    if (v.phase === "listening" && !v.recording && v.segments === 0) {
      void v.startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, forceTextMode, v.phase, v.current?.itemId]);

  const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;
  const canRecord = (v.phase === "listening" || v.recording) && !textMode;
  const canSubmit = v.phase === "listening" && (v.recording || v.segments > 0) && !textMode;
  const canDiscard = v.phase === "listening" && !v.recording && v.segments > 0 && !textMode;
  const canText = v.phase === "listening" && !v.recording;
  const canSkip = !!v.current && !v.recording && v.phase !== "thinking";

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

  const isTimeUp = v.phase === "done" && v.doneReason === "time_up";
  const phaseLabel = isTimeUp
    ? `Время вышло (отвечено ${completed} из ${totalVoice})`
    : PHASE_LABEL[v.phase] || v.phase;
  const phaseDot = isTimeUp
    ? PHASE_COLOR_TIME_UP
    : PHASE_COLOR[v.phase] || "bg-slate-300";

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {forceTextMode ? "Текстовое интервью" : "Голосовое интервью"}
          </h3>
          <span className="text-xs text-slate-500">
            {completed}/{totalVoice}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${phaseDot} ${
              v.phase === "speaking" || v.phase === "thinking" ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs text-slate-600">{phaseLabel}</span>
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
            {v.phase === "done"
              ? v.doneReason === "time_up"
                ? "Время вышло — нажмите «Завершить досрочно», чтобы получить отчёт"
                : "Все вопросы заданы"
              : "Ожидание вопроса..."}
          </div>
        )}
      </div>

      {v.timeWarningRemainingSec !== null && v.phase !== "done" && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⏱ Осталось ~{Math.ceil((v.timeWarningRemainingSec || 0) / 60)} мин — постарайтесь
          закончить текущий вопрос.
        </div>
      )}

      {v.reconnecting && (
        <div className="mx-4 mt-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          Восстанавливаем соединение...
        </div>
      )}

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

      {v.phase !== "done" && !forceTextMode && (
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
        <div className="text-xs text-slate-600 text-center min-h-[16px] px-2">
          {textMode ? "Печатайте ответ ниже — голос на паузе" : micHelp}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
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
          <button
            type="button"
            onClick={() => setTextMode((m) => !m)}
            disabled={!canText && !textMode}
            title="Если вопрос требует кода или хочется ответить письменно"
            aria-pressed={textMode}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              textMode
                ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                : "border-slate-300 hover:border-slate-400 text-slate-700"
            }`}
          >
            {textMode ? "Закрыть редактор" : "Ответить текстом / кодом"}
          </button>
          <button
            type="button"
            onClick={v.replay}
            disabled={!v.current || v.recording || v.phase === "thinking"}
            title="Повторить текущий вопрос голосом"
            className="border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔁 Повторить
          </button>
        </div>
        <button
          type="button"
          onClick={v.skip}
          disabled={!canSkip}
          className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Пропустить вопрос и перейти к следующему"
        >
          К следующему вопросу →
        </button>
      </div>
      )}

      {forceTextMode && v.phase !== "done" && (
        <div className="px-4 pt-3 pb-1 text-xs text-slate-500 border-b">
          Это текстовое интервью — голос отключён. Пишите ответ ниже и нажимайте «Отправить».
        </div>
      )}

      {textMode && (
        <div className="p-4 border-b bg-slate-50 space-y-2">
          <div className="text-xs text-slate-500">
            Текстовый ответ — голос будет проигнорирован. Подходит для вопросов с кодом.
          </div>
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Напишите ответ или код..."
            rows={6}
            className="w-full font-mono text-sm bg-white border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand resize-y"
            disabled={v.phase === "thinking"}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">{textDraft.trim().length} символов</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTextDraft("")}
                disabled={!textDraft || v.phase === "thinking"}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 disabled:opacity-40"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => {
                  void v.submitTextAnswer(textDraft).then(() => setTextDraft(""));
                }}
                disabled={textDraft.trim().length < 5 || v.phase === "thinking"}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Отправить текстом
              </button>
            </div>
          </div>
          {forceTextMode && v.phase !== "done" && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={v.skip}
                disabled={!canSkip}
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                К следующему вопросу →
              </button>
            </div>
          )}
        </div>
      )}

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
