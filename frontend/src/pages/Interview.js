import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
import CodingPanel from "../features/coding/CodingPanel";
import VoicePanel from "../features/voice/VoicePanel";
export default function Interview() {
    const { id } = useParams();
    const sessionId = Number(id);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const continuousFromUrl = searchParams.get("continuous") === "1";
    const [finishing, setFinishing] = useState(false);
    const [started, setStarted] = useState(false);
    const [localStartedAt, setLocalStartedAt] = useState(null);
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
    // Resume (C4): если сессия уже была начата ранее — автоматически открываем VoicePanel.
    useEffect(() => {
        if (!data)
            return;
        if (data.status === "active" && !started) {
            setStarted(true);
            if (data.started_at) {
                setLocalStartedAt(new Date(data.started_at).getTime());
            }
            else if (localStartedAt === null) {
                setLocalStartedAt(Date.now());
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.status, data?.started_at]);
    async function onFinish() {
        if (!confirm("Завершить интервью и сформировать отчёт?"))
            return;
        setFinishing(true);
        try {
            const r = await api.post(`/api/sessions/${sessionId}/finish`);
            navigate(`/sessions/${r.data.session.id}/report`);
        }
        finally {
            setFinishing(false);
        }
    }
    if (isLoading || !data)
        return _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0435\u0441\u0441\u0438\u0438..." });
    const totalVoice = data.items.filter((i) => i.type === "voice").length;
    const continuous = continuousFromUrl && data.mode === "voice";
    const isTextMode = data.mode === "text";
    return (_jsxs("div", { className: "space-y-4 h-[calc(100vh-110px)] flex flex-col", children: [_jsx(Breadcrumbs, { items: [
                    { label: "Проекты", to: "/projects" },
                    ...(reqQ.data
                        ? [{ label: reqQ.data.title, to: `/requirements/${data.requirements_id}` }]
                        : []),
                    { label: `Сессия #${data.id}` },
                ] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-xl font-semibold", children: ["\u0418\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u2014 \u0443\u0440\u043E\u0432\u0435\u043D\u044C ", data.selected_level, " ", _jsxs("span", { className: "text-sm font-normal text-slate-500", children: ["\u00B7 ", isTextMode ? "текст" : "голос", continuous && " · непрерывный"] })] }), _jsxs("div", { className: "text-sm text-slate-500", children: ["\u0422\u0435\u043C\u044B: ", data.selected_topics.join(", ")] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(SessionTimer, { startedAtIso: data.started_at, localStartedAtMs: localStartedAt, targetMin: data.target_duration_min ?? 12, running: started && data.status !== "finished" }), !started && (_jsx("button", { type: "button", onClick: () => {
                                    setStarted(true);
                                    setLocalStartedAt(Date.now());
                                }, className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm", children: "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" })), _jsx("button", { type: "button", onClick: onFinish, disabled: finishing, className: "bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50", children: finishing ? "Формирую отчёт..." : "Завершить досрочно" })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0", children: [started ? (_jsx(VoicePanel, { sessionId: sessionId, totalVoice: totalVoice, continuous: continuous, textMode: isTextMode })) : (_jsx(VoiceStartStub, { totalVoice: totalVoice, durationMin: data.target_duration_min ?? 12, onStart: () => {
                            setStarted(true);
                            setLocalStartedAt(Date.now());
                        } })), _jsx(CodingPanel, { session: data })] })] }));
}
function SessionTimer({ startedAtIso, localStartedAtMs, targetMin, running, }) {
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
    if (startMs === null) {
        return (_jsxs("span", { className: "text-sm text-slate-400 tabular-nums", children: ["--:-- / ", targetMin, ":00"] }));
    }
    const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
    const remainingSec = Math.max(0, totalSec - elapsedSec);
    const mm = Math.floor(remainingSec / 60).toString().padStart(2, "0");
    const ss = (remainingSec % 60).toString().padStart(2, "0");
    let cls = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (remainingSec === 0)
        cls = "text-rose-700 bg-rose-50 border-rose-200";
    else if (remainingSec <= 120)
        cls = "text-amber-700 bg-amber-50 border-amber-200";
    return (_jsxs("span", { className: `text-sm tabular-nums px-3 py-1.5 rounded-lg border font-medium ${cls}`, title: `Сессия: ${targetMin} мин`, children: ["\u23F1 ", mm, ":", ss] }));
}
function VoiceStartStub({ totalVoice, durationMin, onStart, }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full bg-white border rounded-lg p-8 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-8 h-8", "aria-hidden": true, children: [_jsx("path", { d: "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" }), _jsx("path", { d: "M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" })] }) }), _jsx("h3", { className: "font-semibold text-lg", children: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0433\u043E\u0442\u043E\u0432\u043E" }), _jsxs("p", { className: "text-sm text-slate-500 mt-2 max-w-xs", children: ["\u0411\u0443\u0434\u0435\u0442 \u0437\u0430\u0434\u0430\u043D\u043E \u0434\u043E ", totalVoice, " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432. \u0421\u0435\u0441\u0441\u0438\u044F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0430 ", durationMin, " \u043C\u0438\u043D\u0443\u0442\u0430\u043C\u0438. \u041C\u043E\u0436\u043D\u043E \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u0438\u0442\u044C\u0441\u044F \u0441 \u043A\u043E\u0434\u0438\u043D\u0433-\u0437\u0430\u0434\u0430\u0447\u0435\u0439 \u0441\u043F\u0440\u0430\u0432\u0430, \u0430 \u043A\u043E\u0433\u0434\u0430 \u0431\u0443\u0434\u0435\u0442\u0435 \u0433\u043E\u0442\u043E\u0432\u044B \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443. \u0422\u0430\u0439\u043C\u0435\u0440 \u043F\u043E\u0439\u0434\u0451\u0442 \u0441\u0440\u0430\u0437\u0443."] }), _jsx("button", { type: "button", onClick: onStart, className: "mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium", children: "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" })] }));
}
