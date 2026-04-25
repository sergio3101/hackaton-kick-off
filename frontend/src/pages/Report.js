import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
const VERDICT_LABEL = {
    correct: "верно",
    partial: "частично",
    incorrect: "неверно",
    skipped: "пропущено",
};
const VERDICT_COLOR = {
    correct: "bg-emerald-100 text-emerald-800",
    partial: "bg-amber-100 text-amber-800",
    incorrect: "bg-rose-100 text-rose-800",
    skipped: "bg-slate-200 text-slate-600",
};
export default function Report() {
    const { id } = useParams();
    const sessionId = Number(id);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const { data, isLoading } = useQuery({
        queryKey: ["report", sessionId],
        queryFn: async () => (await api.get(`/api/sessions/${sessionId}/report`)).data,
        enabled: Number.isFinite(sessionId),
    });
    async function downloadPdf() {
        setDownloadingPdf(true);
        setPdfError(null);
        try {
            const r = await api.get(`/api/sessions/${sessionId}/report.pdf`, {
                responseType: "blob",
            });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `interview-${sessionId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
        catch (e) {
            const status = e?.response?.status;
            const msg = status === 401
                ? "Сессия истекла — войдите заново"
                : status === 404
                    ? "Отчёт не найден"
                    : "Не удалось сформировать PDF — попробуйте ещё раз";
            setPdfError(msg);
        }
        finally {
            setDownloadingPdf(false);
        }
    }
    if (isLoading || !data)
        return _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    const summary = data.summary;
    const total = (summary?.correct ?? 0) +
        (summary?.partial ?? 0) +
        (summary?.incorrect ?? 0) +
        (summary?.skipped ?? 0);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Breadcrumbs, { items: [
                    { label: "Сессии", to: "/sessions" },
                    { label: `Сессия #${data.session.id}` },
                    { label: "Отчёт" },
                ] }), _jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u041E\u0442\u0447\u0451\u0442 \u043F\u043E \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" }), _jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsx(Link, { to: `/requirements/${data.session.requirements_id}/new-session`, className: "text-sm bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg", children: "\u0415\u0449\u0451 \u043E\u0434\u043D\u0443 \u0441\u0435\u0441\u0441\u0438\u044E \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0443" }), _jsx("button", { type: "button", onClick: downloadPdf, disabled: downloadingPdf, className: "text-sm bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50", children: downloadingPdf ? "Готовлю PDF..." : "Скачать PDF" }), _jsx(Link, { to: "/sessions", className: "text-sm text-brand hover:underline", children: "\u2190 \u041A \u0441\u0435\u0441\u0441\u0438\u044F\u043C" })] })] }), pdfError && (_jsxs("div", { className: "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-start justify-between gap-3", children: [_jsx("span", { children: pdfError }), _jsx("button", { type: "button", onClick: () => setPdfError(null), className: "text-xs text-rose-700 hover:text-rose-900 underline", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), summary && (_jsxs("section", { className: "bg-white border rounded-xl p-5", children: [_jsx("h2", { className: "font-semibold mb-3", children: "\u0418\u0442\u043E\u0433\u0438" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4", children: [_jsx(Stat, { label: "\u0412\u0435\u0440\u043D\u043E", value: summary.correct, color: "text-emerald-700" }), _jsx(Stat, { label: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E", value: summary.partial, color: "text-amber-700" }), _jsx(Stat, { label: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E", value: summary.incorrect, color: "text-rose-700" }), _jsx(Stat, { label: "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E", value: summary.skipped, color: "text-slate-600" })] }), _jsxs("div", { className: "text-xs text-slate-400 mb-3 flex items-center justify-between", children: [_jsxs("span", { children: ["\u0412\u0441\u0435\u0433\u043E \u043F\u0443\u043D\u043A\u0442\u043E\u0432: ", total] }), data.total_cost_usd !== undefined && data.total_cost_usd > 0 && (_jsxs("span", { title: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C OpenAI-\u0432\u044B\u0437\u043E\u0432\u043E\u0432 \u043D\u0430 \u044D\u0442\u0443 \u0441\u0435\u0441\u0441\u0438\u044E", children: ["\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u0438: $", data.total_cost_usd.toFixed(4)] }))] }), summary.overall && (_jsx("div", { className: "bg-slate-50 border rounded-lg p-4 text-slate-800 leading-relaxed whitespace-pre-wrap", children: summary.overall }))] })), _jsxs("section", { className: "space-y-3", children: [_jsx("h2", { className: "font-semibold", children: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B" }), data.items
                        .filter((i) => i.type === "voice")
                        .map((item) => (_jsxs("div", { className: "bg-white border rounded-xl p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: item.topic }), _jsx("div", { className: "font-medium mt-1", children: item.prompt_text })] }), item.verdict && (_jsx("span", { className: `text-xs px-2 py-1 rounded ${VERDICT_COLOR[item.verdict]}`, children: VERDICT_LABEL[item.verdict] }))] }), _jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u041E\u0442\u0432\u0435\u0442 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430" }), _jsx("div", { className: "text-slate-800 whitespace-pre-wrap", children: item.answer_text || "(пусто)" })] }), item.rationale && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u041E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435" }), _jsx("div", { className: "text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap", children: item.rationale })] })), item.explanation && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u0427\u0442\u043E \u0443\u043F\u0443\u0449\u0435\u043D\u043E" }), _jsx("div", { className: "text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 whitespace-pre-wrap", children: item.explanation })] })), item.expected_answer && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u042D\u0442\u0430\u043B\u043E\u043D\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442" }), _jsx("div", { className: "text-slate-800 bg-emerald-50 border border-emerald-200 rounded p-3 whitespace-pre-wrap leading-relaxed", children: item.expected_answer })] }))] }, item.id)))] }), _jsxs("section", { className: "space-y-3", children: [_jsx("h2", { className: "font-semibold", children: "\u041B\u0430\u0439\u0432-\u043A\u043E\u0434\u0438\u043D\u0433" }), data.items
                        .filter((i) => i.type === "coding")
                        .map((item) => (_jsxs("div", { className: "bg-white border rounded-xl p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs uppercase text-slate-400", children: "\u0417\u0430\u0434\u0430\u0447\u0430" }), _jsx("div", { className: "text-sm mt-1 whitespace-pre-wrap", children: item.prompt_text })] }), item.verdict && (_jsx("span", { className: `text-xs px-2 py-1 rounded ${VERDICT_COLOR[item.verdict]}`, children: VERDICT_LABEL[item.verdict] }))] }), item.answer_text && (_jsx("pre", { className: "mt-3 bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-auto", children: item.answer_text })), item.rationale && (_jsx("div", { className: "mt-3 text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap text-sm", children: item.rationale })), item.explanation && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u0427\u0442\u043E \u0443\u043F\u0443\u0449\u0435\u043D\u043E" }), _jsx("div", { className: "text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 whitespace-pre-wrap", children: item.explanation })] })), item.expected_answer && (_jsxs("div", { className: "mt-3 text-sm", children: [_jsx("div", { className: "text-slate-500 text-xs mb-1", children: "\u042D\u0442\u0430\u043B\u043E\u043D\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435" }), _jsx("pre", { className: "bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-auto", children: item.expected_answer })] }))] }, item.id)))] })] }));
}
function Stat({ label, value, color }) {
    return (_jsxs("div", { className: "bg-slate-50 border rounded-lg p-3 text-center", children: [_jsx("div", { className: `text-2xl font-semibold ${color}`, children: value }), _jsx("div", { className: "text-xs text-slate-500 mt-1", children: label })] }));
}
