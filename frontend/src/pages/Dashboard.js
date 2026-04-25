import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
export default function Dashboard() {
    const projectsQ = useQuery({
        queryKey: ["requirements"],
        queryFn: async () => (await api.get("/api/requirements")).data,
    });
    const sessionsQ = useQuery({
        queryKey: ["sessions"],
        queryFn: async () => (await api.get("/api/sessions")).data,
    });
    const analyticsQ = useQuery({
        queryKey: ["analytics-overview"],
        queryFn: async () => (await api.get("/api/analytics/overview")).data,
    });
    const isEmpty = !projectsQ.isLoading && (projectsQ.data?.length ?? 0) === 0;
    const activeSession = sessionsQ.data?.find((s) => s.status === "active");
    const lastFinished = sessionsQ.data?.find((s) => s.status === "finished");
    const lastProject = projectsQ.data?.[0];
    const overview = analyticsQ.data;
    if (isEmpty) {
        return _jsx(OnboardingWizard, {});
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434" }), overview && (_jsxs("section", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsx(KpiCard, { label: "\u0421\u0435\u0441\u0441\u0438\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E", value: String(overview.finished_sessions), color: "text-sky-700" }), _jsx(KpiCard, { label: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 score", value: overview.total_questions_answered > 0
                            ? `${Math.round(overview.overall_avg_score * 100)}%`
                            : "—", color: "text-emerald-700" }), _jsx(KpiCard, { label: "\u041E\u0442\u0432\u0435\u0442\u043E\u0432 \u043D\u0430 \u0432\u043E\u043F\u0440\u043E\u0441\u044B", value: String(overview.total_questions_answered), color: "text-slate-700" })] })), activeSession && (_jsxs("section", { className: "bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-amber-700 font-medium", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F" }), _jsxs("div", { className: "text-lg font-semibold mt-1", children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", activeSession.id, " \u2022 \u0443\u0440\u043E\u0432\u0435\u043D\u044C ", activeSession.selected_level] }), _jsxs("div", { className: "text-sm text-slate-600 mt-1", children: ["\u0422\u0435\u043C\u044B: ", activeSession.selected_topics.join(", ")] })] }), _jsx(Link, { to: `/sessions/${activeSession.id}/interview`, className: "bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap", children: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u2192" })] })), _jsxs("section", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsx(ActionCard, { title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u044E", subtitle: lastProject ? `по «${lastProject.title}»` : "выберите проект", to: lastProject
                            ? `/requirements/${lastProject.id}/new-session`
                            : "/projects", primary: true }), _jsx(ActionCard, { title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u0422\u0417", subtitle: "Markdown-\u0444\u0430\u0439\u043B\u044B \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430", to: "/upload" }), _jsx(ActionCard, { title: "\u041F\u043E\u043B\u043D\u0430\u044F \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", subtitle: "\u0422\u0440\u0435\u043D\u0434, \u0442\u0435\u043C\u044B, \u0441\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430", to: "/analytics" })] }), lastFinished && (_jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("div", { className: "text-xs uppercase text-slate-400 mb-1", children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043E\u0442\u0447\u0451\u0442" }), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", lastFinished.id, " \u2022 ", lastFinished.selected_level] }), _jsx("div", { className: "text-xs text-slate-500 mt-1", children: new Date(lastFinished.created_at).toLocaleString("ru-RU") })] }), _jsx(Link, { to: `/sessions/${lastFinished.id}/report`, className: "text-sm text-brand hover:underline whitespace-nowrap", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442 \u2192" })] })] }))] }));
}
function KpiCard({ label, value, color }) {
    return (_jsxs("div", { className: "bg-white border rounded-xl p-4", children: [_jsx("div", { className: "text-xs text-slate-500", children: label }), _jsx("div", { className: `text-3xl font-semibold mt-1 ${color}`, children: value })] }));
}
function ActionCard({ title, subtitle, to, primary = false, }) {
    return (_jsxs(Link, { to: to, className: `block rounded-xl border p-5 transition-colors ${primary
            ? "bg-brand text-white border-brand hover:bg-brand-dark"
            : "bg-white hover:border-brand"}`, children: [_jsx("div", { className: "font-semibold", children: title }), _jsx("div", { className: `text-sm mt-1 ${primary ? "text-white/80" : "text-slate-500"}`, children: subtitle })] }));
}
function OnboardingWizard() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C!" }), _jsx("p", { className: "text-slate-600", children: "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u0447\u043D\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0437\u0430 3 \u0448\u0430\u0433\u0430. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0422\u0417 \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430." }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Step, { n: 1, title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0422\u0417", desc: "Markdown-\u0444\u0430\u0439\u043B\u044B \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442. \u0418\u0418 \u0438\u0437\u0432\u043B\u0435\u0447\u0451\u0442 \u0442\u0435\u043C\u044B \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442 \u0431\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432.", cta: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0422\u0417", to: "/upload", primary: true }), _jsx(Step, { n: 2, title: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u044E", desc: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0435\u043C\u044B \u0438 \u0443\u0440\u043E\u0432\u0435\u043D\u044C. \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C 10\u201315 \u043C\u0438\u043D\u0443\u0442.", cta: "\u041F\u043E\u0441\u043B\u0435 \u0448\u0430\u0433\u0430 1", to: "/projects" }), _jsx(Step, { n: 3, title: "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u043E\u0442\u0447\u0451\u0442", desc: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435 Q&A + \u043B\u0430\u0439\u0432-\u043A\u043E\u0434\u0438\u043D\u0433. \u042D\u0442\u0430\u043B\u043E\u043D\u043D\u044B\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0438 \u0441\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u2014 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435.", cta: "\u041F\u043E\u0441\u043B\u0435 \u0448\u0430\u0433\u0430 2", to: "/analytics" })] })] }));
}
function Step({ n, title, desc, cta, to, primary = false, }) {
    return (_jsxs("div", { className: "bg-white border rounded-xl p-5", children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3 ${primary ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`, children: n }), _jsx("div", { className: "font-semibold mb-1", children: title }), _jsx("div", { className: "text-sm text-slate-600 mb-3 leading-relaxed", children: desc }), primary ? (_jsx(Link, { to: to, className: "inline-block bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm", children: cta })) : (_jsx("span", { className: "text-xs text-slate-400", children: cta }))] }));
}
