import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import Icon from "../components/Icon";
import { Kpi } from "../components/UI";
import { PasteBadge } from "../features/coding/CodingPanel";
const VERDICT_LABEL = {
    correct: "верно",
    partial: "частично",
    incorrect: "неверно",
    skipped: "пропущено",
};
const VERDICT_PILL = {
    correct: "pill--accent",
    partial: "pill--warn",
    incorrect: "pill--danger",
    skipped: "",
};
export default function Report() {
    const { id } = useParams();
    const sessionId = Number(id);
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const [tab, setTab] = useState("summary");
    const { data, isLoading, error } = useQuery({
        queryKey: ["report", sessionId],
        queryFn: async () => (await api.get(`/api/sessions/${sessionId}/report`)).data,
        enabled: Number.isFinite(sessionId),
        retry: false,
    });
    const status = error?.response?.status;
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
    if (isLoading) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }));
    }
    if (status === 403) {
        return (_jsxs("div", { className: "page", children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--warn)", marginBottom: 8 }, children: "\u041E\u0422\u0427\u0401\u0422 \u0412 \u041F\u0420\u041E\u0426\u0415\u0421\u0421\u0415 \u041F\u0423\u0411\u041B\u0418\u041A\u0410\u0426\u0418\u0418" }), _jsx("h1", { className: "page-title", children: "\u041E\u0442\u0447\u0451\u0442 \u0435\u0449\u0451 \u043D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D" }), _jsx("div", { className: "page-sub", style: { maxWidth: 520 }, children: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E, \u043E\u0442\u0432\u0435\u0442\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B. \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0438 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442 \u043E\u0442\u0447\u0451\u0442 \u2014 \u043F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0433\u043E \u0432\u044B \u0443\u0432\u0438\u0434\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u00AB\u041C\u043E\u0438 \u043A\u0438\u043A\u043E\u0444\u0444\u044B\u00BB." })] }) }), _jsxs(Link, { to: "/me/assignments", className: "btn btn--primary", children: [_jsx(Icon, { name: "arrow-right", size: 14 }), " \u041A \u043C\u043E\u0438\u043C \u043A\u0438\u043A\u043E\u0444\u0444\u0430\u043C"] })] }));
    }
    if (!data) {
        return (_jsx("div", { className: "page", children: _jsxs("div", { className: "card", style: { textAlign: "center", color: "var(--ink-3)" }, children: ["\u041E\u0442\u0447\u0451\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.", _jsx("div", { style: { marginTop: 12 }, children: _jsx(Link, { to: isAdmin ? "/sessions" : "/me/assignments", className: "btn btn--sm", children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }) })] }) }));
    }
    const summary = data.summary;
    const total = (summary?.correct ?? 0) +
        (summary?.partial ?? 0) +
        (summary?.incorrect ?? 0) +
        (summary?.skipped ?? 0);
    const score = total > 0
        ? ((summary?.correct ?? 0) + (summary?.partial ?? 0) * 0.5) / total
        : 0;
    const voiceItems = data.items.filter((i) => i.type === "voice");
    const codingItems = data.items.filter((i) => i.type === "coding");
    const voiceCount = voiceItems.length;
    const answeredCount = voiceItems.filter((i) => i.verdict && i.verdict !== "skipped").length;
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["HISTORY \u00B7 SESSION #", data.session.id, " \u00B7 REPORT"] }), _jsxs("h1", { className: "page-title", children: ["\u041E\u0442\u0447\u0451\u0442 \u043F\u043E \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E #", data.session.id] }), _jsxs("div", { className: "page-sub", children: [new Date(data.session.created_at).toLocaleString("ru-RU"), " \u00B7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C", " ", _jsx("span", { className: "mono", style: { color: "var(--accent)" }, children: data.session.selected_level }), " ", "\u00B7 \u0440\u0435\u0436\u0438\u043C ", data.session.mode, " \u00B7 \u0442\u0435\u043C\u044B:", " ", data.session.selected_topics.join(", ")] })] }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsxs("button", { type: "button", onClick: downloadPdf, disabled: downloadingPdf, className: "btn", children: [_jsx(Icon, { name: "doc", size: 13 }), downloadingPdf ? "Готовлю..." : "PDF"] }), isAdmin && (_jsxs(Link, { to: `/admin/sessions/${data.session.id}`, className: "btn btn--primary", children: [_jsx(Icon, { name: "settings", size: 13 }), " \u0420\u0435\u0432\u044C\u044E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430"] }))] })] }), pdfError && (_jsxs("div", { style: {
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "var(--danger-soft)",
                    border: "1px solid oklch(0.40 0.10 25)",
                    borderRadius: "var(--r-2)",
                    color: "oklch(0.78 0.16 25)",
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                }, children: [_jsx("span", { children: pdfError }), _jsx("button", { type: "button", onClick: () => setPdfError(null), style: {
                            fontSize: 11,
                            textDecoration: "underline",
                            background: "none",
                            border: "none",
                            color: "inherit",
                        }, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), summary && (_jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginBottom: 18,
                }, children: [_jsx(Kpi, { label: "Score", value: `${Math.round(score * 100)}%`, hint: `${total} пунктов` }), _jsx(Kpi, { label: "\u041F\u043E\u043A\u0440\u044B\u0442\u0438\u0435", value: `${answeredCount}/${voiceCount}`, hint: "\u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0437\u0430\u0434\u0430\u043D\u043E" }), _jsx(Kpi, { label: "\u0412\u0435\u0440\u043D\u043E", value: summary.correct, hint: `${summary.partial} частично` }), _jsx(Kpi, { label: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C", value: data.total_cost_usd ? `$${data.total_cost_usd.toFixed(4)}` : "—", hint: "LLM/TTS/STT", sparkColor: "var(--warn)" })] })), _jsx("div", { style: {
                    display: "flex",
                    gap: 4,
                    borderBottom: "1px solid var(--bg-line)",
                    marginBottom: 18,
                }, children: [
                    { k: "summary", l: "Резюме" },
                    { k: "voice", l: `Голос · ${voiceCount}` },
                    { k: "coding", l: `Кодинг · ${codingItems.length}` },
                ].map((t) => (_jsx("button", { type: "button", onClick: () => setTab(t.k), style: {
                        padding: "10px 16px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: tab === t.k ? "var(--ink-1)" : "var(--ink-3)",
                        marginBottom: -1,
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${tab === t.k ? "var(--accent)" : "transparent"}`,
                        cursor: "pointer",
                    }, children: t.l }, t.k))) }), tab === "summary" && summary && (_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                            fontWeight: 500,
                            marginBottom: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }, children: [_jsx(Icon, { name: "sparkle", size: 14 }), "AI-\u0440\u0435\u0437\u044E\u043C\u0435"] }), _jsx("div", { style: {
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: "var(--ink-2)",
                            whiteSpace: "pre-wrap",
                        }, children: summary.overall || "Резюме не сформировано" }), _jsxs("div", { style: {
                            marginTop: 18,
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 10,
                        }, children: [_jsx(VerdictStat, { label: "\u0412\u0435\u0440\u043D\u043E", value: summary.correct, color: "var(--accent)" }), _jsx(VerdictStat, { label: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E", value: summary.partial, color: "var(--warn)" }), _jsx(VerdictStat, { label: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E", value: summary.incorrect, color: "var(--danger)" }), _jsx(VerdictStat, { label: "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E", value: summary.skipped, color: "var(--ink-3)" })] })] })), tab === "voice" && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: voiceItems.length === 0 ? (_jsx("div", { className: "card", style: { color: "var(--ink-3)", textAlign: "center" }, children: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0432 \u0441\u0435\u0441\u0441\u0438\u0438 \u043D\u0435\u0442." })) : (voiceItems.map((item) => (_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 12,
                            }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 4 }, children: item.topic }), _jsx("div", { style: { fontWeight: 500 }, children: item.prompt_text })] }), item.verdict && (_jsx("span", { className: `pill ${VERDICT_PILL[item.verdict]}`, children: VERDICT_LABEL[item.verdict] }))] }), _jsx(ReportBlock, { label: "\u041E\u0442\u0432\u0435\u0442 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u0430", children: item.answer_text || "(пусто)" }), item.rationale && (_jsx(ReportBlock, { label: "\u041E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435", children: item.rationale })), item.explanation && (_jsx(ReportBlock, { label: "\u0427\u0442\u043E \u0443\u043F\u0443\u0449\u0435\u043D\u043E", variant: "warn", children: item.explanation })), item.expected_answer && (_jsx(ReportBlock, { label: "\u042D\u0442\u0430\u043B\u043E\u043D\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442", variant: "accent", children: item.expected_answer }))] }, item.id)))) })), tab === "coding" && (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: codingItems.length === 0 ? (_jsx("div", { className: "card", style: { color: "var(--ink-3)", textAlign: "center" }, children: "\u041A\u043E\u0434\u0438\u043D\u0433-\u0437\u0430\u0434\u0430\u0447 \u0432 \u0441\u0435\u0441\u0441\u0438\u0438 \u043D\u0435\u0442." })) : (codingItems.map((item) => (_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 12,
                            }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 4 }, children: item.topic }), _jsx("div", { style: {
                                                fontSize: 13,
                                                color: "var(--ink-2)",
                                                whiteSpace: "pre-wrap",
                                            }, children: item.prompt_text })] }), _jsxs("div", { style: {
                                        display: "flex",
                                        gap: 6,
                                        flexWrap: "wrap",
                                        alignItems: "flex-start",
                                    }, children: [item.verdict && (_jsx("span", { className: `pill ${VERDICT_PILL[item.verdict]}`, children: VERDICT_LABEL[item.verdict] })), isAdmin && (item.paste_chars ?? 0) > 0 && (_jsx(PasteBadge, { pasteChars: item.paste_chars ?? 0, codeLen: item.answer_text?.length ?? 0 }))] })] }), item.answer_text && (_jsx("pre", { style: {
                                background: "oklch(0.13 0.005 60)",
                                color: "var(--ink-1)",
                                fontSize: 12,
                                padding: 12,
                                borderRadius: "var(--r-2)",
                                border: "1px solid var(--bg-line)",
                                overflow: "auto",
                                margin: "0 0 12px",
                                fontFamily: "var(--font-mono)",
                                lineHeight: 1.55,
                            }, children: item.answer_text })), item.rationale && (_jsx(ReportBlock, { label: "\u041E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435", children: item.rationale })), item.explanation && (_jsx(ReportBlock, { label: "\u0427\u0442\u043E \u0443\u043F\u0443\u0449\u0435\u043D\u043E", variant: "warn", children: item.explanation })), item.expected_answer && (_jsxs("div", { style: { marginTop: 10 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 6 }, children: "\u042D\u0442\u0430\u043B\u043E\u043D\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435" }), _jsx("pre", { style: {
                                        background: "oklch(0.13 0.005 60)",
                                        color: "var(--accent)",
                                        fontSize: 12,
                                        padding: 12,
                                        borderRadius: "var(--r-2)",
                                        border: "1px solid oklch(0.40 0.10 130)",
                                        overflow: "auto",
                                        margin: 0,
                                        fontFamily: "var(--font-mono)",
                                        lineHeight: 1.55,
                                    }, children: item.expected_answer })] }))] }, item.id)))) }))] }));
}
function VerdictStat({ label, value, color, }) {
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
function ReportBlock({ label, children, variant = "default", }) {
    const styles = {
        default: {
            background: "var(--bg-2)",
            borderColor: "var(--bg-line)",
            color: "var(--ink-1)",
        },
        warn: {
            background: "var(--warn-soft)",
            borderColor: "oklch(0.40 0.08 75)",
            color: "var(--warn)",
        },
        accent: {
            background: "var(--accent-soft)",
            borderColor: "oklch(0.40 0.10 130)",
            color: "var(--accent)",
        },
    };
    return (_jsxs("div", { style: { marginTop: 10 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 6 }, children: label }), _jsx("div", { style: {
                    padding: "10px 14px",
                    borderRadius: "var(--r-2)",
                    border: "1px solid",
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    ...styles[variant],
                }, children: children })] }));
}
