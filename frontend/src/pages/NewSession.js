import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
const LEVELS = ["junior", "middle", "senior"];
export default function NewSession() {
    const { id } = useParams();
    const reqId = Number(id);
    const navigate = useNavigate();
    const [selectedTopics, setSelectedTopics] = useState(new Set());
    const [level, setLevel] = useState("middle");
    const [mode, setMode] = useState("voice");
    const [duration, setDuration] = useState(12);
    const [continuous, setContinuous] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const { data, isLoading } = useQuery({
        queryKey: ["requirements", reqId],
        queryFn: async () => (await api.get(`/api/requirements/${reqId}`)).data,
        enabled: Number.isFinite(reqId),
    });
    const matrix = useMemo(() => {
        const m = {};
        for (const t of data?.topics ?? []) {
            m[t.name] = { junior: 0, middle: 0, senior: 0 };
        }
        for (const q of data?.bank ?? []) {
            if (!m[q.topic])
                m[q.topic] = { junior: 0, middle: 0, senior: 0 };
            m[q.topic][q.level] += 1;
        }
        return m;
    }, [data]);
    function toggleTopic(name) {
        setSelectedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(name))
                next.delete(name);
            else
                next.add(name);
            return next;
        });
    }
    async function onStart() {
        if (selectedTopics.size === 0) {
            setError("Выберите хотя бы одну тему");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const r = await api.post("/api/sessions", {
                requirements_id: reqId,
                selected_topics: Array.from(selectedTopics),
                selected_level: level,
                mode,
                target_duration_min: duration,
            });
            const url = `/sessions/${r.data.id}/interview${mode === "voice" && continuous ? "?continuous=1" : ""}`;
            navigate(url);
        }
        catch (e) {
            setError(e?.response?.data?.detail || "Не удалось создать сессию");
        }
        finally {
            setBusy(false);
        }
    }
    if (isLoading || !data)
        return _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Breadcrumbs, { items: [
                    { label: "Проекты", to: "/projects" },
                    { label: data.title, to: `/requirements/${reqId}` },
                    { label: "Новая сессия" },
                ] }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: data.title }), _jsx("p", { className: "text-slate-600 mt-2 leading-relaxed", children: data.summary })] }), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0422\u0435\u043C\u044B \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: data.topics.map((t) => {
                            const checked = selectedTopics.has(t.name);
                            const stat = matrix[t.name] || { junior: 0, middle: 0, senior: 0 };
                            return (_jsxs("label", { className: `flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${checked ? "border-brand bg-indigo-50" : "border-slate-200"}`, children: [_jsx("input", { type: "checkbox", className: "mt-1", checked: checked, onChange: () => toggleTopic(t.name) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium", children: t.name }), _jsx("div", { className: "text-sm text-slate-600", children: t.description }), _jsxs("div", { className: "text-xs text-slate-400 mt-1", children: ["junior: ", stat.junior, " \u2022 middle: ", stat.middle, " \u2022 senior: ", stat.senior] })] })] }, t.name));
                        }) })] }), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }), _jsx("div", { className: "flex gap-3", children: LEVELS.map((l) => (_jsxs("label", { className: `flex-1 border rounded-lg p-3 cursor-pointer text-center ${level === l ? "border-brand bg-indigo-50" : "border-slate-200"}`, children: [_jsx("input", { type: "radio", className: "hidden", checked: level === l, onChange: () => setLevel(l) }), _jsx("span", { className: "capitalize font-medium", children: l })] }, l))) })] }), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0424\u043E\u0440\u043C\u0430\u0442 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("label", { className: `border rounded-lg p-3 cursor-pointer ${mode === "voice" ? "border-brand bg-indigo-50" : "border-slate-200"}`, children: [_jsx("input", { type: "radio", className: "hidden", checked: mode === "voice", onChange: () => setMode("voice") }), _jsx("div", { className: "font-medium", children: "\uD83C\uDF99 \u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435" }), _jsx("div", { className: "text-xs text-slate-500 mt-1", children: "\u0418\u0418 \u0437\u0430\u0434\u0430\u0451\u0442 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0433\u043E\u043B\u043E\u0441\u043E\u043C, \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D. STT + TTS." })] }), _jsxs("label", { className: `border rounded-lg p-3 cursor-pointer ${mode === "text" ? "border-brand bg-indigo-50" : "border-slate-200"}`, children: [_jsx("input", { type: "radio", className: "hidden", checked: mode === "text", onChange: () => setMode("text") }), _jsx("div", { className: "font-medium", children: "\u2328 \u0422\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435" }), _jsx("div", { className: "text-xs text-slate-500 mt-1", children: "\u0412\u0441\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0432\u0435\u0442\u044B \u0432 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u043C \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435. \u0411\u0435\u0437 TTS / STT." })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-4", children: [_jsxs("label", { className: "text-sm flex items-center gap-2", children: [_jsx("span", { className: "text-slate-600", children: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C:" }), _jsxs("select", { value: duration, onChange: (e) => setDuration(Number(e.target.value)), className: "border rounded-lg px-2 py-1", children: [_jsx("option", { value: 10, children: "10 \u043C\u0438\u043D" }), _jsx("option", { value: 12, children: "12 \u043C\u0438\u043D" }), _jsx("option", { value: 15, children: "15 \u043C\u0438\u043D" }), _jsx("option", { value: 20, children: "20 \u043C\u0438\u043D" })] })] }), mode === "voice" && (_jsxs("label", { className: "text-sm flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: continuous, onChange: (e) => setContinuous(e.target.checked) }), _jsx("span", { children: "\u041D\u0435\u043F\u0440\u0435\u0440\u044B\u0432\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C" }), _jsx("span", { className: "text-xs text-slate-400", children: "(\u0437\u0430\u043F\u0438\u0441\u044C \u0441\u0442\u0430\u0440\u0442\u0443\u0435\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u0441\u043B\u0435 \u043E\u0446\u0435\u043D\u043A\u0438)" })] }))] })] }), error && _jsx("div", { className: "text-rose-600 text-sm", children: error }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: onStart, disabled: busy, className: "bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg disabled:opacity-50", children: busy ? "Готовим сессию..." : "Начать интервью" }) })] }));
}
