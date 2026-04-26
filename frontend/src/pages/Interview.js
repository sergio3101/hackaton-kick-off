import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import Icon from "../components/Icon";
import { Orb } from "../components/UI";
import CodingEditor from "../features/coding/CodingEditor";
import CodingResults from "../features/coding/CodingResults";
import { useCodingState } from "../features/coding/useCodingState";
import VoiceInteract from "../features/voice/VoiceInteract";
import VoiceLog from "../features/voice/VoiceLog";
import { useVoiceSession } from "../features/voice/useVoiceSession";
export default function Interview() {
    const { id } = useParams();
    const sessionId = Number(id);
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [searchParams] = useSearchParams();
    const continuousFromUrl = searchParams.get("continuous") === "1";
    const [finishing, setFinishing] = useState(false);
    const [finishError, setFinishError] = useState(null);
    const [started, setStarted] = useState(false);
    const [localStartedAt, setLocalStartedAt] = useState(null);
    const [activeTab, setActiveTab] = useState("voice");
    const [timeUp, setTimeUp] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ["session", sessionId],
        queryFn: async () => (await api.get(`/api/sessions/${sessionId}`)).data,
        enabled: Number.isFinite(sessionId),
    });
    const reqQ = useQuery({
        queryKey: ["requirements", data?.requirements_id],
        queryFn: async () => (await api.get(`/api/requirements/${data.requirements_id}`)).data,
        enabled: !!data?.requirements_id,
    });
    // Хуки голоса/кодинга поднимаем сюда: оба компонента (Interact + Log /
    // Editor + Results) делят одно состояние, и переключение табов через CSS
    // display не размонтирует панели — WebSocket / Monaco остаются живыми.
    const v = useVoiceSession(sessionId);
    const coding = useCodingState(data);
    // Гидратируем лог голоса из ранее сохранённых ответов (resume).
    useEffect(() => {
        if (!data)
            return;
        const completed = data.items
            .filter((i) => i.type === "voice" &&
            (i.verdict !== null || (i.answer_text || "").length > 0))
            .sort((a, b) => a.idx - b.idx)
            .map((i) => ({
            itemId: i.id,
            topic: i.topic,
            question: i.prompt_text,
            answer: i.answer_text,
            verdict: i.verdict,
            rationale: i.rationale,
            isFollowUp: false,
        }));
        if (completed.length > 0) {
            v.hydrate(completed);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id]);
    // Если сессия уже active — автоматически считаем её начатой
    // (пользователь возвращается через «Продолжить» из /me/assignments).
    useEffect(() => {
        if (data?.status === "active" && !started) {
            setStarted(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.status]);
    // Подключаемся к WS только после нажатия «Начать».
    useEffect(() => {
        if (started)
            v.connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started]);
    // При истечении времени сессии — остановить активную запись.
    useEffect(() => {
        if (timeUp && v.recording) {
            void v.stopRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeUp, v.recording]);
    // Monaco при первом показе через display:none может остаться 0×0 — нужен
    // editor.layout() при переключении на coding-таб.
    const editorRef = useRef(null);
    useEffect(() => {
        if (activeTab === "coding") {
            requestAnimationFrame(() => editorRef.current?.layout());
        }
    }, [activeTab]);
    useEffect(() => {
        if (!data)
            return;
        if (data.started_at && localStartedAt === null) {
            setLocalStartedAt(new Date(data.started_at).getTime());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.started_at]);
    async function onFinish() {
        if (!confirm("Завершить интервью и сформировать отчёт?"))
            return;
        setFinishing(true);
        setFinishError(null);
        try {
            await api.post(`/api/sessions/${sessionId}/finish`);
            if (isAdmin) {
                navigate(`/sessions/${sessionId}/report`);
            }
            else {
                navigate("/me/assignments");
            }
        }
        catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            const msg = status === 401
                ? "Сессия истекла — войдите заново и повторите."
                : detail || "Не удалось завершить интервью. Попробуйте ещё раз.";
            setFinishError(msg);
        }
        finally {
            setFinishing(false);
        }
    }
    if (isLoading || !data) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0435\u0441\u0441\u0438\u0438..." }));
    }
    const totalVoice = data.items.filter((i) => i.type === "voice").length;
    const continuous = continuousFromUrl && data.mode === "voice";
    const isTextMode = data.mode === "text";
    const codingSolved = Object.values(coding.resultById).filter((r) => r.verdict === "correct").length;
    const codingTotal = coding.codingItems.length;
    const phaseActive = v.phase === "speaking" || v.phase === "listening" || v.phase === "thinking";
    const frozen = timeUp ||
        v.phase === "done" ||
        v.doneReason === "time_up" ||
        data.status === "finished";
    return (_jsxs("div", { className: "page page--wide", style: {
            paddingTop: 0,
            height: "calc(100vh - 56px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
        }, children: [_jsxs("div", { style: {
                    padding: "16px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--bg-line)",
                    gap: 16,
                    flexWrap: "wrap",
                }, children: [_jsxs("div", { children: [_jsxs("div", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 6,
                                    flexWrap: "wrap",
                                }, children: [_jsxs("span", { className: "pill pill--accent", children: [_jsx("span", { className: "dot dot--live" }), "SESSION #", data.id, " \u00B7 ", data.status === "active" ? "LIVE" : data.status.toUpperCase()] }), _jsx("span", { className: "pill", children: data.selected_level }), _jsx("span", { className: "pill", children: isTextMode ? "TEXT" : "VOICE" }), continuous && _jsx("span", { className: "pill pill--accent", children: "\u043D\u0435\u043F\u0440\u0435\u0440\u044B\u0432\u043D\u044B\u0439" }), data.selected_topics.slice(0, 3).map((t) => (_jsx("span", { className: "pill", children: t }, t))), data.selected_topics.length > 3 && (_jsxs("span", { className: "pill", children: ["+", data.selected_topics.length - 3] }))] }), _jsx("div", { style: { fontSize: 18, fontWeight: 500 }, children: reqQ.data?.title || `Сессия #${data.id}` })] }), _jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [_jsx(SessionTimer, { startedAtIso: data.started_at, localStartedAtMs: localStartedAt, targetMin: data.target_duration_min ?? 12, running: started && data.status !== "finished" && !frozen, onTimeUp: () => setTimeUp(true) }), !started && (_jsxs("button", { type: "button", onClick: () => {
                                    setStarted(true);
                                    setLocalStartedAt(Date.now());
                                }, className: "btn btn--primary", children: [_jsx(Icon, { name: "play", size: 13 }), " \u041D\u0430\u0447\u0430\u0442\u044C"] })), _jsxs("button", { type: "button", onClick: onFinish, disabled: finishing, className: "btn btn--danger", children: [_jsx(Icon, { name: "stop", size: 13 }), finishing ? "Формирую отчёт..." : "Завершить"] })] })] }), finishError && (_jsxs("div", { className: "state-block state-block--danger", style: { margin: "12px 0", fontSize: 13 }, children: [_jsx("span", { children: finishError }), _jsx("button", { type: "button", onClick: () => setFinishError(null), className: "state-block__close", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), _jsxs("div", { style: {
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid var(--bg-line)",
                    marginTop: 12,
                }, children: [_jsxs(TabButton, { active: activeTab === "voice", onClick: () => setActiveTab("voice"), children: [_jsx(Icon, { name: "mic", size: 14 }), _jsx("span", { children: isTextMode ? "Текстовое интервью" : "Голосовое интервью" }), phaseActive && (_jsx("span", { className: "dot dot--live", style: { marginLeft: 2 }, "aria-hidden": true })), v.log.length > 0 && _jsx("span", { className: "pill", children: v.log.length })] }), _jsxs(TabButton, { active: activeTab === "coding", onClick: () => setActiveTab("coding"), children: [_jsx(Icon, { name: "code", size: 14 }), _jsx("span", { children: "\u041B\u0430\u0439\u0432-\u043A\u043E\u0434\u0438\u043D\u0433" }), codingTotal > 0 && (_jsxs("span", { className: "pill", children: [codingSolved, "/", codingTotal] }))] })] }), _jsxs("div", { style: {
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                    padding: "18px 0",
                    minHeight: 0,
                }, children: [_jsx("div", { style: {
                            display: activeTab === "voice" ? "flex" : "none",
                            flexDirection: "column",
                            minHeight: 0,
                            height: "100%",
                        }, children: started ? (_jsx(VoiceInteract, { v: v, totalVoice: totalVoice, continuous: continuous, textMode: isTextMode, frozen: frozen })) : (_jsx(VoiceStartStub, { totalVoice: totalVoice, durationMin: data.target_duration_min ?? 12, isResume: data.status === "active", isTextMode: isTextMode, onStart: () => {
                                setStarted(true);
                                if (localStartedAt === null)
                                    setLocalStartedAt(Date.now());
                            } })) }), _jsx("div", { style: {
                            display: activeTab === "coding" ? "flex" : "none",
                            flexDirection: "column",
                            minHeight: 0,
                            height: "100%",
                        }, children: _jsx(CodingEditor, { state: coding, onMonacoMount: (editor) => {
                                editorRef.current = editor;
                            }, onSubmit: () => void coding.submit(), frozen: frozen }) }), _jsx("div", { style: {
                            display: activeTab === "voice" ? "flex" : "none",
                            flexDirection: "column",
                            minHeight: 0,
                            height: "100%",
                        }, children: started ? (_jsx(VoiceLog, { log: v.log })) : (_jsx(EmptyLog, { text: "\u041B\u043E\u0433 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0441\u0442\u0430\u0440\u0442\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E." })) }), _jsx("div", { style: {
                            display: activeTab === "coding" ? "flex" : "none",
                            flexDirection: "column",
                            minHeight: 0,
                            height: "100%",
                        }, children: _jsx(CodingResults, { state: coding }) })] })] }));
}
function TabButton({ active, onClick, children, }) {
    return (_jsx("button", { type: "button", onClick: onClick, style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "transparent",
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            color: active ? "var(--ink-1)" : "var(--ink-3)",
            borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
            marginBottom: -1,
            cursor: "pointer",
            transition: "color 120ms",
        }, children: children }));
}
function EmptyLog({ text }) {
    return (_jsx("div", { className: "card", style: {
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            fontSize: 13,
            textAlign: "center",
            padding: 24,
        }, children: text }));
}
function SessionTimer({ startedAtIso, localStartedAtMs, targetMin, running, onTimeUp, }) {
    const startMs = useMemo(() => {
        if (startedAtIso)
            return new Date(startedAtIso).getTime();
        return localStartedAtMs;
    }, [startedAtIso, localStartedAtMs]);
    const totalSec = targetMin * 60;
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running || startMs === null)
            return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [running, startMs]);
    let label = "--:--";
    let color = "var(--ink-3)";
    let remainingSec = totalSec;
    if (startMs !== null) {
        const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
        remainingSec = Math.max(0, totalSec - elapsedSec);
        const mm = Math.floor(remainingSec / 60).toString().padStart(2, "0");
        const ss = (remainingSec % 60).toString().padStart(2, "0");
        label = `${mm}:${ss}`;
        if (remainingSec === 0)
            color = "var(--danger)";
        else if (remainingSec <= 120)
            color = "var(--warn)";
        else
            color = "var(--accent)";
    }
    const firedTimeUp = useRef(false);
    useEffect(() => {
        if (startMs !== null && remainingSec === 0 && !firedTimeUp.current) {
            firedTimeUp.current = true;
            onTimeUp?.();
        }
    }, [remainingSec, startMs, onTimeUp]);
    return (_jsxs("div", { style: {
            padding: "6px 14px",
            borderRadius: "var(--r-2)",
            background: "var(--bg-2)",
            border: "1px solid var(--bg-line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
        }, title: `Сессия: ${targetMin} мин`, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "\u041E\u0421\u0422\u0410\u041B\u041E\u0421\u042C" }), _jsx("span", { className: "mono", style: {
                    fontSize: 16,
                    fontWeight: 500,
                    color,
                    fontVariantNumeric: "tabular-nums",
                }, children: label })] }));
}
function VoiceStartStub({ totalVoice, durationMin, isResume, isTextMode, onStart, }) {
    const title = isResume
        ? isTextMode
            ? "Продолжить текстовое интервью"
            : "Продолжить голосовое интервью"
        : isTextMode
            ? "Текстовое интервью готово"
            : "Голосовое интервью готово";
    const description = isResume
        ? `Сессия уже начата. Останется ответить на оставшиеся вопросы (всего до ${totalVoice}).`
        : isTextMode
            ? `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами. Отвечайте текстом — голос отключён.`
            : `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами. Можно ознакомиться с кодинг-задачей в табе «Лайв-кодинг».`;
    return (_jsxs("div", { className: "card", style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            height: "100%",
        }, children: [_jsx("div", { className: "zebra-stripes--soft", style: { position: "absolute", inset: 0, opacity: 0.4 } }), _jsx("div", { style: { position: "relative", marginBottom: 24 }, children: _jsx(Orb, { state: "idle" }) }), _jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: "AI AGENT \u00B7 \u0413\u041E\u0422\u041E\u0412" }), _jsx("h3", { style: {
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    margin: "0 0 10px",
                }, children: title }), _jsx("p", { style: {
                    fontSize: 13,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    maxWidth: 360,
                    margin: 0,
                }, children: description }), _jsx("button", { type: "button", onClick: onStart, className: "btn btn--primary btn--lg", style: { marginTop: 24 }, children: isResume ? (_jsxs(_Fragment, { children: ["\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C ", _jsx(Icon, { name: "arrow-right", size: 14 })] })) : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "play", size: 14 }), " \u041D\u0430\u0447\u0430\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E"] })) })] }));
}
