import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
const LEVELS = ["junior", "middle", "senior"];
export default function RequirementsDetail() {
    const { id } = useParams();
    const reqId = Number(id);
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState("");
    const [editingSummary, setEditingSummary] = useState(false);
    const [summaryDraft, setSummaryDraft] = useState("");
    const { data, isLoading } = useQuery({
        queryKey: ["requirements", reqId],
        queryFn: async () => (await api.get(`/api/requirements/${reqId}`)).data,
        enabled: Number.isFinite(reqId),
    });
    const sessionsQ = useQuery({
        queryKey: ["sessions", "by-req", reqId],
        queryFn: async () => (await api.get(`/api/sessions?requirements_id=${reqId}`)).data,
        enabled: Number.isFinite(reqId),
    });
    const renameMut = useMutation({
        mutationFn: async (title) => (await api.patch(`/api/requirements/${reqId}`, { title })).data,
        onSuccess: (d) => {
            qc.setQueryData(["requirements", reqId], d);
            qc.invalidateQueries({ queryKey: ["requirements"] });
            setEditing(false);
        },
    });
    const summaryMut = useMutation({
        mutationFn: async (summary) => (await api.patch(`/api/requirements/${reqId}`, { summary })).data,
        onSuccess: (d) => {
            qc.setQueryData(["requirements", reqId], d);
            qc.invalidateQueries({ queryKey: ["requirements"] });
            setEditingSummary(false);
        },
    });
    const regenerateMut = useMutation({
        mutationFn: async (questionsPerPair) => (await api.post(`/api/requirements/${reqId}/regenerate`, {
            questions_per_pair: questionsPerPair,
        })).data,
        onSuccess: (d) => {
            qc.setQueryData(["requirements", reqId], d);
        },
    });
    const deleteMut = useMutation({
        mutationFn: async () => {
            await api.delete(`/api/requirements/${reqId}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["requirements"] });
            navigate("/projects");
        },
    });
    const grouped = useMemo(() => {
        const map = new Map();
        for (const q of data?.bank ?? []) {
            const t = map.get(q.topic) ?? new Map();
            const arr = t.get(q.level) ?? [];
            arr.push(q);
            t.set(q.level, arr);
            map.set(q.topic, t);
        }
        return map;
    }, [data?.bank]);
    // Целевое число вопросов на пару — оцениваем по существующему банку
    // (max counts across topics × levels). Если банк пуст — fallback на 5.
    const expectedPerPair = useMemo(() => {
        let max = 0;
        for (const byLevel of grouped.values()) {
            for (const arr of byLevel.values()) {
                if (arr.length > max)
                    max = arr.length;
            }
        }
        return max > 0 ? max : 5;
    }, [grouped]);
    if (isLoading || !data)
        return _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Breadcrumbs, { items: [
                    { label: "Проекты", to: "/projects" },
                    { label: data.title },
                ] }), _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [editing ? (_jsxs("form", { onSubmit: (e) => {
                                    e.preventDefault();
                                    if (titleDraft.trim())
                                        renameMut.mutate(titleDraft.trim());
                                }, className: "flex items-center gap-2", children: [_jsx("input", { autoFocus: true, value: titleDraft, onChange: (e) => setTitleDraft(e.target.value), className: "border rounded-lg px-3 py-1.5 text-lg font-semibold flex-1", maxLength: 255 }), _jsx("button", { type: "submit", disabled: renameMut.isPending, className: "bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => setEditing(false), className: "border border-slate-300 px-3 py-1.5 rounded-lg text-sm", children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })) : (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-semibold truncate", children: data.title }), _jsx("button", { type: "button", onClick: () => {
                                            setTitleDraft(data.title);
                                            setEditing(true);
                                        }, className: "text-xs text-slate-500 hover:text-slate-800 underline", children: "\u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C" })] })), _jsxs("div", { className: "text-xs text-slate-400 mt-1", children: ["\u0421\u043E\u0437\u0434\u0430\u043D ", new Date(data.created_at).toLocaleString("ru-RU")] })] }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsx(Link, { to: `/requirements/${reqId}/new-session`, className: "bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm", children: "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" }), _jsx("button", { type: "button", onClick: () => {
                                    const raw = prompt("Сколько вопросов на пару тема × уровень? (1–10)\nСуществующий банк будет заменён.", "5");
                                    if (raw === null)
                                        return; // отмена
                                    const n = Number(raw);
                                    if (!Number.isFinite(n) || n < 1 || n > 10) {
                                        alert("Введите целое число от 1 до 10");
                                        return;
                                    }
                                    regenerateMut.mutate(Math.round(n));
                                }, disabled: regenerateMut.isPending, className: "border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50", children: regenerateMut.isPending ? "Генерирую..." : "Перегенерировать банк" }), _jsx("button", { type: "button", onClick: () => {
                                    if (confirm("Удалить проект безвозвратно? Все связанные сессии и отчёты тоже будут удалены.")) {
                                        deleteMut.mutate();
                                    }
                                }, disabled: deleteMut.isPending, className: "border border-rose-300 text-rose-700 hover:border-rose-500 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }), regenerateMut.isError && (_jsx("div", { className: "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0431\u0430\u043D\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." })), _jsxs("section", { className: "bg-white rounded-xl border p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h2", { className: "font-semibold", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" }), !editingSummary && (_jsx("button", { type: "button", onClick: () => {
                                    setSummaryDraft(data.summary || "");
                                    setEditingSummary(true);
                                }, className: "text-xs text-slate-500 hover:text-slate-800 underline", children: data.summary ? "редактировать" : "добавить" }))] }), editingSummary ? (_jsxs("form", { onSubmit: (e) => {
                            e.preventDefault();
                            summaryMut.mutate(summaryDraft);
                        }, className: "space-y-2", children: [_jsx("textarea", { autoFocus: true, value: summaryDraft, onChange: (e) => setSummaryDraft(e.target.value), rows: 8, maxLength: 10000, className: "w-full text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand resize-y leading-relaxed", placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u2014 \u0437\u0430\u0434\u0430\u0447\u0430, \u0441\u0442\u0435\u043A, \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B..." }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-xs text-slate-400", children: [summaryDraft.length, " / 10000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setEditingSummary(false), className: "border border-slate-300 px-3 py-1.5 rounded-lg text-sm", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", disabled: summaryMut.isPending, className: "bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50", children: summaryMut.isPending ? "Сохраняю..." : "Сохранить" })] })] }), summaryMut.isError && (_jsx("div", { className: "text-rose-600 text-sm", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u2014 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }))] })) : data.summary ? (_jsx("p", { className: "text-slate-700 text-sm leading-relaxed whitespace-pre-line", children: data.summary })) : (_jsx("p", { className: "text-sm text-slate-400 italic", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E." }))] }), _jsxs("section", { className: "bg-white rounded-xl border p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "font-semibold", children: ["\u041F\u0440\u043E\u0448\u043B\u044B\u0435 \u0441\u0435\u0441\u0441\u0438\u0438 \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0443 (", sessionsQ.data?.length ?? 0, ")"] }), _jsx(Link, { to: `/requirements/${reqId}/new-session`, className: "text-sm bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E" })] }), sessionsQ.isLoading && _jsx("div", { className: "text-sm text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), !sessionsQ.isLoading && (sessionsQ.data?.length ?? 0) === 0 && (_jsx("div", { className: "text-sm text-slate-500", children: "\u041F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0443 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E \u0441\u0435\u0441\u0441\u0438\u0439." })), (sessionsQ.data?.length ?? 0) > 0 && (_jsx("div", { className: "space-y-2", children: sessionsQ.data?.map((s) => (_jsxs(Link, { to: s.status === "finished"
                                ? `/sessions/${s.id}/report`
                                : `/sessions/${s.id}/interview`, className: "flex items-center justify-between border rounded-lg px-3 py-2 hover:border-brand transition-colors", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-sm font-medium", children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", s.id, " \u2022 ", s.selected_level] }), _jsxs("div", { className: "text-xs text-slate-500 mt-0.5", children: [new Date(s.created_at).toLocaleString("ru-RU"), " \u2022 ", s.mode === "text" ? "текст" : "голос"] })] }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${s.status === "finished"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : s.status === "active"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-slate-100 text-slate-600"}`, children: s.status === "finished" ? "Завершено" : s.status === "active" ? "В процессе" : "Черновик" })] }, s.id))) }))] }), _jsxs("section", { className: "bg-white rounded-xl border p-5", children: [_jsxs("h2", { className: "font-semibold mb-3", children: ["\u0422\u0435\u043C\u044B (", data.topics.length, ")"] }), data.topics.length === 0 ? (_jsx("div", { className: "text-sm text-slate-500", children: "\u0422\u0435\u043C\u044B \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u044B." })) : (_jsx("ul", { className: "space-y-2", children: data.topics.map((t) => (_jsxs("li", { className: "border rounded-lg p-3", children: [_jsx("div", { className: "font-medium text-sm", children: t.name }), t.description && (_jsx("div", { className: "text-xs text-slate-600 mt-1", children: t.description }))] }, t.name))) }))] }), _jsxs("section", { className: "bg-white rounded-xl border p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "font-semibold", children: ["\u0411\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 (", data.bank.length, ")"] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["\u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F ~", data.topics.length * 3 * expectedPerPair, " (", expectedPerPair, " \u043D\u0430 \u043F\u0430\u0440\u0443 \u0442\u0435\u043C\u0430 \u00D7 \u0443\u0440\u043E\u0432\u0435\u043D\u044C)"] })] }), data.topics.length === 0 ? (_jsx("div", { className: "text-sm text-slate-500", children: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0442\u0435\u043C\u044B." })) : (_jsx("div", { className: "space-y-4", children: data.topics.map((t) => {
                            const byLevel = grouped.get(t.name);
                            return (_jsxs("details", { className: "border rounded-lg", open: true, children: [_jsxs("summary", { className: "cursor-pointer px-3 py-2 font-medium text-sm flex items-center gap-2", children: [_jsx("span", { children: t.name }), _jsxs("span", { className: "text-xs text-slate-400", children: ["(", LEVELS.reduce((acc, lvl) => acc + (byLevel?.get(lvl)?.length ?? 0), 0), " \u0432\u043E\u043F\u0440.)"] })] }), _jsx("div", { className: "px-3 pb-3 space-y-3", children: LEVELS.map((lvl) => {
                                            const items = byLevel?.get(lvl) ?? [];
                                            return (_jsxs("div", { children: [_jsxs("div", { className: "text-xs uppercase text-slate-500 mb-1 flex items-center gap-2", children: [_jsx("span", { children: lvl }), _jsxs("span", { className: `text-[10px] px-1.5 py-0.5 rounded ${items.length >= expectedPerPair
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : items.length > 0
                                                                        ? "bg-amber-100 text-amber-800"
                                                                        : "bg-rose-100 text-rose-800"}`, children: [items.length, "/", expectedPerPair] })] }), items.length === 0 ? (_jsx("div", { className: "text-xs text-slate-400", children: "\u2014 \u043D\u0435\u0442 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u2014" })) : (_jsx("ol", { className: "text-sm text-slate-700 list-decimal list-inside space-y-1", children: items.map((q) => (_jsx("li", { className: "leading-relaxed", children: q.prompt }, q.id))) }))] }, lvl));
                                        }) })] }, t.name));
                        }) }))] })] }));
}
