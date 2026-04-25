import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useVoiceSession } from "./useVoiceSession";
const PHASE_LABEL = {
    idle: "Готов начать",
    speaking: "ИИ говорит...",
    listening: "Готов слушать",
    thinking: "Анализ ответа...",
    done: "Голосовые вопросы пройдены",
    error: "Ошибка соединения",
};
const PHASE_COLOR = {
    idle: "bg-slate-300",
    speaking: "bg-sky-500",
    listening: "bg-emerald-500",
    thinking: "bg-amber-500",
    done: "bg-slate-400",
    error: "bg-rose-500",
};
const PHASE_COLOR_TIME_UP = "bg-rose-500";
export default function VoicePanel({ sessionId, totalVoice, autoConnect = true, continuous = false, textMode: forceTextMode = false, }) {
    const v = useVoiceSession(sessionId);
    const [textMode, setTextMode] = useState(forceTextMode);
    const [textDraft, setTextDraft] = useState("");
    useEffect(() => {
        if (autoConnect)
            v.connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoConnect]);
    // Сбрасываем черновик при смене вопроса; в text-only режиме textMode не закрываем.
    useEffect(() => {
        setTextDraft("");
        if (!forceTextMode)
            setTextMode(false);
    }, [v.current?.itemId, forceTextMode]);
    // F3: в режиме «текстовое интервью» — постоянно держим textMode=true.
    useEffect(() => {
        if (forceTextMode)
            setTextMode(true);
    }, [forceTextMode]);
    // При завершении сессии (time_up или completed) — закрыть текстовый режим.
    useEffect(() => {
        if (v.phase === "done") {
            if (!forceTextMode)
                setTextMode(false);
            setTextDraft("");
        }
    }, [v.phase, forceTextMode]);
    // F1: непрерывный режим — автостарт записи после получения нового вопроса.
    useEffect(() => {
        if (!continuous || forceTextMode)
            return;
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
    }
    else if (v.phase === "listening" && v.segments > 0) {
        micHelp = `Записано сегментов: ${v.segments}. Можно дописать или нажать «Отправить ответ».`;
    }
    else if (v.phase === "listening") {
        micHelp = "Нажмите микрофон, чтобы начать запись";
    }
    else if (v.phase === "speaking") {
        micHelp = "Слушайте вопрос...";
    }
    else if (v.phase === "thinking") {
        micHelp = "Подождите...";
    }
    const isTimeUp = v.phase === "done" && v.doneReason === "time_up";
    const phaseLabel = isTimeUp
        ? `Время вышло (отвечено ${completed} из ${totalVoice})`
        : PHASE_LABEL[v.phase] || v.phase;
    const phaseDot = isTimeUp
        ? PHASE_COLOR_TIME_UP
        : PHASE_COLOR[v.phase] || "bg-slate-300";
    return (_jsxs("div", { className: "flex flex-col h-full bg-white border rounded-lg", children: [_jsxs("div", { className: "border-b p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-semibold", children: forceTextMode ? "Текстовое интервью" : "Голосовое интервью" }), _jsxs("span", { className: "text-xs text-slate-500", children: [completed, "/", totalVoice] })] }), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsx("span", { className: `inline-block w-2 h-2 rounded-full ${phaseDot} ${v.phase === "speaking" || v.phase === "thinking" ? "animate-pulse" : ""}` }), _jsx("span", { className: "text-xs text-slate-600", children: phaseLabel })] })] }), _jsx("div", { className: "p-4 border-b min-h-[110px]", children: v.current ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-xs uppercase text-slate-400", children: [v.current.topic, v.current.isFollowUp && " • follow-up"] }), _jsx("div", { className: "mt-1 text-slate-900 leading-relaxed", children: v.current.text })] })) : (_jsx("div", { className: "text-slate-400 text-sm", children: v.phase === "done"
                        ? v.doneReason === "time_up"
                            ? "Время вышло — нажмите «Завершить досрочно», чтобы получить отчёт"
                            : "Все вопросы заданы"
                        : "Ожидание вопроса..." })) }), v.timeWarningRemainingSec !== null && v.phase !== "done" && (_jsxs("div", { className: "mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900", children: ["\u23F1 \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ~", Math.ceil((v.timeWarningRemainingSec || 0) / 60), " \u043C\u0438\u043D \u2014 \u043F\u043E\u0441\u0442\u0430\u0440\u0430\u0439\u0442\u0435\u0441\u044C \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441."] })), v.reconnecting && (_jsxs("div", { className: "mx-4 mt-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 flex items-center gap-2", children: [_jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse" }), "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435..."] })), v.error && (_jsxs("div", { className: "mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-3", children: [_jsx("div", { className: "flex-1 text-sm text-rose-800", children: v.error.message }), _jsx("button", { type: "button", onClick: v.dismissError, className: "text-xs text-rose-700 hover:text-rose-900 underline", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), v.phase !== "done" && !forceTextMode && (_jsxs("div", { className: "p-4 border-b flex flex-col items-center gap-3", children: [_jsxs("button", { type: "button", onClick: v.toggleRecording, disabled: !canRecord, "aria-pressed": v.recording, "aria-label": v.recording ? "Поставить запись на паузу" : "Начать запись", className: `relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-md ${v.recording
                            ? "bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-200"
                            : canRecord
                                ? "bg-brand hover:bg-brand-dark"
                                : "bg-slate-300 cursor-not-allowed"}`, children: [v.recording && (_jsx("span", { className: "absolute inset-0 rounded-full bg-rose-500/40 animate-ping" })), _jsx(MicIcon, { muted: !v.recording && !canRecord })] }), _jsx("div", { className: "text-xs text-slate-600 text-center min-h-[16px] px-2", children: textMode ? "Печатайте ответ ниже — голос на паузе" : micHelp }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap justify-center", children: [_jsx("button", { type: "button", onClick: v.submitAnswer, disabled: !canSubmit, className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442" }), _jsx("button", { type: "button", onClick: v.discardSegments, disabled: !canDiscard, className: "border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed", children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => setTextMode((m) => !m), disabled: !canText && !textMode, title: "\u0415\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043A\u043E\u0434\u0430 \u0438\u043B\u0438 \u0445\u043E\u0447\u0435\u0442\u0441\u044F \u043E\u0442\u0432\u0435\u0442\u0438\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u0435\u043D\u043D\u043E", "aria-pressed": textMode, className: `px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${textMode
                                    ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                                    : "border-slate-300 hover:border-slate-400 text-slate-700"}`, children: textMode ? "Закрыть редактор" : "Ответить текстом / кодом" }), _jsx("button", { type: "button", onClick: v.replay, disabled: !v.current || v.recording || v.phase === "thinking", title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u0433\u043E\u043B\u043E\u0441\u043E\u043C", className: "border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed", children: "\uD83D\uDD01 \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }), _jsx("button", { type: "button", onClick: v.skip, disabled: !canSkip, className: "text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed", title: "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441 \u0438 \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443", children: "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 \u2192" })] })), forceTextMode && v.phase !== "done" && (_jsx("div", { className: "px-4 pt-3 pb-1 text-xs text-slate-500 border-b", children: "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u2014 \u0433\u043E\u043B\u043E\u0441 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u043D\u0438\u0436\u0435 \u0438 \u043D\u0430\u0436\u0438\u043C\u0430\u0439\u0442\u0435 \u00AB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\u00BB." })), textMode && (_jsxs("div", { className: "p-4 border-b bg-slate-50 space-y-2", children: [_jsx("div", { className: "text-xs text-slate-500", children: "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u2014 \u0433\u043E\u043B\u043E\u0441 \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u043D. \u041F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0441 \u043A\u043E\u0434\u043E\u043C." }), _jsx("textarea", { value: textDraft, onChange: (e) => setTextDraft(e.target.value), placeholder: "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u0438\u043B\u0438 \u043A\u043E\u0434...", rows: 6, className: "w-full font-mono text-sm bg-white border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand resize-y", disabled: v.phase === "thinking" }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-xs text-slate-400", children: [textDraft.trim().length, " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setTextDraft(""), disabled: !textDraft || v.phase === "thinking", className: "text-xs text-slate-500 hover:text-slate-800 px-2 py-1 disabled:opacity-40", children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => {
                                            void v.submitTextAnswer(textDraft).then(() => setTextDraft(""));
                                        }, disabled: textDraft.trim().length < 5 || v.phase === "thinking", className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u043C" })] })] }), forceTextMode && v.phase !== "done" && (_jsx("div", { className: "flex justify-end pt-2", children: _jsx("button", { type: "button", onClick: v.skip, disabled: !canSkip, className: "text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed", children: "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 \u2192" }) }))] })), _jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-3 min-h-0", children: v.log.map((entry, idx) => (_jsxs("div", { className: "border rounded-lg p-3 bg-slate-50", children: [_jsxs("div", { className: "text-xs uppercase text-slate-400", children: [entry.topic, entry.isFollowUp && " • follow-up"] }), _jsx("div", { className: "text-sm text-slate-700 mt-1", children: entry.question }), _jsxs("div", { className: "text-sm text-slate-900 mt-2", children: [_jsx("span", { className: "text-slate-500", children: "\u041E\u0442\u0432\u0435\u0442: " }), entry.answer || "(пусто)"] }), entry.verdict && (_jsxs("div", { className: "mt-2 flex items-start gap-2", children: [_jsx("span", { className: `text-xs px-2 py-0.5 rounded ${entry.verdict === "correct"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : entry.verdict === "partial"
                                            ? "bg-amber-100 text-amber-800"
                                            : entry.verdict === "skipped"
                                                ? "bg-slate-200 text-slate-600"
                                                : "bg-rose-100 text-rose-800"}`, children: entry.verdict }), _jsx("span", { className: "text-xs text-slate-600 leading-snug", children: entry.rationale })] }))] }, idx))) })] }));
}
function MicIcon({ muted = false }) {
    return (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: `w-8 h-8 relative ${muted ? "opacity-70" : ""}`, "aria-hidden": true, children: [_jsx("path", { d: "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" }), _jsx("path", { d: "M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" })] }));
}
