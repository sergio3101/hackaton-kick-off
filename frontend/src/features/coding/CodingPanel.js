import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import Icon from "../../components/Icon";
const STARTER = {
    python: "# напиши решение здесь\n\n",
    javascript: "// напиши решение здесь\n\n",
    typescript: "// напиши решение здесь\n\n",
    go: "package main\n\nfunc main() {\n}\n",
    java: "public class Solution {\n  public static void main(String[] args) {\n  }\n}\n",
};
export default function CodingPanel({ session, onSubmitted }) {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const lang = (session.coding_task_language || "python").toLowerCase();
    const codingItems = useMemo(() => session.items
        .filter((i) => i.type === "coding")
        .sort((a, b) => a.idx - b.idx), [session.items]);
    const [activeId, setActiveId] = useState(codingItems[0]?.id ?? null);
    const [codeById, setCodeById] = useState(() => {
        const init = {};
        for (const it of codingItems) {
            init[it.id] = it.answer_text || STARTER[lang] || "";
        }
        return init;
    });
    const [resultById, setResultById] = useState(() => {
        const init = {};
        for (const it of codingItems) {
            if (it.verdict) {
                init[it.id] = {
                    verdict: it.verdict,
                    rationale: it.rationale,
                    pasteChars: it.paste_chars,
                    codeLen: it.answer_text?.length,
                };
            }
        }
        return init;
    });
    const [busyId, setBusyId] = useState(null);
    const [runningId, setRunningId] = useState(null);
    const [runOutputById, setRunOutputById] = useState({});
    const [pasteCharsById, setPasteCharsById] = useState({});
    const [errorById, setErrorById] = useState({});
    const activeIdRef = useRef(null);
    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);
    useEffect(() => {
        setPasteCharsById({});
        setRunOutputById({});
    }, [session.id]);
    useEffect(() => {
        if (activeId === null && codingItems.length > 0) {
            setActiveId(codingItems[0].id);
        }
    }, [codingItems, activeId]);
    useEffect(() => {
        setCodeById((prev) => {
            const next = { ...prev };
            for (const it of codingItems) {
                if (next[it.id] === undefined) {
                    next[it.id] = it.answer_text || STARTER[lang] || "";
                }
            }
            return next;
        });
    }, [codingItems, lang]);
    const active = codingItems.find((i) => i.id === activeId) ?? null;
    async function onSubmit() {
        if (!active)
            return;
        setBusyId(active.id);
        setErrorById((e) => ({ ...e, [active.id]: "" }));
        try {
            const r = await api.post(`/api/sessions/${session.id}/coding/review/${active.id}`, {
                code: codeById[active.id] ?? "",
                paste_chars: pasteCharsById[active.id] ?? 0,
            });
            setResultById((prev) => ({
                ...prev,
                [active.id]: {
                    verdict: r.data.verdict || "incorrect",
                    rationale: r.data.rationale,
                    pasteChars: r.data.paste_chars,
                    codeLen: r.data.answer_text?.length,
                },
            }));
            onSubmitted?.(r.data);
        }
        catch (e) {
            setErrorById((prev) => ({
                ...prev,
                [active.id]: e?.response?.data?.detail || "Не удалось получить ревью",
            }));
        }
        finally {
            setBusyId(null);
        }
    }
    async function onRun() {
        if (!active)
            return;
        setRunningId(active.id);
        setErrorById((e) => ({ ...e, [active.id]: "" }));
        try {
            const r = await api.post(`/api/sessions/${session.id}/coding/run/${active.id}`, { code: codeById[active.id] ?? "" });
            setRunOutputById((prev) => ({ ...prev, [active.id]: r.data }));
        }
        catch (e) {
            setErrorById((prev) => ({
                ...prev,
                [active.id]: e?.response?.data?.detail || "Не удалось запустить код",
            }));
        }
        finally {
            setRunningId(null);
        }
    }
    if (codingItems.length === 0) {
        return (_jsx("div", { className: "card", style: {
                display: "flex",
                flexDirection: "column",
                padding: 20,
                fontSize: 13,
                color: "var(--ink-3)",
                height: "100%",
            }, children: "\u041A\u043E\u0434\u0438\u043D\u0433-\u0437\u0430\u0434\u0430\u0447\u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0432 \u0441\u0435\u0441\u0441\u0438\u0438." }));
    }
    const activeResult = active ? resultById[active.id] : null;
    const activeError = active ? errorById[active.id] : "";
    const activeRunOutput = active ? runOutputById[active.id] : null;
    return (_jsxs("div", { className: "card", style: {
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
        }, children: [_jsxs("div", { style: {
                    padding: "10px 16px 0",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    gap: 4,
                    alignItems: "flex-end",
                }, children: [codingItems.map((it, idx) => {
                        const result = resultById[it.id];
                        const isActive = it.id === activeId;
                        return (_jsxs("button", { type: "button", onClick: () => setActiveId(it.id), style: {
                                padding: "8px 14px",
                                fontSize: 12,
                                fontWeight: 500,
                                color: isActive ? "var(--ink-1)" : "var(--ink-3)",
                                background: "transparent",
                                border: "none",
                                borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                                marginBottom: -1,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                            }, children: [_jsxs("span", { className: "mono", style: { color: "var(--ink-4)" }, children: ["#", idx + 1] }), _jsx("span", { children: it.topic }), result && (_jsx("span", { className: "dot", style: {
                                        background: result.verdict === "correct"
                                            ? "var(--accent)"
                                            : result.verdict === "partial"
                                                ? "var(--warn)"
                                                : "var(--danger)",
                                    }, title: result.verdict }))] }, it.id));
                    }), _jsx("span", { style: { flex: 1 } }), _jsxs("span", { className: "pill pill--accent", style: { marginBottom: 8 }, children: [_jsx(Icon, { name: "code", size: 11 }), " ", lang] })] }), _jsx("div", { style: {
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    fontSize: 12,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                }, children: active && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 6 }, children: active.topic }), _jsx("div", { style: { whiteSpace: "pre-wrap" }, children: active.prompt_text })] })) }), _jsx("div", { style: {
                    flex: 1,
                    minHeight: 0,
                    background: "oklch(0.13 0.005 60)",
                }, children: _jsx(Editor, { height: "100%", language: lang, value: active ? codeById[active.id] ?? "" : "", onChange: (v) => {
                        if (!active)
                            return;
                        setCodeById((prev) => ({ ...prev, [active.id]: v ?? "" }));
                    }, onMount: (editor) => {
                        editor.onDidPaste((e) => {
                            const id = activeIdRef.current;
                            if (id === null)
                                return;
                            const model = editor.getModel();
                            if (!model)
                                return;
                            const inserted = model.getValueInRange(e.range);
                            const len = inserted.length;
                            if (len <= 0)
                                return;
                            setPasteCharsById((prev) => ({
                                ...prev,
                                [id]: (prev[id] ?? 0) + len,
                            }));
                        });
                    }, theme: "vs-dark", options: {
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                        fontFamily: "var(--font-mono)",
                    } }) }), _jsxs("div", { style: {
                    padding: "12px 18px",
                    borderTop: "1px solid var(--bg-line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                        }, children: [_jsxs("button", { type: "button", onClick: onSubmit, disabled: !active || busyId !== null, className: "btn btn--primary btn--sm", children: [_jsx(Icon, { name: "check", size: 11 }), busyId === active?.id ? "Анализ..." : "Отправить"] }), _jsxs("button", { type: "button", onClick: onRun, disabled: !active || runningId !== null, className: "btn btn--sm", title: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u0434 \u0432 sandbox", children: [_jsx(Icon, { name: "play", size: 11 }), runningId === active?.id ? "Запуск..." : "Запустить"] }), activeResult && (_jsx("span", { className: `pill ${activeResult.verdict === "correct"
                                    ? "pill--accent"
                                    : activeResult.verdict === "partial"
                                        ? "pill--warn"
                                        : "pill--danger"}`, children: activeResult.verdict })), isAdmin && activeResult && (activeResult.pasteChars ?? 0) > 0 && (_jsx(PasteBadge, { pasteChars: activeResult.pasteChars ?? 0, codeLen: activeResult.codeLen ?? 0 }))] }), activeError && (_jsx("div", { style: {
                            fontSize: 12,
                            color: "oklch(0.78 0.16 25)",
                            padding: "8px 10px",
                            background: "var(--danger-soft)",
                            border: "1px solid oklch(0.40 0.10 25)",
                            borderRadius: "var(--r-2)",
                        }, children: activeError })), activeRunOutput && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsxs("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: ["exit=", activeRunOutput.exit_code, " \u00B7 ", activeRunOutput.duration_ms, " \u043C\u0441", activeRunOutput.timed_out && " · TIMEOUT", activeRunOutput.truncated && " · вывод обрезан"] }), activeRunOutput.stdout && (_jsx("pre", { style: {
                                    background: "oklch(0.13 0.005 60)",
                                    color: "var(--accent)",
                                    fontSize: 11,
                                    padding: 10,
                                    borderRadius: "var(--r-2)",
                                    border: "1px solid var(--bg-line)",
                                    maxHeight: 160,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontFamily: "var(--font-mono)",
                                }, children: activeRunOutput.stdout })), activeRunOutput.stderr && (_jsx("pre", { style: {
                                    background: "var(--danger-soft)",
                                    color: "oklch(0.85 0.20 25)",
                                    fontSize: 11,
                                    padding: 10,
                                    borderRadius: "var(--r-2)",
                                    border: "1px solid oklch(0.40 0.10 25)",
                                    maxHeight: 160,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontFamily: "var(--font-mono)",
                                }, children: activeRunOutput.stderr }))] })), activeResult?.rationale && (_jsxs("div", { className: "insight", style: { fontSize: 12 }, children: [_jsx("div", { className: "insight__icon", children: "i" }), _jsx("div", { style: { flex: 1, whiteSpace: "pre-wrap", color: "var(--ink-2)" }, children: activeResult.rationale })] }))] })] }));
}
export function PasteBadge({ pasteChars, codeLen, }) {
    const ratio = codeLen > 0 ? pasteChars / codeLen : 0;
    const percent = Math.round(ratio * 100);
    const heavy = ratio >= 0.7;
    return (_jsxs("span", { title: `Вставлено ${pasteChars} символов из ${codeLen} (~${percent}%)`, className: `pill ${heavy ? "pill--danger" : "pill--warn"}`, children: ["\uD83D\uDCCB \u0431\u0443\u0444\u0435\u0440: ", pasteChars, " \u0441\u0438\u043C\u0432 \u00B7 ", percent, "%"] }));
}
