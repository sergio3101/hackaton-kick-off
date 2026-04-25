import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
export default function Projects() {
    const { data, isLoading } = useQuery({
        queryKey: ["requirements"],
        queryFn: async () => (await api.get("/api/requirements")).data,
    });
    // Мини-статистика по каждому проекту: загружаем параллельно.
    const statsQueries = useQueries({
        queries: (data || []).map((r) => ({
            queryKey: ["requirements-stats", r.id],
            queryFn: async () => (await api.get(`/api/requirements/${r.id}/stats`)).data,
            enabled: !!r.id,
        })),
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B" }), _jsx(Link, { to: "/upload", className: "bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm", children: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0435\u043A\u0442" })] }), isLoading && _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), !isLoading && (data?.length ?? 0) === 0 && (_jsxs("div", { className: "bg-white p-10 rounded-xl border text-center text-slate-500", children: ["\u0423 \u0432\u0430\u0441 \u0435\u0449\u0451 \u043D\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432.", " ", _jsx(Link, { to: "/upload", className: "text-brand hover:underline", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C .md \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B" })] })), _jsx("div", { className: "grid gap-4", children: data?.map((r, idx) => {
                    const stats = statsQueries[idx]?.data;
                    return (_jsxs("div", { className: "bg-white p-5 rounded-xl border", children: [_jsxs("div", { className: "flex justify-between items-start gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-lg", children: r.title }), _jsx("div", { className: "text-xs text-slate-400 mt-1", children: new Date(r.created_at).toLocaleString("ru-RU") })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx(Link, { to: `/requirements/${r.id}`, className: "border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-1.5 rounded-lg text-sm", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" }), _jsx(Link, { to: `/requirements/${r.id}/new-session`, className: "bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm", children: "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" })] })] }), stats && stats.sessions_total > 0 && (_jsxs("div", { className: "text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap", children: [_jsxs("span", { children: [stats.sessions_total, " \u0441\u0435\u0441\u0441\u0438\u0439"] }), stats.sessions_finished > 0 && (_jsxs("span", { children: ["\u0441\u0440\u0435\u0434\u043D\u0438\u0439 score ", Math.round(stats.avg_score * 100), "%"] })), stats.last_session_at && (_jsxs("span", { children: ["\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F ", timeAgo(stats.last_session_at)] }))] })), r.summary && (_jsx("p", { className: "text-slate-700 text-sm mt-3 leading-relaxed", children: r.summary })), r.topics.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: r.topics.map((t) => (_jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs", children: t.name }, t.name))) }))] }, r.id));
                }) })] }));
}
function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0)
        return "сегодня";
    if (days === 1)
        return "вчера";
    if (days < 30)
        return `${days} дн назад`;
    const months = Math.floor(days / 30);
    return `${months} мес назад`;
}
