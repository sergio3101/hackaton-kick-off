import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
export default function Upload() {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [questionsPerPair, setQuestionsPerPair] = useState(5);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    async function onSubmit(e) {
        e.preventDefault();
        if (files.length === 0 && !text.trim()) {
            setError("Загрузите хотя бы один .md файл или вставьте текст");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const fd = new FormData();
            if (title.trim())
                fd.append("title", title.trim());
            if (text.trim())
                fd.append("text", text);
            fd.append("questions_per_pair", String(questionsPerPair));
            files.forEach((f) => fd.append("files", f));
            const r = await api.post("/api/requirements", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            navigate(`/requirements/${r.data.id}`);
        }
        catch (e) {
            setError(e?.response?.data?.detail || "Не удалось обработать требования");
        }
        finally {
            setBusy(false);
        }
    }
    function onPickFiles(e) {
        const list = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".md"));
        setFiles(list);
    }
    return (_jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsx("h1", { className: "text-2xl font-semibold mb-6", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" }), _jsxs("form", { onSubmit: onSubmit, className: "bg-white border rounded-xl p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-600 mb-1", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" }), _jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Mobile Banking Q3", className: "w-full px-3 py-2 border rounded-lg" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-600 mb-1", children: "Markdown \u0444\u0430\u0439\u043B\u044B (.md)" }), _jsx("input", { type: "file", multiple: true, accept: ".md,text/markdown", onChange: onPickFiles, className: "block w-full text-sm" }), files.length > 0 && (_jsx("ul", { className: "text-xs text-slate-500 mt-2 space-y-0.5", children: files.map((f) => (_jsxs("li", { children: ["\u2022 ", f.name, " (", Math.round(f.size / 1024), " KB)"] }, f.name))) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-600 mb-1", children: "\u2026\u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E" }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 8, placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 Markdown...", className: "w-full px-3 py-2 border rounded-lg font-mono text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-slate-600 mb-1", children: "\u0412\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043D\u0430 \u043F\u0430\u0440\u0443 \u0442\u0435\u043C\u0430 \u00D7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "number", min: 1, max: 10, value: questionsPerPair, onChange: (e) => {
                                            const n = Number(e.target.value);
                                            if (Number.isFinite(n))
                                                setQuestionsPerPair(Math.max(1, Math.min(10, n)));
                                        }, className: "w-20 px-3 py-2 border rounded-lg text-center" }), _jsxs("span", { className: "text-xs text-slate-500", children: ["\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E 5. \u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D 1\u201310. \u041D\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0442\u0435\u043C\u0443 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F", " ", _jsx("strong", { children: questionsPerPair * 3 }), " \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 (junior + middle + senior). \u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 = \u0434\u043E\u043B\u044C\u0448\u0435 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u0442\u043E\u043A\u0435\u043D\u043E\u0432."] })] })] }), error && _jsx("div", { className: "text-rose-600 text-sm", children: error }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "submit", disabled: busy, className: "bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-lg disabled:opacity-50", children: busy ? "Анализ требований и генерация банка вопросов..." : "Загрузить и сгенерировать" }) }), _jsx("div", { className: "text-xs text-slate-400", children: "\u041D\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0443\u0445\u043E\u0434\u0438\u0442 \u0434\u043E 30 \u0441\u0435\u043A\u0443\u043D\u0434." })] })] }));
}
