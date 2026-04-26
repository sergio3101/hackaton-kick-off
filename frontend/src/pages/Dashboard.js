import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import Icon from "../components/Icon";
import { Kpi, StatusPill, Wave } from "../components/UI";
export default function Dashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const projectsQ = useQuery({
        queryKey: ["requirements"],
        queryFn: async () => (await api.get("/api/requirements")).data,
        enabled: isAdmin,
    });
    const sessionsQ = useQuery({
        queryKey: ["sessions"],
        queryFn: async () => (await api.get("/api/sessions")).data,
        enabled: isAdmin,
    });
    const analyticsQ = useQuery({
        queryKey: ["analytics-overview"],
        queryFn: async () => (await api.get("/api/analytics/overview")).data,
        enabled: isAdmin,
    });
    if (!isAdmin)
        return _jsx(Navigate, { to: "/me/assignments", replace: true });
    const projects = projectsQ.data ?? [];
    const sessions = sessionsQ.data ?? [];
    const isEmpty = !projectsQ.isLoading && projects.length === 0;
    const activeSession = sessions.find((s) => s.status === "active");
    const lastFinished = sessions.find((s) => s.status === "finished");
    const overview = analyticsQ.data;
    const activeCount = sessions.filter((s) => s.status === "active").length;
    if (isEmpty) {
        return _jsx(OnboardingWizard, {});
    }
    const trendData = overview?.trend_30d?.map((t) => t.sessions) ?? [];
    const scoreData = overview?.trend_30d?.map((t) => Math.round(t.avg_score * 100)) ?? [];
    const now = new Date();
    const dateLine = now
        .toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
        .toUpperCase();
    const timeLine = now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: [_jsx("span", { className: "dot dot--live", style: { marginRight: 6 } }), dateLine, " \u00B7 ", timeLine] }), _jsx("h1", { className: "page-title", children: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsxs("div", { className: "page-sub", children: ["\u041F\u0440\u0438\u0432\u0435\u0442, ", user?.email?.split("@")[0], ". \u0423 \u0432\u0430\u0441", " ", _jsxs("strong", { style: { color: "var(--ink-1)" }, children: [activeCount, " \u0430\u043A\u0442\u0438\u0432\u043D", activeCount === 1 ? "ая" : "ых", " \u0441\u0435\u0441\u0441\u0438", activeCount === 1 ? "я" : "й"] }), " ", "\u0438 ", _jsxs("strong", { style: { color: "var(--ink-1)" }, children: [projects.length, " \u043F\u0440\u043E\u0435\u043A\u0442", projects.length === 1 ? "" : projects.length < 5 ? "а" : "ов"] }), " \u0432 \u0440\u0430\u0431\u043E\u0442\u0435."] })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsxs(Link, { to: "/upload", className: "btn", children: [_jsx(Icon, { name: "upload", size: 14 }), "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0422\u0417"] }), _jsxs(Link, { to: "/admin/assignments", className: "btn btn--primary", children: [_jsx(Icon, { name: "tag", size: 14 }), "\u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C kick-off"] })] })] }), overview && (_jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginBottom: 18,
                }, children: [_jsx(Kpi, { label: "\u0421\u0435\u0441\u0441\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", value: overview.finished_sessions, delta: overview.finished_sessions > 0 ? `+${overview.finished_sessions}` : undefined, deltaType: "up", hint: "\u0432\u0441\u0435\u0433\u043E", sparkData: trendData.length ? trendData : [0, 1, 0, 2, 1, 3, 2] }), _jsx(Kpi, { label: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 score", value: overview.total_questions_answered > 0
                            ? `${Math.round(overview.overall_avg_score * 100)}%`
                            : "—", hint: "\u043F\u043E \u043E\u0442\u0432\u0435\u0442\u0430\u043C", sparkData: scoreData.length ? scoreData : [40, 50, 45, 60, 55, 65, 70] }), _jsx(Kpi, { label: "\u041E\u0442\u0432\u0435\u0442\u043E\u0432", value: overview.total_questions_answered, hint: "\u0441\u0443\u043C\u043C\u0430\u0440\u043D\u043E", sparkData: [1, 2, 1, 3, 2, 4, 3, 5, 4, 6] }), _jsx(Kpi, { label: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0441\u0435\u0439\u0447\u0430\u0441", value: activeCount, hint: activeCount > 0 ? "в эфире · live" : "нет активных", sparkColor: "var(--warn)", sparkData: [2, 3, 2, 4, 3, 5, 4, 3, 4, 3] })] })), activeSession && (_jsxs("div", { className: "card", style: { marginBottom: 18, position: "relative", overflow: "hidden", padding: 0 }, children: [_jsx("div", { className: "zebra-stripes--soft", style: { position: "absolute", inset: 0, opacity: 0.7 } }), _jsxs("div", { style: {
                            position: "relative",
                            padding: 22,
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 24,
                            alignItems: "center",
                        }, children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: [_jsx("span", { className: "dot dot--live", style: { marginRight: 6 } }), "\u0410\u041A\u0422\u0418\u0412\u041D\u0410\u042F \u0421\u0415\u0421\u0421\u0418\u042F \u2014 \u0412 \u042D\u0424\u0418\u0420\u0415"] }), _jsxs("div", { style: {
                                            fontSize: 22,
                                            fontWeight: 500,
                                            letterSpacing: "-0.01em",
                                            marginBottom: 6,
                                        }, children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", activeSession.id, " \u00B7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C", " ", _jsx("span", { className: "mono", style: { color: "var(--accent)" }, children: activeSession.selected_level })] }), _jsxs("div", { style: {
                                            display: "flex",
                                            gap: 16,
                                            color: "var(--ink-2)",
                                            fontSize: 13,
                                            flexWrap: "wrap",
                                        }, children: [_jsxs("span", { children: ["\u0422\u0435\u043C\u044B:", " ", _jsx("span", { className: "mono", children: activeSession.selected_topics.join(", ") || "—" })] }), _jsx("span", { style: { color: "var(--ink-4)" }, children: "\u00B7" }), _jsxs("span", { children: ["\u0420\u0435\u0436\u0438\u043C:", " ", _jsx("span", { className: "mono", children: activeSession.mode })] })] })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx(Wave, { bars: 20, intense: 0.7 }), _jsxs(Link, { to: `/admin/sessions/${activeSession.id}`, className: "btn btn--primary", children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u044E ", _jsx(Icon, { name: "arrow-right", size: 14 })] })] })] })] })), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr",
                    gap: 18,
                    alignItems: "start",
                }, children: [_jsxs("div", { className: "card", style: { padding: 0, minWidth: 0, overflow: "hidden" }, children: [_jsxs("div", { style: {
                                    padding: "16px 20px 12px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderBottom: "1px solid var(--bg-line)",
                                }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u0438" }), _jsxs(Link, { to: "/sessions", className: "btn btn--sm btn--ghost", children: ["\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F ", _jsx(Icon, { name: "arrow-right", size: 12 })] })] }), sessions.length === 0 ? (_jsx("div", { style: {
                                    padding: "32px 20px",
                                    textAlign: "center",
                                    color: "var(--ink-3)",
                                    fontSize: 13,
                                }, children: "\u0421\u0435\u0441\u0441\u0438\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430" })) : (sessions.slice(0, 6).map((s) => (_jsxs(Link, { to: s.status === "finished"
                                    ? `/sessions/${s.id}/report`
                                    : `/admin/sessions/${s.id}`, style: {
                                    padding: "12px 20px",
                                    display: "grid",
                                    gridTemplateColumns: "60px 1fr 140px 80px 110px",
                                    gap: 16,
                                    alignItems: "center",
                                    borderBottom: "1px solid var(--bg-line)",
                                    fontSize: 13,
                                    cursor: "pointer",
                                }, children: [_jsxs("span", { className: "mono", style: { color: "var(--ink-3)" }, children: ["#", s.id] }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: s.selected_topics.slice(0, 3).join(", ") || "—" }), _jsxs("div", { style: { fontSize: 11, color: "var(--ink-3)" }, children: [s.mode, " \u00B7 ", s.target_duration_min, " \u043C\u0438\u043D"] })] }), _jsx("span", { className: "mono", style: { color: "var(--ink-3)", fontSize: 12 }, children: new Date(s.created_at).toLocaleString("ru-RU", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }) }), _jsx("span", { className: "pill", style: { background: "transparent" }, children: s.selected_level }), _jsx(StatusPill, { status: s.status })] }, s.id))))] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 18,
                            minWidth: 0,
                        }, children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card__label", children: "\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [_jsxs(Link, { to: "/admin/assignments", className: "btn", style: { justifyContent: "flex-start", padding: 12 }, children: [_jsx(Icon, { name: "tag", size: 14 }), "\u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C kick-off"] }), _jsxs(Link, { to: "/upload", className: "btn", style: { justifyContent: "flex-start", padding: 12 }, children: [_jsx(Icon, { name: "upload", size: 14 }), "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0422\u0417"] }), _jsxs(Link, { to: "/sessions", className: "btn", style: { justifyContent: "flex-start", padding: 12 }, children: [_jsx(Icon, { name: "search", size: 14 }), "\u041D\u0430\u0439\u0442\u0438 \u0441\u0435\u0441\u0441\u0438\u044E"] }), _jsxs(Link, { to: "/analytics", className: "btn", style: { justifyContent: "flex-start", padding: 12 }, children: [_jsx(Icon, { name: "chart", size: 14 }), "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430"] })] })] }), _jsxs("div", { className: "card", style: { padding: 0, overflow: "hidden" }, children: [_jsxs("div", { style: {
                                            padding: "16px 20px 12px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderBottom: "1px solid var(--bg-line)",
                                        }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B" }), _jsx(Link, { to: "/upload", className: "btn btn--sm btn--ghost", children: _jsx(Icon, { name: "plus", size: 12 }) })] }), projects.length === 0 ? (_jsx("div", { style: {
                                            padding: "20px",
                                            textAlign: "center",
                                            color: "var(--ink-3)",
                                            fontSize: 13,
                                        }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u0422\u0417" })) : (projects.slice(0, 4).map((p) => (_jsxs(Link, { to: `/requirements/${p.id}`, style: {
                                            padding: "14px 20px",
                                            borderBottom: "1px solid var(--bg-line)",
                                            cursor: "pointer",
                                            display: "block",
                                        }, children: [_jsxs("div", { style: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "baseline",
                                                    gap: 8,
                                                    marginBottom: 4,
                                                }, children: [_jsx("div", { style: {
                                                            fontWeight: 500,
                                                            flex: 1,
                                                            minWidth: 0,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }, title: p.title, children: p.title }), _jsxs("span", { className: "mono", style: {
                                                            fontSize: 12,
                                                            color: "var(--ink-3)",
                                                            whiteSpace: "nowrap",
                                                        }, children: [p.topics.length, " \u0442\u0435\u043C"] })] }), p.summary && (_jsx("div", { style: {
                                                    fontSize: 12,
                                                    color: "var(--ink-3)",
                                                    marginBottom: 8,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }, children: p.summary })), _jsxs("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: [p.topics.slice(0, 4).map((t) => (_jsx("span", { className: "tag", children: t.name }, t.name))), p.topics.length > 4 && (_jsxs("span", { className: "tag", children: ["+", p.topics.length - 4] }))] })] }, p.id))))] })] })] }), lastFinished && (_jsxs("div", { className: "card", style: { marginTop: 18 }, children: [_jsx("div", { className: "card__label", children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043E\u0442\u0447\u0451\u0442" }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                        }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 500, fontSize: 14 }, children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", lastFinished.id, " \u00B7 ", lastFinished.selected_level] }), _jsx("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)", marginTop: 4 }, children: new Date(lastFinished.created_at).toLocaleString("ru-RU") })] }), _jsxs(Link, { to: `/sessions/${lastFinished.id}/report`, className: "btn btn--sm", children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442 ", _jsx(Icon, { name: "arrow-right", size: 12 })] })] })] }))] }));
}
function OnboardingWizard() {
    return (_jsxs("div", { className: "page", children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: "ONBOARDING \u00B7 3 \u0428\u0410\u0413\u0410" }), _jsx("h1", { className: "page-title", children: "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C!" }), _jsx("div", { className: "page-sub", children: "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u0447\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0437\u0430 3 \u0448\u0430\u0433\u0430. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0422\u0417 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430." })] }) }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }, children: [_jsx(Step, { n: 1, title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0422\u0417", desc: "Markdown-\u0444\u0430\u0439\u043B\u044B \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442. \u0418\u0418 \u0438\u0437\u0432\u043B\u0435\u0447\u0451\u0442 \u0442\u0435\u043C\u044B \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442 \u0431\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432.", cta: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0422\u0417", to: "/upload", primary: true }), _jsx(Step, { n: 2, title: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u044E", desc: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0435\u043C\u044B \u0438 \u0443\u0440\u043E\u0432\u0435\u043D\u044C. \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C 10\u201315 \u043C\u0438\u043D\u0443\u0442.", cta: "\u041F\u043E\u0441\u043B\u0435 \u0448\u0430\u0433\u0430 1", to: "/projects" }), _jsx(Step, { n: 3, title: "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u043E\u0442\u0447\u0451\u0442", desc: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 Q&A + \u043B\u0430\u0439\u0432-\u043A\u043E\u0434\u0438\u043D\u0433. \u042D\u0442\u0430\u043B\u043E\u043D\u043D\u044B\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0438 \u0441\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u2014 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435.", cta: "\u041F\u043E\u0441\u043B\u0435 \u0448\u0430\u0433\u0430 2", to: "/analytics" })] })] }));
}
function Step({ n, title, desc, cta, to, primary = false, }) {
    return (_jsxs("div", { className: "card", children: [_jsx("div", { style: {
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: primary ? "var(--accent)" : "var(--bg-2)",
                    color: primary ? "var(--accent-ink)" : "var(--ink-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 13,
                    marginBottom: 12,
                }, children: n }), _jsx("div", { style: { fontWeight: 500, marginBottom: 6 }, children: title }), _jsx("div", { style: { fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.55 }, children: desc }), primary ? (_jsxs(Link, { to: to, className: "btn btn--primary btn--sm", children: [cta, " ", _jsx(Icon, { name: "arrow-right", size: 12 })] })) : (_jsx("span", { className: "mono upper", style: { color: "var(--ink-4)" }, children: cta }))] }));
}
