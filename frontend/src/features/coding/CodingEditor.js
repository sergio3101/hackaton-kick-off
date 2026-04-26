import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Editor from "@monaco-editor/react";
import { verdictLabel } from "../../api/types";
import { useAuth } from "../../auth/AuthProvider";
import Icon from "../../components/Icon";
import { useTheme } from "../../theme/theme";
import { PasteBadge } from "./PasteBadge";
export default function CodingEditor({ state, onMonacoMount, onSubmit, frozen = false, }) {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [theme] = useTheme();
    const monacoTheme = theme === "light" ? "vs-light" : "vs-dark";
    const { codingItems, langFor, activeId, setActiveId, codeById, setCode, resultById, pasteCharsById, busyId, activeIdRef, addPasteChars, } = state;
    const active = codingItems.find((i) => i.id === activeId) ?? null;
    const activeLang = active ? langFor(active) : "plaintext";
    const alreadySubmitted = !!(active && resultById[active.id]);
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
    return (_jsxs("div", { className: "card ce-stack", style: {
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
                    }), _jsx("span", { style: { flex: 1 } }), _jsxs("span", { className: "pill pill--accent", style: { marginBottom: 8 }, children: [_jsx(Icon, { name: "code", size: 11 }), " ", activeLang] })] }), _jsx("div", { style: {
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--bg-line)",
                    fontSize: 12,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                }, children: active && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 6 }, children: active.topic }), _jsx("div", { style: { whiteSpace: "pre-wrap" }, children: active.prompt_text })] })) }), _jsx("div", { style: {
                    flex: 1,
                    minHeight: 0,
                    background: "var(--editor-bg)",
                }, children: _jsx(Editor, { height: "100%", language: activeLang, value: active ? codeById[active.id] ?? "" : "", onChange: (v) => {
                        if (!active)
                            return;
                        setCode(active.id, v ?? "");
                    }, onMount: (editor, monaco) => {
                        editor.onDidPaste((e) => {
                            const id = activeIdRef.current;
                            if (id === null)
                                return;
                            const model = editor.getModel();
                            if (!model)
                                return;
                            const inserted = model.getValueInRange(e.range);
                            addPasteChars(id, inserted.length);
                        });
                        onMonacoMount?.(editor, monaco);
                    }, theme: monacoTheme, options: {
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                        fontFamily: "var(--font-mono)",
                        readOnly: frozen || alreadySubmitted,
                    } }, active?.id ?? "empty") }), _jsxs("div", { style: {
                    padding: "12px 18px",
                    borderTop: "1px solid var(--bg-line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                }, children: [_jsxs("button", { type: "button", onClick: onSubmit, disabled: !active || busyId !== null || frozen || alreadySubmitted, className: "btn btn--primary btn--sm", title: alreadySubmitted
                            ? "Решение уже отправлено на проверку"
                            : undefined, children: [_jsx(Icon, { name: "check", size: 11 }), busyId === active?.id
                                ? "Анализ..."
                                : alreadySubmitted
                                    ? "Отправлено"
                                    : "Отправить"] }), _jsxs("button", { type: "button", onClick: () => state.run(), disabled: !active || state.runningId !== null || frozen || alreadySubmitted, className: "btn btn--sm", title: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u0434 \u0432 sandbox", children: [_jsx(Icon, { name: "play", size: 11 }), state.runningId === active?.id ? "Запуск..." : "Запустить"] }), frozen && (_jsx("span", { className: "mono", style: { fontSize: 11, color: "var(--danger)", marginLeft: 8 }, children: "\u23F1 \u0412\u0420\u0415\u041C\u042F \u0421\u0415\u0421\u0421\u0418\u0418 \u0418\u0421\u0422\u0415\u041A\u041B\u041E" })), activeResult && (_jsx("span", { className: `pill ${activeResult.verdict === "correct"
                            ? "pill--accent"
                            : activeResult.verdict === "partial"
                                ? "pill--warn"
                                : "pill--danger"}`, children: verdictLabel(activeResult.verdict) })), isAdmin && activeResult && (activeResult.pasteChars ?? 0) > 0 && (_jsx(PasteBadge, { pasteChars: activeResult.pasteChars ?? 0, codeLen: activeResult.codeLen ?? 0 })), pasteCharsById[active?.id ?? -1] && !activeResult && (_jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)", marginLeft: "auto" }, title: "\u0411\u0443\u0434\u0435\u0442 \u0443\u0447\u0442\u0435\u043D\u043E \u043F\u043E\u0441\u043B\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438", children: ["\uD83D\uDCCB paste: ", pasteCharsById[active?.id ?? -1], " \u0441\u0438\u043C\u0432"] }))] })] }));
}
