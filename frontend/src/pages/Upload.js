import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Icon from "../components/Icon";
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
    return (_jsxs("div", { className: "page", style: { maxWidth: 880 }, children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: "UPLOAD \u00B7 \u0410\u0420\u0422\u0415\u0424\u0410\u041A\u0422\u042B \u041F\u0420\u041E\u0415\u041A\u0422\u0410" }), _jsx("h1", { className: "page-title", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0422\u0417" }), _jsx("div", { className: "page-sub", children: "\u0418\u0418 \u0438\u0437\u0432\u043B\u0435\u0447\u0451\u0442 \u0442\u0435\u043C\u044B \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442 \u0431\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043D\u0430 \u043C\u0430\u0442\u0440\u0438\u0446\u0443 \u0442\u0435\u043C\u0430 \u00D7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C." })] }) }), _jsxs("form", { onSubmit: onSubmit, className: "card", style: { display: "flex", flexDirection: "column", gap: 16 }, children: [_jsxs("div", { children: [_jsx("label", { style: {
                                    display: "block",
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "var(--ink-3)",
                                    marginBottom: 6,
                                }, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" }), _jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: FleetOps Q3", className: "input" })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                    display: "block",
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "var(--ink-3)",
                                    marginBottom: 6,
                                }, children: "Markdown \u0444\u0430\u0439\u043B\u044B (.md)" }), _jsxs("div", { style: {
                                    padding: 16,
                                    border: "1px dashed var(--bg-line)",
                                    borderRadius: "var(--r-2)",
                                    background: "var(--bg-2)",
                                }, children: [_jsx("input", { type: "file", multiple: true, accept: ".md,text/markdown", onChange: onPickFiles, style: {
                                            display: "block",
                                            width: "100%",
                                            fontSize: 12,
                                            color: "var(--ink-2)",
                                        } }), files.length > 0 && (_jsx("ul", { style: {
                                            fontSize: 11,
                                            color: "var(--ink-3)",
                                            marginTop: 10,
                                            padding: 0,
                                            listStyle: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2,
                                        }, children: files.map((f) => (_jsxs("li", { className: "mono", children: ["\u2022 ", f.name, " (", Math.round(f.size / 1024), " KB)"] }, f.name))) }))] })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                    display: "block",
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "var(--ink-3)",
                                    marginBottom: 6,
                                }, children: "\u2026\u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E" }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 8, placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 Markdown...", className: "input textarea mono", style: { resize: "vertical", fontSize: 12 } })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                    display: "block",
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "var(--ink-3)",
                                    marginBottom: 6,
                                }, children: "\u0412\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043D\u0430 \u043F\u0430\u0440\u0443 \u0442\u0435\u043C\u0430 \u00D7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("input", { type: "number", min: 1, max: 10, value: questionsPerPair, onChange: (e) => {
                                            const n = Number(e.target.value);
                                            if (Number.isFinite(n))
                                                setQuestionsPerPair(Math.max(1, Math.min(10, n)));
                                        }, className: "input", style: { width: 80, textAlign: "center" } }), _jsxs("span", { style: { fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }, children: ["\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E 5. \u041D\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0442\u0435\u043C\u0443 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F", " ", _jsx("strong", { className: "mono", style: { color: "var(--accent)" }, children: questionsPerPair * 3 }), " ", "\u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 (junior + middle + senior)."] })] })] }), error && (_jsx("div", { className: "state-block state-block--danger", style: { fontSize: 13 }, children: error })), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            paddingTop: 4,
                        }, children: [_jsx("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)" }, children: "\u041D\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u0443\u0445\u043E\u0434\u0438\u0442 \u0434\u043E 30 \u0441\u0435\u043A\u0443\u043D\u0434" }), _jsx("button", { type: "submit", disabled: busy, className: "btn btn--primary btn--lg", children: busy
                                    ? "Генерируем банк вопросов..."
                                    : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "sparkle", size: 14 }), " \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C"] })) })] })] })] }));
}
