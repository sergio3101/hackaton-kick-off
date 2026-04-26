import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";
import { Orb, Wave } from "../../components/UI";
import { useVoiceSession } from "./useVoiceSession";
const PHASE_LABEL = {
    idle: "ГОТОВ НАЧАТЬ",
    speaking: "ГОВОРИТ",
    listening: "СЛУШАЕТ",
    thinking: "ДУМАЕТ",
    done: "СЕССИЯ ЗАВЕРШЕНА",
    error: "ОШИБКА СОЕДИНЕНИЯ",
};
const PHASE_COLOR = {
    idle: "var(--ink-3)",
    speaking: "var(--info)",
    listening: "var(--accent)",
    thinking: "var(--warn)",
    done: "var(--ink-3)",
    error: "var(--danger)",
};
function phaseToOrbState(phase) {
    if (phase === "speaking")
        return "speaking";
    if (phase === "thinking")
        return "thinking";
    if (phase === "listening")
        return "listening";
    return "idle";
}
export default function VoicePanel({ sessionId, totalVoice, autoConnect = true, continuous = false, textMode: forceTextMode = false, }) {
    const v = useVoiceSession(sessionId);
    const [textMode, setTextMode] = useState(forceTextMode);
    const [textDraft, setTextDraft] = useState("");
    const logRef = useRef(null);
    useEffect(() => {
        if (autoConnect)
            v.connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoConnect]);
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [v.log.length]);
    useEffect(() => {
        setTextDraft("");
        if (!forceTextMode)
            setTextMode(false);
    }, [v.current?.itemId, forceTextMode]);
    useEffect(() => {
        if (forceTextMode)
            setTextMode(true);
    }, [forceTextMode]);
    useEffect(() => {
        if (v.phase === "done") {
            if (!forceTextMode)
                setTextMode(false);
            setTextDraft("");
        }
    }, [v.phase, forceTextMode]);
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
    const isTimeUp = v.phase === "done" && v.doneReason === "time_up";
    const phaseLabel = isTimeUp
        ? `ВРЕМЯ ВЫШЛО · ${completed}/${totalVoice}`
        : PHASE_LABEL[v.phase] || v.phase.toUpperCase();
    const phaseColor = isTimeUp
        ? "var(--danger)"
        : PHASE_COLOR[v.phase] || "var(--ink-3)";
    let micHelp = "";
    if (v.recording)
        micHelp = "Запись идёт — нажмите снова, чтобы поставить на паузу";
    else if (v.phase === "listening" && v.segments > 0)
        micHelp = `Записано сегментов: ${v.segments}. Можно дописать или нажать «Отправить».`;
    else if (v.phase === "listening")
        micHelp = "Нажмите микрофон, чтобы начать запись";
    else if (v.phase === "speaking")
        micHelp = "Слушайте вопрос...";
    else if (v.phase === "thinking")
        micHelp = "Подождите...";
    return (_jsxs("div", { className: "card", style: {
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            minHeight: 0,
            height: "100%",
        }, children: [_jsxs("div", { style: {
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: forceTextMode ? "TEXT INTERVIEW" : "VOICE INTERVIEW" }), _jsxs("span", { className: "pill", children: [completed, "/", totalVoice] })] }), _jsxs("span", { className: "mono upper", style: {
                            color: phaseColor,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }, children: [_jsx("span", { className: "dot", style: {
                                    background: phaseColor,
                                    animation: v.phase === "speaking" || v.phase === "thinking" || v.phase === "listening"
                                        ? "pulse-soft 1.4s ease infinite"
                                        : "none",
                                } }), phaseLabel] })] }), !forceTextMode && (_jsxs("div", { style: {
                    position: "relative",
                    padding: "20px 18px 12px",
                    borderBottom: "1px solid var(--bg-line)",
                    overflow: "hidden",
                }, children: [_jsx("div", { className: "zebra-stripes--soft", style: { position: "absolute", inset: 0, opacity: 0.4 } }), _jsxs("div", { style: {
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 12,
                        }, children: [_jsx(Orb, { state: phaseToOrbState(v.phase) }), _jsx(Wave, { bars: 32, intense: v.phase === "speaking" ? 1.0 : v.phase === "listening" ? 0.7 : 0.3 })] })] })), _jsx("div", { style: {
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    minHeight: 100,
                }, children: v.current ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mono upper", style: {
                                color: "var(--accent)",
                                marginBottom: 6,
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }, children: [v.current.topic, v.current.isFollowUp && (_jsx("span", { className: "pill pill--warn", children: "follow-up" }))] }), _jsx("div", { style: { color: "var(--ink-1)", lineHeight: 1.55, fontSize: 14 }, children: v.current.text })] })) : (_jsx("div", { style: { color: "var(--ink-3)", fontSize: 13 }, children: v.phase === "done"
                        ? isTimeUp
                            ? "Время вышло — нажмите «Завершить досрочно», чтобы получить отчёт"
                            : "Все вопросы заданы"
                        : "Ожидание вопроса..." })) }), v.timeWarningRemainingSec !== null && v.phase !== "done" && (_jsxs("div", { style: {
                    margin: "12px 16px 0",
                    padding: "8px 12px",
                    background: "var(--warn-soft)",
                    border: "1px solid oklch(0.40 0.08 75)",
                    borderRadius: "var(--r-2)",
                    color: "var(--warn)",
                    fontSize: 12,
                }, children: ["\u23F1 \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ~", Math.ceil((v.timeWarningRemainingSec || 0) / 60), " \u043C\u0438\u043D \u2014 \u043F\u043E\u0441\u0442\u0430\u0440\u0430\u0439\u0442\u0435\u0441\u044C \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441."] })), v.reconnecting && (_jsxs("div", { style: {
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
                }, children: [_jsx("span", { className: "dot dot--live", style: { background: "var(--info)" } }), "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435..."] })), v.error && (_jsxs("div", { style: {
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
                }, children: [_jsx("span", { children: v.error.message }), _jsx("button", { type: "button", onClick: v.dismissError, style: {
                            fontSize: 11,
                            color: "oklch(0.78 0.16 25)",
                            textDecoration: "underline",
                            background: "none",
                            border: "none",
                        }, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), v.phase !== "done" && !forceTextMode && (_jsxs("div", { style: {
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                }, children: [_jsxs("button", { type: "button", onClick: v.toggleRecording, disabled: !canRecord, "aria-pressed": v.recording, style: {
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
                        }, children: [v.recording && (_jsx("span", { style: {
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    background: "oklch(0.68 0.20 25 / 0.4)",
                                    animation: "breathe 1.2s ease infinite",
                                } })), _jsx(Icon, { name: "mic", size: 26 })] }), _jsx("div", { style: {
                            fontSize: 11,
                            color: "var(--ink-3)",
                            textAlign: "center",
                            minHeight: 16,
                            padding: "0 8px",
                        }, children: textMode ? "Печатайте ответ ниже — голос на паузе" : micHelp }), _jsxs("div", { style: {
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            justifyContent: "center",
                        }, children: [_jsxs("button", { type: "button", onClick: v.submitAnswer, disabled: !canSubmit, className: "btn btn--primary btn--sm", children: [_jsx(Icon, { name: "check", size: 11 }), " \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C"] }), _jsxs("button", { type: "button", onClick: v.discardSegments, disabled: !canDiscard, className: "btn btn--sm", children: [_jsx(Icon, { name: "trash", size: 11 }), " \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C"] }), _jsx("button", { type: "button", onClick: () => setTextMode((m) => !m), disabled: !canText && !textMode, className: "btn btn--sm", style: textMode
                                    ? {
                                        background: "var(--ink-1)",
                                        color: "var(--bg-0)",
                                        borderColor: "var(--ink-1)",
                                    }
                                    : {}, children: textMode ? "Закрыть редактор" : "Текстом / кодом" }), _jsx("button", { type: "button", onClick: v.replay, disabled: !v.current || v.recording || v.phase === "thinking", className: "btn btn--sm", title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441", children: _jsx(Icon, { name: "refresh", size: 11 }) })] }), _jsxs("button", { type: "button", onClick: v.skip, disabled: !canSkip, style: {
                            fontSize: 12,
                            color: "var(--ink-3)",
                            padding: "5px 10px",
                            borderRadius: "var(--r-2)",
                            border: "1px dashed var(--bg-line)",
                            background: "transparent",
                            cursor: canSkip ? "pointer" : "not-allowed",
                            opacity: canSkip ? 1 : 0.4,
                        }, children: ["\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 ", _jsx(Icon, { name: "arrow-right", size: 11 })] })] })), forceTextMode && v.phase !== "done" && (_jsx("div", { style: {
                    padding: "10px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    fontSize: 11,
                    color: "var(--ink-3)",
                }, children: "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u2014 \u0433\u043E\u043B\u043E\u0441 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u043D\u0438\u0436\u0435 \u0438 \u043D\u0430\u0436\u0438\u043C\u0430\u0439\u0442\u0435 \u00AB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\u00BB." })), textMode && (_jsxs("div", { style: {
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    background: "var(--bg-0)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }, children: [_jsx("div", { style: { fontSize: 11, color: "var(--ink-3)" }, children: "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u2014 \u0433\u043E\u043B\u043E\u0441 \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u043D. \u041F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0441 \u043A\u043E\u0434\u043E\u043C." }), _jsx("textarea", { value: textDraft, onChange: (e) => setTextDraft(e.target.value), placeholder: "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u0438\u043B\u0438 \u043A\u043E\u0434...", rows: 5, className: "input textarea mono", style: { resize: "vertical", fontSize: 12 }, disabled: v.phase === "thinking" }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                        }, children: [_jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)" }, children: [textDraft.trim().length, " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"] }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { type: "button", onClick: () => setTextDraft(""), disabled: !textDraft || v.phase === "thinking", className: "btn btn--sm btn--ghost", children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => {
                                            void v.submitTextAnswer(textDraft).then(() => setTextDraft(""));
                                        }, disabled: textDraft.trim().length < 5 || v.phase === "thinking", className: "btn btn--primary btn--sm", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u043C" })] })] }), forceTextMode && v.phase !== "done" && (_jsx("div", { style: { display: "flex", justifyContent: "flex-end", paddingTop: 4 }, children: _jsx("button", { type: "button", onClick: v.skip, disabled: !canSkip, style: {
                                fontSize: 12,
                                color: "var(--ink-3)",
                                padding: "5px 10px",
                                borderRadius: "var(--r-2)",
                                border: "1px dashed var(--bg-line)",
                                background: "transparent",
                                cursor: canSkip ? "pointer" : "not-allowed",
                                opacity: canSkip ? 1 : 0.4,
                            }, children: "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 \u2192" }) }))] })), _jsx("div", { ref: logRef, style: {
                    flex: 1,
                    overflowY: "auto",
                    padding: "8px 20px 20px",
                    minHeight: 0,
                }, children: v.log.map((entry, idx) => (_jsxs("div", { className: "transcript-row", children: [_jsx("div", { className: "transcript-row__time mono", children: idx + 1 }), _jsxs("div", { children: [_jsxs("div", { className: `transcript-row__author transcript-row__author--${entry.isFollowUp ? "agent" : "user"}`, children: [entry.topic.toUpperCase(), entry.isFollowUp && " · FOLLOW-UP"] }), _jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginTop: 4, marginBottom: 2 }, children: "\u0412\u043E\u043F\u0440\u043E\u0441" }), _jsx("div", { className: "transcript-row__text", style: { fontSize: 13, color: "var(--ink-2)" }, children: entry.question }), _jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginTop: 8, marginBottom: 2 }, children: "\u041E\u0442\u0432\u0435\u0442" }), _jsx("div", { style: {
                                        fontSize: 13,
                                        color: "var(--ink-1)",
                                        paddingLeft: 10,
                                        borderLeft: "2px solid var(--accent)",
                                        background: "var(--bg-2)",
                                        padding: "6px 10px",
                                        borderRadius: "0 var(--r-2) var(--r-2) 0",
                                    }, children: entry.answer || (_jsx("span", { style: { color: "var(--ink-4)" }, children: "(\u043F\u0443\u0441\u0442\u043E)" })) }), entry.verdict && (_jsxs("div", { style: {
                                        marginTop: 8,
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "flex-start",
                                    }, children: [_jsx("span", { className: `pill ${entry.verdict === "correct"
                                                ? "pill--accent"
                                                : entry.verdict === "partial"
                                                    ? "pill--warn"
                                                    : entry.verdict === "skipped"
                                                        ? ""
                                                        : "pill--danger"}`, children: entry.verdict }), _jsx("span", { style: { fontSize: 11, color: "var(--ink-3)", lineHeight: 1.55 }, children: entry.rationale })] }))] })] }, idx))) })] }));
}
