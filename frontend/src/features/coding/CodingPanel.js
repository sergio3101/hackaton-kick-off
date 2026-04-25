import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { api } from "../../api/client";
const STARTER = {
    python: "# напиши решение здесь\n\n",
    javascript: "// напиши решение здесь\n\n",
    typescript: "// напиши решение здесь\n\n",
    go: "package main\n\nfunc main() {\n}\n",
    java: "public class Solution {\n  public static void main(String[] args) {\n  }\n}\n",
};
const SANDBOX_LANGS = new Set(["python", "py", "python3"]);
export default function CodingPanel({ session, onSubmitted }) {
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
            if (it.verdict)
                init[it.id] = { verdict: it.verdict, rationale: it.rationale };
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
    // Сбрасываем счётчик вставленных символов при смене сессии (другая интервью-сессия = чистый счёт).
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
                [active.id]: { verdict: r.data.verdict || "incorrect", rationale: r.data.rationale },
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
        return (_jsx("div", { className: "flex flex-col h-full bg-white border rounded-lg p-4 text-sm text-slate-500", children: "\u041A\u043E\u0434\u0438\u043D\u0433-\u0437\u0430\u0434\u0430\u0447\u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0432 \u0441\u0435\u0441\u0441\u0438\u0438." }));
    }
    const activeResult = active ? resultById[active.id] : null;
    const activeError = active ? errorById[active.id] : "";
    const activeRunOutput = active ? runOutputById[active.id] : null;
    const sandboxAvailable = SANDBOX_LANGS.has(lang);
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "bg-white border rounded-t-lg", children: [_jsx("div", { className: "flex items-center gap-2 border-b px-3 pt-3", children: codingItems.map((it, idx) => {
                            const result = resultById[it.id];
                            const isActive = it.id === activeId;
                            return (_jsxs("button", { type: "button", onClick: () => setActiveId(it.id), className: `flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-lg border-b-2 -mb-px transition-colors ${isActive
                                    ? "border-brand text-slate-900 bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-800"}`, children: [_jsxs("span", { className: "text-xs text-slate-400", children: ["#", idx + 1] }), _jsx("span", { className: "font-medium", children: it.topic }), result && (_jsx("span", { className: `ml-1 inline-block w-2 h-2 rounded-full ${result.verdict === "correct"
                                            ? "bg-emerald-500"
                                            : result.verdict === "partial"
                                                ? "bg-amber-500"
                                                : "bg-rose-500"}`, title: result.verdict }))] }, it.id));
                        }) }), _jsxs("div", { className: "p-4", children: [_jsx("div", { className: "flex items-center justify-between mb-2", children: _jsxs("h3", { className: "font-semibold", children: ["\u041B\u0430\u0439\u0432-\u043A\u043E\u0434\u0438\u043D\u0433 (", lang, ")", active && _jsxs("span", { className: "text-slate-400 font-normal", children: [" \u2014 \u0442\u0435\u043C\u0430: ", active.topic] })] }) }), active && (_jsx("p", { className: "text-sm text-slate-700 whitespace-pre-wrap", children: active.prompt_text }))] })] }), _jsx("div", { className: "border-x flex-1 min-h-0", children: _jsx(Editor, { height: "100%", language: lang, value: active ? codeById[active.id] ?? "" : "", onChange: (v) => {
                        if (!active)
                            return;
                        setCodeById((prev) => ({ ...prev, [active.id]: v ?? "" }));
                    }, onMount: (editor) => {
                        // C2: ловим paste-события Monaco и копим суммарное число вставленных символов.
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
                    } }) }), _jsxs("div", { className: "bg-white border rounded-b-lg p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: onSubmit, disabled: !active || busyId !== null, className: "bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50", children: busyId === active?.id ? "Анализ..." : "Отправить решение" }), sandboxAvailable && (_jsx("button", { type: "button", onClick: onRun, disabled: !active || runningId !== null, title: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u0434 \u0432 sandbox \u0438 \u0443\u0432\u0438\u0434\u0435\u0442\u044C stdout/stderr", className: "border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50", children: runningId === active?.id ? "Запуск..." : "Запустить" })), activeResult && (_jsx("span", { className: `text-xs px-2 py-1 rounded ${activeResult.verdict === "correct"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : activeResult.verdict === "partial"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"}`, children: activeResult.verdict }))] }), activeError && _jsx("div", { className: "text-rose-600 text-sm", children: activeError }), activeRunOutput && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-xs text-slate-500", children: ["\u0417\u0430\u043F\u0443\u0441\u043A: exit=", activeRunOutput.exit_code, ", ", activeRunOutput.duration_ms, " \u043C\u0441", activeRunOutput.timed_out && " · TIMEOUT", activeRunOutput.truncated && " · вывод обрезан"] }), activeRunOutput.stdout && (_jsx("pre", { className: "bg-slate-900 text-emerald-100 text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap", children: activeRunOutput.stdout })), activeRunOutput.stderr && (_jsx("pre", { className: "bg-rose-950 text-rose-100 text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap", children: activeRunOutput.stderr }))] })), activeResult?.rationale && (_jsx("div", { className: "text-sm text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap", children: activeResult.rationale }))] })] }));
}
