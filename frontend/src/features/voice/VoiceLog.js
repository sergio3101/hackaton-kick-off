import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { verdictLabel } from "../../api/types";
export default function VoiceLog({ log }) {
    const logRef = useRef(null);
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log.length]);
    return (_jsxs("div", { className: "card", style: {
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
        }, children: [_jsxs("div", { style: {
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "\u0412\u041E\u041F\u0420\u041E\u0421\u042B \u0418 \u041E\u0422\u0412\u0415\u0422\u042B" }), _jsx("span", { className: "pill", children: log.length })] }), _jsx("div", { ref: logRef, style: {
                    flex: 1,
                    overflowY: "auto",
                    padding: "12px 20px 24px",
                    minHeight: 0,
                }, children: log.length === 0 ? (_jsx("div", { style: {
                        color: "var(--ink-3)",
                        fontSize: 13,
                        padding: "32px 0",
                        textAlign: "center",
                    }, children: "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E. \u041E\u0442\u0432\u0435\u0442\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E \u043C\u0435\u0440\u0435 \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E." })) : (log.map((entry, idx) => (_jsxs("div", { className: "transcript-row", children: [_jsx("div", { className: "transcript-row__time mono", children: idx + 1 }), _jsxs("div", { children: [_jsxs("div", { className: `transcript-row__author transcript-row__author--${entry.isFollowUp ? "agent" : "user"}`, children: [entry.topic.toUpperCase(), entry.isFollowUp && " · FOLLOW-UP"] }), _jsx("div", { className: "mono upper", style: {
                                        color: "var(--accent)",
                                        marginTop: 4,
                                        marginBottom: 2,
                                    }, children: "\u0412\u043E\u043F\u0440\u043E\u0441" }), _jsx("div", { className: "transcript-row__text", style: { fontSize: 13, color: "var(--ink-2)" }, children: entry.question }), _jsxs("div", { style: {
                                        marginTop: 8,
                                        marginBottom: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "\u041E\u0442\u0432\u0435\u0442" }), entry.verdict && (_jsx("span", { className: `pill ${entry.verdict === "correct"
                                                ? "pill--accent"
                                                : entry.verdict === "partial"
                                                    ? "pill--warn"
                                                    : entry.verdict === "skipped"
                                                        ? ""
                                                        : "pill--danger"}`, children: verdictLabel(entry.verdict) }))] }), _jsx("div", { style: {
                                        fontSize: 13,
                                        color: "var(--ink-1)",
                                        paddingLeft: 10,
                                        borderLeft: "2px solid var(--accent)",
                                        background: "var(--bg-2)",
                                        padding: "6px 10px",
                                        borderRadius: "0 var(--r-2) var(--r-2) 0",
                                    }, children: entry.answer || (_jsx("span", { style: { color: "var(--ink-4)" }, children: "(\u043F\u0443\u0441\u0442\u043E)" })) })] })] }, idx)))) })] }));
}
