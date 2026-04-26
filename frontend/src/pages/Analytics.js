import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import Icon from "../components/Icon";
import { Kpi } from "../components/UI";
export default function Analytics() {
    const { data, isLoading } = useQuery({
        queryKey: ["analytics-overview"],
        queryFn: async () => (await api.get("/api/analytics/overview")).data,
    });
    if (isLoading || !data) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438..." }));
    }
    const empty = data.total_questions_answered === 0;
    const trendData = data.trend_30d.map((t) => t.sessions);
    const scoreSpark = data.trend_30d.map((t) => Math.round(t.avg_score * 100));
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: "ANALYTICS \u00B7 TEAM PERFORMANCE" }), _jsx("h1", { className: "page-title", children: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430" }), _jsx("div", { className: "page-sub", children: "\u0422\u0440\u0435\u043D\u0434, \u0442\u0435\u043C\u044B, \u0441\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u2014 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u0435\u0439\u0447\u0430\u0441." })] }), _jsxs("button", { className: "btn", children: [_jsx(Icon, { name: "doc", size: 14 }), " \u042D\u043A\u0441\u043F\u043E\u0440\u0442"] })] }), empty && (_jsx("div", { className: "state-block state-block--warn", style: { marginBottom: 18, padding: "14px 18px" }, children: _jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [_jsx(Icon, { name: "sparkle", size: 14 }), "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u2014 \u043F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u043F\u043E \u0442\u0435\u043C\u0430\u043C \u0438 \u0442\u0440\u0435\u043D\u0434."] }) })), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginBottom: 18,
                }, children: [_jsx(Kpi, { label: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 score", value: `${(data.overall_avg_score * 100).toFixed(0)}%`, hint: "\u043F\u043E \u0432\u0441\u0435\u043C \u043E\u0442\u0432\u0435\u0442\u0430\u043C", sparkData: scoreSpark.length ? scoreSpark : [40, 50, 45, 55, 60] }), _jsx(Kpi, { label: "\u0421\u0435\u0441\u0441\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", value: data.finished_sessions, hint: `всего: ${data.total_sessions}`, sparkData: trendData.length ? trendData : [0, 1, 0, 2, 1, 3, 2] }), _jsx(Kpi, { label: "\u041E\u0442\u0432\u0435\u0442\u043E\u0432", value: data.total_questions_answered, hint: "\u0441\u0443\u043C\u043C\u0430\u0440\u043D\u043E", sparkData: [1, 2, 1, 3, 2, 4, 3, 5, 4, 6] }), _jsx(Kpi, { label: "\u0423\u0440\u043E\u0432\u043D\u0435\u0439", value: data.by_level.length, hint: "\u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435", sparkColor: "var(--warn)", sparkData: data.by_level.map((b) => b.sessions) })] }), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                    marginBottom: 18,
                }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 16,
                                }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "Score \u043F\u043E \u0442\u0435\u043C\u0430\u043C" }), _jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: [data.by_topic.length, " \u0442\u0435\u043C"] })] }), data.by_topic.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: "var(--ink-3)" }, children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" })) : (_jsx(TopicBars, { topics: data.by_topic }))] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 16,
                                }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "\u0421\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u2014 \u0447\u0442\u043E \u043F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u044C" }), data.weak_topics.length > 0 && (_jsxs("span", { className: "pill pill--danger", children: [data.weak_topics.length, " \u0442\u0435\u043C"] }))] }), data.weak_topics.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: "var(--ink-3)" }, children: "\u041D\u0435\u0442 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0445 \u0442\u0435\u043C \u2014 \u0432\u0441\u0435 score \u2265 50%" })) : (_jsx(TopicBars, { topics: data.weak_topics, variant: "weak" }))] })] }), _jsxs("div", { className: "card", style: { marginBottom: 18 }, children: [_jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                        }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0437\u0430 30 \u0434\u043D\u0435\u0439" }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: 14,
                                    fontSize: 11,
                                    color: "var(--ink-3)",
                                    alignItems: "center",
                                }, children: [_jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { className: "dot", style: { background: "var(--accent)" } }), " \u2265 70%"] }), _jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { className: "dot", style: { background: "var(--warn)" } }), " 40\u201370%"] }), _jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { className: "dot", style: { background: "var(--danger)" } }), " < 40%"] })] })] }), _jsx(TrendChart, { trend: data.trend_30d })] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 500, marginBottom: 12 }, children: "\u0421\u0435\u0441\u0441\u0438\u0438 \u043F\u043E \u0443\u0440\u043E\u0432\u043D\u044F\u043C" }), data.by_level.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: "var(--ink-3)" }, children: "\u041D\u0435\u0442 \u0441\u0435\u0441\u0441\u0438\u0439" })) : (_jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 }, children: data.by_level.map((b) => (_jsxs("div", { style: {
                                padding: "10px 16px",
                                background: "var(--bg-2)",
                                border: "1px solid var(--bg-line)",
                                borderRadius: "var(--r-2)",
                            }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)" }, children: b.level }), _jsx("div", { className: "mono", style: {
                                        fontSize: 22,
                                        fontWeight: 500,
                                        marginTop: 4,
                                        color: "var(--ink-1)",
                                    }, children: b.sessions })] }, b.level))) }))] })] }));
}
function TopicBars({ topics, variant = "default", }) {
    return (_jsx("div", { children: topics.map((t) => {
            const pct = Math.round(t.avg_score * 100);
            const fillVariant = variant === "weak"
                ? "bar-row__fill--danger"
                : pct >= 70
                    ? ""
                    : pct >= 40
                        ? "bar-row__fill--warn"
                        : "bar-row__fill--danger";
            return (_jsxs("div", { className: "bar-row", children: [_jsx("div", { className: "bar-row__label", title: t.topic, children: t.topic }), _jsx("div", { className: "bar-row__track", children: _jsx("div", { className: `bar-row__fill ${fillVariant}`, style: { width: `${pct}%` } }) }), _jsxs("div", { className: "bar-row__num", children: [pct, "% \u00B7 ", t.answered] })] }, t.topic));
        }) }));
}
function TrendChart({ trend }) {
    const max = Math.max(1, ...trend.map((p) => p.sessions));
    const totalSessions = trend.reduce((acc, p) => acc + p.sessions, 0);
    if (totalSessions === 0) {
        return (_jsx("div", { style: { fontSize: 13, color: "var(--ink-3)" }, children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439" }));
    }
    return (_jsxs("div", { children: [_jsx("div", { style: {
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 140,
                }, children: trend.map((p) => {
                    const h = (p.sessions / max) * 100;
                    const color = p.sessions === 0
                        ? "var(--bg-3)"
                        : p.avg_score >= 0.7
                            ? "var(--accent)"
                            : p.avg_score >= 0.4
                                ? "var(--warn)"
                                : "var(--danger)";
                    return (_jsx("div", { style: {
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            height: "100%",
                        }, title: `${p.date}: ${p.sessions} сессий, score ${(p.avg_score * 100).toFixed(0)}%`, children: _jsx("div", { style: {
                                background: color,
                                height: `${h}%`,
                                minHeight: p.sessions ? 6 : 2,
                                borderRadius: 3,
                                opacity: 0.85,
                            } }) }, p.date));
                }) }), _jsxs("div", { className: "mono", style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--ink-4)",
                    marginTop: 6,
                }, children: [_jsx("span", { children: trend[0]?.date }), _jsx("span", { children: trend[trend.length - 1]?.date })] })] }));
}
