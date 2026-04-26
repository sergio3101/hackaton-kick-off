import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Icon from "../components/Icon";
export default function Projects() {
    const { data, isLoading } = useQuery({
        queryKey: ["requirements"],
        queryFn: async () => (await api.get("/api/requirements")).data,
    });
    const statsQueries = useQueries({
        queries: (data || []).map((r) => ({
            queryKey: ["requirements-stats", r.id],
            queryFn: async () => (await api.get(`/api/requirements/${r.id}/stats`)).data,
            enabled: !!r.id,
        })),
    });
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["PROJECTS \u00B7 ", data?.length ?? 0] }), _jsx("h1", { className: "page-title", children: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B" }), _jsx("div", { className: "page-sub", children: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0435 \u0422\u0417 \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0431\u0430\u043D\u043A\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432." })] }), _jsxs(Link, { to: "/upload", className: "btn btn--primary", children: [_jsx(Icon, { name: "plus", size: 14 }), " \u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0435\u043A\u0442"] })] }), isLoading && (_jsx("div", { className: "card", style: { color: "var(--ink-3)", textAlign: "center" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })), !isLoading && (data?.length ?? 0) === 0 && (_jsxs("div", { className: "card", style: {
                    padding: 40,
                    textAlign: "center",
                    color: "var(--ink-3)",
                }, children: ["\u0423 \u0432\u0430\u0441 \u0435\u0449\u0451 \u043D\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432.", _jsx("div", { style: { marginTop: 14 }, children: _jsxs(Link, { to: "/upload", className: "btn btn--primary", children: [_jsx(Icon, { name: "upload", size: 14 }), " \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C .md \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B"] }) })] })), _jsx("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                    gap: 14,
                }, children: data?.map((r, idx) => {
                    const stats = statsQueries[idx]?.data;
                    return (_jsxs("div", { className: "card", children: [_jsx("div", { style: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    marginBottom: 8,
                                }, children: _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("h3", { style: {
                                                fontSize: 16,
                                                fontWeight: 500,
                                                letterSpacing: "-0.01em",
                                                margin: 0,
                                            }, children: r.title }), _jsx("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)", marginTop: 4 }, children: new Date(r.created_at).toLocaleString("ru-RU") })] }) }), stats && stats.sessions_total > 0 && (_jsxs("div", { style: {
                                    display: "flex",
                                    gap: 14,
                                    fontSize: 11,
                                    color: "var(--ink-3)",
                                    marginBottom: 10,
                                    flexWrap: "wrap",
                                }, children: [_jsxs("span", { children: [_jsx("span", { className: "mono", style: { color: "var(--ink-1)" }, children: stats.sessions_total }), " ", "\u0441\u0435\u0441\u0441\u0438\u0439"] }), stats.sessions_finished > 0 && (_jsxs("span", { children: ["score", " ", _jsxs("span", { className: "mono", style: { color: "var(--accent)" }, children: [Math.round(stats.avg_score * 100), "%"] })] })), stats.last_session_at && (_jsx("span", { children: timeAgo(stats.last_session_at) }))] })), r.summary && (_jsx("p", { style: {
                                    fontSize: 13,
                                    color: "var(--ink-2)",
                                    lineHeight: 1.55,
                                    margin: "0 0 12px",
                                }, children: r.summary })), r.topics.length > 0 && (_jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }, children: [r.topics.slice(0, 8).map((t) => (_jsx("span", { className: "tag", children: t.name }, t.name))), r.topics.length > 8 && (_jsxs("span", { className: "tag", children: ["+", r.topics.length - 8] }))] })), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx(Link, { to: `/requirements/${r.id}`, className: "btn btn--sm", style: { flex: 1, justifyContent: "center" }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" }), _jsxs(Link, { to: "/admin/assignments", className: "btn btn--primary btn--sm", style: { flex: 1, justifyContent: "center" }, children: [_jsx(Icon, { name: "tag", size: 11 }), " \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C"] })] })] }, r.id));
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
