import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Orb, Wave } from "../../components/UI";
const PHASE_LABEL = {
    idle: "ГОТОВ НАЧАТЬ",
    speaking: "ГОВОРИТ",
    listening: "СЛУШАЕТ",
    thinking: "ДУМАЕТ",
    awaiting_next: "ОТВЕТ ОЦЕНЁН",
    done: "СЕССИЯ ЗАВЕРШЕНА",
    error: "ОШИБКА СОЕДИНЕНИЯ",
};
const PHASE_COLOR = {
    idle: "var(--ink-3)",
    speaking: "var(--info)",
    listening: "var(--accent)",
    thinking: "var(--warn)",
    awaiting_next: "var(--accent)",
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
export default function VoiceInteract({ v, totalVoice, continuous = false, textMode: forceTextMode = false, frozen = false, }) {
    const [textMode, setTextMode] = useState(forceTextMode);
    const [textDraft, setTextDraft] = useState("");
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
        if (!continuous || forceTextMode || frozen)
            return;
        // В awaiting_next автозапись не стартуем — пользователь должен явно нажать
        // «К следующему вопросу», чтобы получить новый question.
        if (v.phase === "listening" && !v.recording && v.segments === 0) {
            void v.startRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [continuous, forceTextMode, frozen, v.phase, v.current?.itemId]);
    const completed = v.log.filter((l) => l.verdict !== null && !l.isFollowUp).length;
    // Номер текущего вопроса в потоке голосовых: уникальные answered + 1, если
    // текущий ещё не отвечен (обычный кейс), либо просто answered, если current
    // — follow-up к уже отвеченному вопросу.
    const answeredItemIds = new Set(v.log.filter((l) => !l.isFollowUp).map((l) => l.itemId));
    const currentNumber = v.current
        ? answeredItemIds.has(v.current.itemId)
            ? answeredItemIds.size
            : answeredItemIds.size + 1
        : answeredItemIds.size;
    const canRecord = (v.phase === "listening" || v.recording) && !textMode;
    const canSubmit = v.phase === "listening" && (v.recording || v.segments > 0) && !textMode;
    const canDiscard = v.phase === "listening" && !v.recording && v.segments > 0 && !textMode;
    const canText = v.phase === "listening" && !v.recording;
    // skip только до того, как пользователь ответил (фаза listening). После
    // evaluation сервер ждёт `next`, не `skip` — иначе зальёт verdict как skipped.
    const canSkip = !!v.current && !v.recording && v.phase === "listening";
    const canNext = v.phase === "awaiting_next";
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
    else if (v.phase === "awaiting_next")
        micHelp = "Ответ оценён — нажмите «К следующему вопросу», чтобы продолжить";
    return (_jsxs("div", { className: "card vi-stack", style: {
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
                }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: forceTextMode ? "TEXT INTERVIEW" : "VOICE INTERVIEW" }), _jsxs("span", { className: "pill", children: [currentNumber, "/", totalVoice] })] }), _jsxs("span", { className: "mono upper", style: {
                            color: phaseColor,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }, children: [_jsx("span", { className: "dot", style: {
                                    background: phaseColor,
                                    animation: v.phase === "speaking" || v.phase === "thinking" || v.phase === "listening"
                                        ? "pulse-soft 1.4s ease infinite"
                                        : "none",
                                } }), phaseLabel] })] }), !forceTextMode && !textMode && (_jsxs("div", { style: {
                    position: "relative",
                    padding: "12px 18px 10px",
                    borderBottom: "1px solid var(--bg-line)",
                    overflow: "hidden",
                    flexShrink: 0,
                }, children: [_jsx("div", { className: "zebra-stripes--soft", style: { position: "absolute", inset: 0, opacity: 0.4 } }), _jsxs("div", { style: {
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                        }, children: [_jsx(Orb, { state: phaseToOrbState(v.phase), active: v.playing || v.recording }), _jsx(Wave, { bars: 32, intense: v.phase === "speaking" ? 1.0 : v.phase === "listening" ? 0.7 : 0.3, active: v.playing || v.recording })] })] })), _jsx("div", { style: {
                    padding: "12px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    minHeight: 70,
                    flexShrink: 0,
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
                        : "Ожидание вопроса..." })) }), v.timeWarningRemainingSec !== null && v.phase !== "done" && (_jsx("div", { className: "state-block state-block--warn", style: { margin: "12px 16px 0", fontSize: 12 }, children: _jsxs("span", { children: ["\u23F1 \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ~", Math.ceil((v.timeWarningRemainingSec || 0) / 60), " \u043C\u0438\u043D \u2014 \u043F\u043E\u0441\u0442\u0430\u0440\u0430\u0439\u0442\u0435\u0441\u044C \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441."] }) })), v.reconnecting && (_jsx("div", { className: "state-block state-block--info", style: {
                    margin: "12px 16px 0",
                    fontSize: 12,
                    alignItems: "center",
                }, children: _jsxs("span", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("span", { className: "dot dot--live", style: { background: "var(--info)" } }), "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u043C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435..."] }) })), v.error && (_jsxs("div", { className: "state-block state-block--danger", style: { margin: "12px 16px 0", fontSize: 12 }, children: [_jsx("span", { children: v.error.message }), _jsx("button", { type: "button", onClick: v.dismissError, className: "state-block__close", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), !frozen && v.phase !== "done" && !forceTextMode && (_jsxs("div", { style: {
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                }, children: [_jsxs("button", { type: "button", onClick: v.toggleRecording, disabled: !canRecord, "aria-pressed": v.recording, style: {
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
                        }, children: [v.recording && (_jsx("span", { style: {
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    background: "var(--mic-recording-pulse)",
                                    animation: "breathe 1.2s ease infinite",
                                } })), _jsx(Icon, { name: "mic", size: 22 })] }), _jsx("div", { style: {
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
                                    : {}, children: textMode ? "Закрыть редактор" : "Текстом / кодом" }), _jsx("button", { type: "button", onClick: v.replay, disabled: !v.current || v.recording || v.phase === "thinking", className: "btn btn--sm", title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0432\u043E\u043F\u0440\u043E\u0441", children: _jsx(Icon, { name: "refresh", size: 11 }) }), canNext ? (_jsxs("button", { type: "button", onClick: v.next, className: "btn btn--primary btn--sm", title: "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443", "aria-label": "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443", children: ["\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 ", _jsx(Icon, { name: "arrow-right", size: 11 })] })) : (_jsx("button", { type: "button", onClick: v.skip, disabled: !canSkip, className: "btn btn--sm", title: "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441", "aria-label": "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441", children: _jsx(Icon, { name: "arrow-right", size: 11 }) }))] })] })), forceTextMode && !frozen && v.phase !== "done" && (_jsx("div", { style: {
                    padding: "10px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    fontSize: 11,
                    color: "var(--ink-3)",
                }, children: "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u2014 \u0433\u043E\u043B\u043E\u0441 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u043D\u0438\u0436\u0435 \u0438 \u043D\u0430\u0436\u0438\u043C\u0430\u0439\u0442\u0435 \u00AB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\u00BB." })), textMode && !frozen && (_jsxs("div", { style: {
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
                }, children: [_jsx("div", { style: { fontSize: 11, color: "var(--ink-3)" }, children: "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u2014 \u0433\u043E\u043B\u043E\u0441 \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0438\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u043D. \u041F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0441 \u043A\u043E\u0434\u043E\u043C." }), _jsx("textarea", { value: textDraft, onChange: (e) => setTextDraft(e.target.value), placeholder: "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u0438\u043B\u0438 \u043A\u043E\u0434...", className: "input textarea mono", style: { resize: "none", fontSize: 12, flex: 1, minHeight: 0 }, disabled: v.phase === "thinking" }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                        }, children: [_jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)" }, children: [textDraft.trim().length, " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"] }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { type: "button", onClick: () => setTextDraft(""), disabled: !textDraft || v.phase === "thinking", className: "btn btn--sm btn--ghost", children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => {
                                            void v.submitTextAnswer(textDraft).then(() => setTextDraft(""));
                                        }, disabled: textDraft.trim().length < 5 || v.phase === "thinking", className: "btn btn--primary btn--sm", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u043C" })] })] }), forceTextMode && v.phase !== "done" && (_jsx("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }, children: canNext ? (_jsxs("button", { type: "button", onClick: v.next, className: "btn btn--primary btn--sm", title: "\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443", children: ["\u041A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0432\u043E\u043F\u0440\u043E\u0441\u0443 ", _jsx(Icon, { name: "arrow-right", size: 11 })] })) : (_jsx("button", { type: "button", onClick: v.skip, disabled: !canSkip, style: {
                                fontSize: 12,
                                color: "var(--ink-3)",
                                padding: "5px 10px",
                                borderRadius: "var(--r-2)",
                                border: "1px dashed var(--bg-line)",
                                background: "transparent",
                                cursor: canSkip ? "pointer" : "not-allowed",
                                opacity: canSkip ? 1 : 0.4,
                            }, children: "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441 \u2192" })) }))] })), frozen && (_jsx("div", { className: "state-block state-block--danger", style: {
                    margin: "16px",
                    fontSize: 13,
                    justifyContent: "center",
                    textAlign: "center",
                }, children: _jsx("span", { children: "\u23F1 \u0412\u0440\u0435\u043C\u044F \u0441\u0435\u0441\u0441\u0438\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u043E. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C\u00BB, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043E\u0442\u0447\u0451\u0442." }) }))] }));
}
