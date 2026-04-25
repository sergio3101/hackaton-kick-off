import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
export default function Analytics() {
    const { data, isLoading } = useQuery({
        queryKey: ["analytics-overview"],
        queryFn: async () => (await api.get("/api/analytics/overview")).data,
    });
    if (isLoading || !data)
        return _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438..." });
    const empty = data.total_questions_answered === 0;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430" }), _jsxs("div", { className: "text-sm text-slate-500", children: ["\u0421\u0435\u0441\u0441\u0438\u0439: ", data.total_sessions, " \u2022 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E: ", data.finished_sessions, " \u2022 \u041E\u0442\u0432\u0435\u0442\u043E\u0432:", " ", data.total_questions_answered] })] }), empty && (_jsx("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900", children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u2014 \u043F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u043F\u043E \u0442\u0435\u043C\u0430\u043C \u0438 \u0442\u0440\u0435\u043D\u0434." })), _jsxs("section", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsx(KpiCard, { label: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 score", value: `${(data.overall_avg_score * 100).toFixed(0)}%`, color: "text-emerald-700" }), _jsx(KpiCard, { label: "\u0421\u0435\u0441\u0441\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", value: String(data.finished_sessions), color: "text-sky-700" }), _jsx(KpiCard, { label: "\u041E\u0442\u0432\u0435\u0442\u043E\u0432 \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441\u044B", value: String(data.total_questions_answered), color: "text-slate-700" })] }), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "Score \u043F\u043E \u0442\u0435\u043C\u0430\u043C" }), data.by_topic.length === 0 ? (_jsx("div", { className: "text-sm text-slate-400", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" })) : (_jsx(TopicBars, { topics: data.by_topic }))] }), data.weak_topics.length > 0 && (_jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0421\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u2014 \u0447\u0442\u043E \u043F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u044C" }), _jsx(TopicBars, { topics: data.weak_topics, variant: "weak" })] })), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0437\u0430 30 \u0434\u043D\u0435\u0439" }), _jsx(TrendChart, { trend: data.trend_30d })] }), _jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0421\u0435\u0441\u0441\u0438\u0438 \u043F\u043E \u0443\u0440\u043E\u0432\u043D\u044F\u043C" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [data.by_level.map((b) => (_jsxs("div", { className: "px-3 py-2 rounded-lg border bg-slate-50 text-sm", children: [_jsx("span", { className: "text-slate-500", children: b.level }), ":", " ", _jsx("strong", { children: b.sessions })] }, b.level))), data.by_level.length === 0 && (_jsx("div", { className: "text-sm text-slate-400", children: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439" }))] })] })] }));
}
function KpiCard({ label, value, color }) {
    return (_jsxs("div", { className: "bg-white border rounded-xl p-4", children: [_jsx("div", { className: "text-xs text-slate-500", children: label }), _jsx("div", { className: `text-3xl font-semibold mt-1 ${color}`, children: value })] }));
}
function TopicBars({ topics, variant = "default" }) {
    return (_jsx("div", { className: "space-y-2", children: topics.map((t) => {
            const pct = Math.round(t.avg_score * 100);
            const color = variant === "weak"
                ? "bg-rose-500"
                : pct >= 70
                    ? "bg-emerald-500"
                    : pct >= 40
                        ? "bg-amber-500"
                        : "bg-rose-500";
            return (_jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsx("div", { className: "w-40 text-slate-700 truncate", title: t.topic, children: t.topic }), _jsx("div", { className: "flex-1 bg-slate-100 rounded h-3 overflow-hidden", children: _jsx("div", { className: `h-full ${color}`, style: { width: `${pct}%` } }) }), _jsxs("div", { className: "w-20 text-right text-slate-600 tabular-nums", children: [pct, "% \u00B7 ", t.answered] })] }, t.topic));
        }) }));
}
function TrendChart({ trend }) {
    const max = Math.max(1, ...trend.map((p) => p.sessions));
    const totalSessions = trend.reduce((acc, p) => acc + p.sessions, 0);
    if (totalSessions === 0) {
        return _jsx("div", { className: "text-sm text-slate-400", children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439" });
    }
    return (_jsxs("div", { children: [_jsx("div", { className: "flex items-end gap-1 h-32", children: trend.map((p) => {
                    const h = (p.sessions / max) * 100;
                    const score = p.avg_score;
                    const color = p.sessions === 0
                        ? "bg-slate-100"
                        : score >= 0.7
                            ? "bg-emerald-500"
                            : score >= 0.4
                                ? "bg-amber-500"
                                : "bg-rose-500";
                    return (_jsx("div", { className: "flex-1 flex flex-col justify-end", title: `${p.date}: ${p.sessions} сессий, score ${(score * 100).toFixed(0)}%`, children: _jsx("div", { className: `${color} rounded-sm transition-all`, style: { height: `${h}%`, minHeight: p.sessions > 0 ? "4px" : "1px" } }) }, p.date));
                }) }), _jsxs("div", { className: "flex justify-between text-xs text-slate-400 mt-2", children: [_jsx("span", { children: trend[0]?.date }), _jsx("span", { children: trend[trend.length - 1]?.date })] })] }));
}
