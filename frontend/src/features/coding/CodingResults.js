import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { verdictLabel } from "../../api/types";
import Icon from "../../components/Icon";
export default function CodingResults({ state }) {
    const { codingItems, activeId, setActiveId, resultById, runOutputById, errorById, busyId, runningId } = state;
    const active = codingItems.find((i) => i.id === activeId) ?? null;
    if (codingItems.length === 0) {
        return (_jsx("div", { className: "card", style: {
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
                fontSize: 13,
                textAlign: "center",
                padding: 20,
            }, children: "\u041A\u043E\u0434\u0438\u043D\u0433-\u0437\u0430\u0434\u0430\u0447 \u0432 \u044D\u0442\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u043D\u0435\u0442." }));
    }
    const activeResult = active ? resultById[active.id] : null;
    const activeError = active ? errorById[active.id] : "";
    const activeRunOutput = active ? runOutputById[active.id] : null;
    return (_jsxs("div", { className: "card", style: {
            display: "flex",
            flexDirection: "column",
            padding: 0,
            height: "100%",
            overflow: "hidden",
        }, children: [_jsx("div", { style: {
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { className: "mono upper", style: { color: "var(--ink-3)" }, children: "CODING RESULTS" }), _jsxs("span", { className: "pill", children: [Object.values(resultById).filter((r) => r.verdict === "correct").length, "/", codingItems.length] })] }) }), _jsx("div", { style: {
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--bg-line)",
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                }, children: codingItems.map((it, idx) => {
                    const result = resultById[it.id];
                    const isActive = it.id === activeId;
                    return (_jsxs("button", { type: "button", onClick: () => setActiveId(it.id), className: "pill", style: {
                            cursor: "pointer",
                            padding: "5px 10px",
                            background: isActive ? "var(--accent)" : "var(--bg-2)",
                            color: isActive ? "var(--accent-ink)" : "var(--ink-2)",
                            borderColor: isActive ? "var(--accent)" : "var(--bg-line)",
                        }, children: [_jsxs("span", { className: "mono", children: ["#", idx + 1] }), _jsx("span", { children: it.topic }), result && (_jsx("span", { className: "dot", style: {
                                    background: result.verdict === "correct"
                                        ? "var(--accent-ink)"
                                        : result.verdict === "partial"
                                            ? "var(--warn)"
                                            : "var(--danger)",
                                } }))] }, it.id));
                }) }), _jsxs("div", { style: {
                    flex: 1,
                    overflow: "auto",
                    padding: "16px 20px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                }, children: [!active && (_jsx("div", { style: { color: "var(--ink-3)", fontSize: 13 }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0441\u043B\u0435\u0432\u0430, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B." })), active && !activeResult && !activeRunOutput && !activeError && (_jsx("div", { style: {
                            color: "var(--ink-3)",
                            fontSize: 13,
                            padding: "20px 0",
                            textAlign: "center",
                            border: "1px dashed var(--bg-line)",
                            borderRadius: "var(--r-2)",
                        }, children: busyId === active.id || runningId === active.id ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", size: 14 }), " \u041E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u043C \u0440\u0435\u0448\u0435\u043D\u0438\u0435\u2026"] })) : (_jsx(_Fragment, { children: "\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043A\u043E\u0434 \u0441\u043B\u0435\u0432\u0430 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C\u00BB." })) })), activeError && (_jsx("div", { className: "state-block state-block--danger", style: { fontSize: 12 }, children: activeError })), activeRunOutput && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)" }, children: ["Run output", _jsxs("span", { style: { marginLeft: 8, color: "var(--ink-4)" }, children: ["exit=", activeRunOutput.exit_code, " \u00B7 ", activeRunOutput.duration_ms, " \u043C\u0441", activeRunOutput.timed_out && " · TIMEOUT", activeRunOutput.truncated && " · обрезан"] })] }), activeRunOutput.stdout && (_jsx("pre", { style: {
                                    background: "var(--editor-bg)",
                                    color: "var(--accent)",
                                    fontSize: 12,
                                    padding: 12,
                                    borderRadius: "var(--r-2)",
                                    border: "1px solid var(--bg-line)",
                                    maxHeight: 240,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontFamily: "var(--font-mono)",
                                }, children: activeRunOutput.stdout })), activeRunOutput.stderr && (_jsx("pre", { style: {
                                    background: "var(--state-danger-bg)",
                                    color: "var(--state-danger-fg)",
                                    fontSize: 12,
                                    padding: 12,
                                    borderRadius: "var(--r-2)",
                                    border: "1px solid var(--state-danger-border)",
                                    maxHeight: 240,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontFamily: "var(--font-mono)",
                                }, children: activeRunOutput.stderr }))] })), activeResult && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsx("span", { className: `pill ${activeResult.verdict === "correct"
                                            ? "pill--accent"
                                            : activeResult.verdict === "partial"
                                                ? "pill--warn"
                                                : "pill--danger"}`, children: verdictLabel(activeResult.verdict) }), (activeResult.codeLen ?? 0) > 0 && (_jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: [activeResult.codeLen, " \u0441\u0438\u043C\u0432", (activeResult.pasteChars ?? 0) > 0 && (_jsxs(_Fragment, { children: [" · ", "\uD83D\uDCCB ", activeResult.pasteChars] }))] }))] }), activeResult.rationale && (_jsxs("div", { className: "insight", style: { fontSize: 13 }, children: [_jsx("div", { className: "insight__icon", children: "i" }), _jsx("div", { style: {
                                            flex: 1,
                                            whiteSpace: "pre-wrap",
                                            color: "var(--ink-1)",
                                            lineHeight: 1.6,
                                        }, children: activeResult.rationale })] }))] }))] })] }));
}
