import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { verdictLabel } from "../api/types";
import Icon from "../components/Icon";
import { PasteBadge } from "../features/coding/PasteBadge";
export default function AdminSessionReview() {
    const { id } = useParams();
    const sid = Number(id);
    const qc = useQueryClient();
    const reportQ = useQuery({
        queryKey: ["admin", "session-report", sid],
        queryFn: async () => (await api.get(`/api/admin/sessions/${sid}`)).data,
        enabled: !!sid,
    });
    const invalidateAfterPublishToggle = () => {
        qc.invalidateQueries({ queryKey: ["admin", "session-report", sid] });
        qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
        qc.invalidateQueries({ queryKey: ["sessions"] });
    };
    const publishM = useMutation({
        mutationFn: async () => (await api.post(`/api/admin/sessions/${sid}/publish`)).data,
        onSuccess: invalidateAfterPublishToggle,
    });
    const unpublishM = useMutation({
        mutationFn: async () => (await api.delete(`/api/admin/sessions/${sid}/publish`)).data,
        onSuccess: invalidateAfterPublishToggle,
    });
    if (reportQ.isLoading) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }));
    }
    if (!reportQ.data) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0421\u0435\u0441\u0441\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430." }));
    }
    const { session, summary, items } = reportQ.data;
    const isFinished = session.status === "finished";
    const isPublished = !!session.published_at;
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["ADMIN \u00B7 SESSION REVIEW \u00B7 #", session.id] }), _jsxs("h1", { className: "page-title", children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", session.id, " \u00B7 ", session.selected_level] }), _jsxs("div", { className: "page-sub", children: ["\u0421\u0442\u0430\u0442\u0443\u0441: ", _jsx("span", { className: "mono", children: session.status }), " \u00B7 \u0442\u0435\u043C\u044B:", " ", session.selected_topics.join(", ")] })] }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx(Link, { to: "/admin/assignments", className: "btn btn--sm", children: "\u2190 \u041A \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\u043C" }), isPublished && (_jsxs("span", { className: "pill pill--accent", children: [_jsx(Icon, { name: "check", size: 11 }), " \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E"] })), isFinished && !isPublished && (_jsx("button", { type: "button", onClick: () => publishM.mutate(), disabled: publishM.isPending, className: "btn btn--primary", children: publishM.isPending ? "Публикую..." : "Опубликовать" })), isPublished && (_jsx("button", { type: "button", onClick: () => unpublishM.mutate(), disabled: unpublishM.isPending, className: "btn", children: unpublishM.isPending ? "..." : "Отозвать" }))] })] }), summary && (_jsxs("div", { className: "card", style: { marginBottom: 18 }, children: [_jsxs("div", { style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: 10,
                            marginBottom: 16,
                        }, children: [_jsx(Stat, { label: "\u0412\u0435\u0440\u043D\u043E", value: summary.correct, color: "var(--accent)" }), _jsx(Stat, { label: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E", value: summary.partial, color: "var(--warn)" }), _jsx(Stat, { label: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E", value: summary.incorrect, color: "var(--danger)" }), _jsx(Stat, { label: "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E", value: summary.skipped, color: "var(--ink-3)" }), _jsx(Stat, { label: "cost \u00B7 LLM/TTS/STT", value: reportQ.data?.total_cost_usd
                                    ? `$${reportQ.data.total_cost_usd.toFixed(4)}`
                                    : "—", color: "var(--warn)" })] }), summary.overall && (_jsx("div", { style: {
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: "var(--ink-2)",
                            whiteSpace: "pre-wrap",
                            paddingTop: 12,
                            borderTop: "1px solid var(--bg-line)",
                        }, children: summary.overall }))] })), _jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: items.map((it) => (_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 10,
                                flexWrap: "wrap",
                            }, children: [_jsxs("div", { className: "mono upper", style: { color: "var(--accent)" }, children: ["[", it.type, "] ", it.topic, " ", it.verdict && (_jsxs("span", { style: { color: "var(--ink-3)" }, children: ["\u00B7 ", verdictLabel(it.verdict)] }))] }), it.type === "coding" && (it.paste_chars ?? 0) > 0 && (_jsx(PasteBadge, { pasteChars: it.paste_chars ?? 0, codeLen: it.answer_text?.length ?? 0 }))] }), _jsx("div", { style: { fontWeight: 500, marginBottom: 8 }, children: it.prompt_text }), it.answer_text && (_jsxs("div", { style: {
                                fontSize: 13,
                                color: "var(--ink-2)",
                                whiteSpace: "pre-wrap",
                                padding: "10px 12px",
                                background: "var(--bg-2)",
                                border: "1px solid var(--bg-line)",
                                borderRadius: "var(--r-2)",
                                marginBottom: 8,
                            }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "\u041E\u0422\u0412\u0415\u0422" }), _jsx("div", { style: { marginTop: 4 }, children: it.answer_text })] })), it.rationale && (_jsxs("div", { style: {
                                fontSize: 13,
                                color: "var(--ink-2)",
                                marginBottom: 8,
                            }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "\u041E\u0411\u041E\u0421\u041D\u041E\u0412\u0410\u041D\u0418\u0415" }), _jsx("div", { style: { marginTop: 4 }, children: it.rationale })] })), it.expected_answer && (_jsxs("details", { style: { fontSize: 13 }, children: [_jsx("summary", { style: {
                                        cursor: "pointer",
                                        color: "var(--ink-3)",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 11,
                                        textTransform: "uppercase",
                                    }, children: "\u042D\u0442\u0430\u043B\u043E\u043D" }), _jsx("div", { style: {
                                        marginTop: 8,
                                        padding: "10px 12px",
                                        background: "var(--accent-soft)",
                                        color: "var(--ink-1)",
                                        borderRadius: "var(--r-2)",
                                        border: "1px solid var(--accent-border)",
                                        whiteSpace: "pre-wrap",
                                    }, children: it.expected_answer })] }))] }, it.id))) })] }));
}
function Stat({ label, value, color, }) {
    return (_jsxs("div", { style: {
            background: "var(--bg-2)",
            border: "1px solid var(--bg-line)",
            borderRadius: "var(--r-2)",
            padding: "12px 14px",
            textAlign: "center",
        }, children: [_jsx("div", { className: "mono", style: {
                    fontSize: 24,
                    fontWeight: 500,
                    color,
                    fontVariantNumeric: "tabular-nums",
                }, children: value }), _jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginTop: 4 }, children: label })] }));
}
