import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Icon from "../components/Icon";
import { StatusPill } from "../components/UI";
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
        mutationFn: async (questionsPerPair) => (await api.post(`/api/requirements/${reqId}/regenerate`, { questions_per_pair: questionsPerPair })).data,
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
    if (isLoading || !data) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }));
    }
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["REQUIREMENTS \u00B7 ", data.topics.length, " \u0422\u0415\u041C \u00B7 ", data.bank.length, " \u0412\u041E\u041F\u0420\u041E\u0421\u041E\u0412"] }), editing ? (_jsxs("form", { onSubmit: (e) => {
                                    e.preventDefault();
                                    if (titleDraft.trim())
                                        renameMut.mutate(titleDraft.trim());
                                }, style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx("input", { autoFocus: true, value: titleDraft, onChange: (e) => setTitleDraft(e.target.value), className: "input", style: { fontSize: 22, fontWeight: 500, flex: 1 }, maxLength: 255 }), _jsx("button", { type: "submit", disabled: renameMut.isPending, className: "btn btn--primary btn--sm", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" }), _jsx("button", { type: "button", onClick: () => setEditing(false), className: "btn btn--sm", children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })) : (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("h1", { className: "page-title", style: { margin: 0 }, children: data.title }), _jsx("button", { type: "button", onClick: () => {
                                            setTitleDraft(data.title);
                                            setEditing(true);
                                        }, className: "btn btn--sm btn--ghost", title: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C", children: _jsx(Icon, { name: "edit", size: 11 }) })] })), _jsxs("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)", marginTop: 6 }, children: ["\u0441\u043E\u0437\u0434\u0430\u043D ", new Date(data.created_at).toLocaleString("ru-RU")] })] }), _jsxs("div", { style: { display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }, children: [_jsxs("button", { type: "button", onClick: () => {
                                    const raw = prompt("Сколько вопросов на пару тема × уровень? (1–10)\nСуществующий банк будет заменён.", "5");
                                    if (raw === null)
                                        return;
                                    const n = Number(raw);
                                    if (!Number.isFinite(n) || n < 1 || n > 10) {
                                        alert("Введите целое число от 1 до 10");
                                        return;
                                    }
                                    regenerateMut.mutate(Math.round(n));
                                }, disabled: regenerateMut.isPending, className: "btn", children: [_jsx(Icon, { name: "refresh", size: 13 }), regenerateMut.isPending ? "Генерирую..." : "Перегенерировать"] }), _jsxs("button", { type: "button", onClick: () => {
                                    if (confirm("Удалить проект безвозвратно? Все связанные сессии и отчёты тоже будут удалены.")) {
                                        deleteMut.mutate();
                                    }
                                }, disabled: deleteMut.isPending, className: "btn btn--danger", children: [_jsx(Icon, { name: "trash", size: 13 }), " \u0423\u0434\u0430\u043B\u0438\u0442\u044C"] }), _jsxs(Link, { to: "/admin/assignments", className: "btn btn--primary", children: [_jsx(Icon, { name: "tag", size: 13 }), " \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E"] })] })] }), regenerateMut.isError && (_jsx("div", { style: {
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "var(--danger-soft)",
                    border: "1px solid oklch(0.40 0.10 25)",
                    borderRadius: "var(--r-2)",
                    color: "oklch(0.78 0.16 25)",
                    fontSize: 13,
                }, children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0431\u0430\u043D\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." })), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18 }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 10,
                                        }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" }), !editingSummary && (_jsxs("button", { type: "button", onClick: () => {
                                                    setSummaryDraft(data.summary || "");
                                                    setEditingSummary(true);
                                                }, className: "btn btn--sm btn--ghost", children: [_jsx(Icon, { name: "edit", size: 11 }), data.summary ? "редактировать" : "добавить"] }))] }), editingSummary ? (_jsxs("form", { onSubmit: (e) => {
                                            e.preventDefault();
                                            summaryMut.mutate(summaryDraft);
                                        }, style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsx("textarea", { autoFocus: true, value: summaryDraft, onChange: (e) => setSummaryDraft(e.target.value), rows: 8, maxLength: 10000, className: "input textarea", style: { resize: "vertical" }, placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u2014 \u0437\u0430\u0434\u0430\u0447\u0430, \u0441\u0442\u0435\u043A, \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B..." }), _jsxs("div", { style: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }, children: [_jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)" }, children: [summaryDraft.length, " / 10000"] }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { type: "button", onClick: () => setEditingSummary(false), className: "btn btn--sm", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", disabled: summaryMut.isPending, className: "btn btn--primary btn--sm", children: summaryMut.isPending ? "Сохраняю..." : "Сохранить" })] })] })] })) : data.summary ? (_jsx("p", { style: {
                                            fontSize: 13,
                                            color: "var(--ink-2)",
                                            lineHeight: 1.65,
                                            whiteSpace: "pre-line",
                                            margin: 0,
                                        }, children: data.summary })) : (_jsx("p", { style: {
                                            fontSize: 13,
                                            color: "var(--ink-4)",
                                            fontStyle: "italic",
                                            margin: 0,
                                        }, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u043E." }))] }), _jsxs("div", { className: "card", style: { padding: 0 }, children: [_jsxs("div", { style: {
                                            padding: "16px 20px",
                                            borderBottom: "1px solid var(--bg-line)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }, children: [_jsxs("span", { style: { fontWeight: 500 }, children: ["\u0411\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 (", data.bank.length, ")"] }), _jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: ["~", data.topics.length * 3 * expectedPerPair, " \u043E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F"] })] }), data.topics.length === 0 ? (_jsx("div", { style: {
                                            padding: "20px",
                                            fontSize: 13,
                                            color: "var(--ink-3)",
                                        }, children: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0442\u0435\u043C\u044B." })) : (_jsx("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 10 }, children: data.topics.map((t) => {
                                            const byLevel = grouped.get(t.name);
                                            const totalCount = LEVELS.reduce((acc, lvl) => acc + (byLevel?.get(lvl)?.length ?? 0), 0);
                                            return (_jsxs("details", { style: {
                                                    border: "1px solid var(--bg-line)",
                                                    borderRadius: "var(--r-2)",
                                                }, children: [_jsxs("summary", { style: {
                                                            cursor: "pointer",
                                                            padding: "10px 14px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            fontSize: 13,
                                                            fontWeight: 500,
                                                            listStyle: "none",
                                                        }, children: [_jsx("span", { children: t.name }), _jsxs("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-4)" }, children: [totalCount, " \u0432\u043E\u043F\u0440."] })] }), _jsx("div", { style: {
                                                            padding: "0 14px 14px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 12,
                                                        }, children: LEVELS.map((lvl) => {
                                                            const items = byLevel?.get(lvl) ?? [];
                                                            const ok = items.length >= expectedPerPair;
                                                            return (_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: {
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: 8,
                                                                            marginBottom: 6,
                                                                            color: "var(--ink-3)",
                                                                        }, children: [_jsx("span", { children: lvl }), _jsxs("span", { className: `pill ${ok
                                                                                    ? "pill--accent"
                                                                                    : items.length > 0
                                                                                        ? "pill--warn"
                                                                                        : "pill--danger"}`, children: [items.length, "/", expectedPerPair] })] }), items.length === 0 ? (_jsx("div", { style: {
                                                                            fontSize: 12,
                                                                            color: "var(--ink-4)",
                                                                            fontStyle: "italic",
                                                                        }, children: "\u2014 \u043D\u0435\u0442 \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u2014" })) : (_jsx("ol", { style: {
                                                                            fontSize: 13,
                                                                            color: "var(--ink-2)",
                                                                            paddingLeft: 18,
                                                                            margin: 0,
                                                                            display: "flex",
                                                                            flexDirection: "column",
                                                                            gap: 4,
                                                                        }, children: items.map((q) => (_jsx("li", { style: { lineHeight: 1.55 }, children: q.prompt }, q.id))) }))] }, lvl));
                                                        }) })] }, t.name));
                                        }) }))] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18 }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card__label", children: ["\u0422\u0435\u043C\u044B (", data.topics.length, ")"] }), data.topics.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: "var(--ink-3)" }, children: "\u0422\u0435\u043C\u044B \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u044B." })) : (_jsx("ul", { style: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            margin: 0,
                                            padding: 0,
                                            listStyle: "none",
                                        }, children: data.topics.map((t) => (_jsxs("li", { style: {
                                                padding: "10px 12px",
                                                border: "1px solid var(--bg-line)",
                                                borderRadius: "var(--r-2)",
                                            }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: t.name }), t.description && (_jsx("div", { style: {
                                                        fontSize: 12,
                                                        color: "var(--ink-3)",
                                                        marginTop: 4,
                                                        lineHeight: 1.45,
                                                    }, children: t.description }))] }, t.name))) }))] }), _jsxs("div", { className: "card", style: { padding: 0 }, children: [_jsxs("div", { style: {
                                            padding: "16px 20px",
                                            borderBottom: "1px solid var(--bg-line)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }, children: [_jsxs("span", { style: { fontWeight: 500 }, children: ["\u0421\u0435\u0441\u0441\u0438\u0438 \u00B7 ", sessionsQ.data?.length ?? 0] }), _jsxs(Link, { to: "/admin/assignments", className: "btn btn--sm", children: [_jsx(Icon, { name: "tag", size: 11 }), " \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C"] })] }), sessionsQ.isLoading && (_jsx("div", { style: {
                                            padding: 20,
                                            fontSize: 13,
                                            color: "var(--ink-3)",
                                        }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })), !sessionsQ.isLoading && (sessionsQ.data?.length ?? 0) === 0 && (_jsx("div", { style: {
                                            padding: 20,
                                            fontSize: 13,
                                            color: "var(--ink-3)",
                                            textAlign: "center",
                                        }, children: "\u041F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0443 \u0435\u0449\u0451 \u043D\u0435 \u0431\u044B\u043B\u043E \u0441\u0435\u0441\u0441\u0438\u0439." })), (sessionsQ.data?.length ?? 0) > 0 &&
                                        sessionsQ.data?.map((s) => (_jsxs(Link, { to: s.status === "finished"
                                                ? `/sessions/${s.id}/report`
                                                : `/admin/sessions/${s.id}`, style: {
                                                padding: "12px 20px",
                                                borderBottom: "1px solid var(--bg-line)",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: 8,
                                                cursor: "pointer",
                                            }, children: [_jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 500 }, children: [_jsxs("span", { className: "mono", style: { color: "var(--ink-3)" }, children: ["#", s.id] }), " ", s.selected_level] }), _jsxs("div", { className: "mono", style: {
                                                                fontSize: 11,
                                                                color: "var(--ink-3)",
                                                                marginTop: 2,
                                                            }, children: [new Date(s.created_at).toLocaleString("ru-RU"), " \u00B7 ", s.mode] })] }), _jsx(StatusPill, { status: s.status })] }, s.id)))] })] })] })] }));
}
