import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import Icon from "../components/Icon";
import { StatusPill } from "../components/UI";
export default function Sessions() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const { data, isLoading } = useQuery({
        queryKey: ["sessions"],
        queryFn: async () => (await api.get("/api/sessions")).data,
    });
    const sessions = data ?? [];
    const [q, setQ] = useState("");
    const [semantic, setSemantic] = useState(false);
    const [filter, setFilter] = useState("all");
    const counts = useMemo(() => {
        return {
            all: sessions.length,
            active: sessions.filter((s) => s.status === "active").length,
            finished: sessions.filter((s) => s.status === "finished").length,
            draft: sessions.filter((s) => s.status === "draft").length,
        };
    }, [sessions]);
    const filtered = useMemo(() => {
        return sessions.filter((s) => {
            if (filter !== "all" && s.status !== filter)
                return false;
            if (q && !semantic) {
                const hay = [
                    "#" + s.id,
                    s.selected_topics.join(" "),
                    s.selected_level,
                    s.mode,
                ]
                    .join(" ")
                    .toLowerCase();
                return hay.includes(q.toLowerCase());
            }
            return true;
        });
    }, [sessions, filter, q, semantic]);
    return (_jsxs("div", { className: "page", children: [_jsxs("div", { className: "page-head", children: [_jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["HISTORY \u00B7 ", sessions.length, " \u0421\u0415\u0421\u0421\u0418\u0419"] }), _jsx("h1", { className: "page-title", children: isAdmin ? "История сессий" : "Мои отчёты" }), _jsx("div", { className: "page-sub", children: isAdmin
                                    ? "Полнотекстовый и семантический поиск по транскриптам, фильтры и быстрые экспорты."
                                    : "Опубликованные отчёты по вашим кикоффам." })] }), isAdmin && (_jsxs(Link, { to: "/admin/assignments", className: "btn btn--primary", children: [_jsx(Icon, { name: "tag", size: 14 }), " \u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C kick-off"] }))] }), _jsxs("div", { className: "card", style: { marginBottom: 16, padding: 16 }, children: [_jsxs("div", { style: {
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            marginBottom: 12,
                        }, children: [_jsxs("div", { className: "search", style: { flex: 1 }, children: [_jsx("span", { className: "search__icon", children: _jsx(Icon, { name: semantic ? "sparkle" : "search", size: 14 }) }), _jsx("input", { className: "input", value: q, onChange: (e) => setQ(e.target.value), placeholder: semantic
                                            ? "найди, где обсуждали сроки запуска…"
                                            : "поиск по проекту, темам, кандидатам…" }), _jsx("span", { className: "search__kbd", children: "\u2318K" })] }), _jsxs("button", { type: "button", onClick: () => setSemantic((s) => !s), className: "btn", style: semantic
                                    ? {
                                        background: "var(--accent)",
                                        color: "var(--accent-ink)",
                                        borderColor: "var(--accent)",
                                    }
                                    : {}, children: [_jsx(Icon, { name: "sparkle", size: 13 }), "\u0421\u0435\u043C\u0430\u043D\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439"] }), _jsxs("button", { type: "button", className: "btn", children: [_jsx(Icon, { name: "filter", size: 13 }), "\u0424\u0438\u043B\u044C\u0442\u0440\u044B"] })] }), _jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
                            { k: "all", n: `Все · ${counts.all}` },
                            { k: "active", n: `В эфире · ${counts.active}` },
                            { k: "finished", n: `Завершено · ${counts.finished}` },
                            { k: "draft", n: `Черновики · ${counts.draft}` },
                        ].map((f) => (_jsx("button", { type: "button", onClick: () => setFilter(f.k), className: "pill", style: {
                                cursor: "pointer",
                                padding: "5px 12px",
                                background: filter === f.k ? "var(--accent)" : "var(--bg-2)",
                                color: filter === f.k ? "var(--accent-ink)" : "var(--ink-2)",
                                borderColor: filter === f.k ? "var(--accent)" : "var(--bg-line)",
                            }, children: f.n }, f.k))) })] }), isLoading ? (_jsx("div", { className: "card", style: { color: "var(--ink-3)", textAlign: "center" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : filtered.length === 0 ? (_jsxs("div", { className: "card", style: {
                    padding: 40,
                    textAlign: "center",
                    color: "var(--ink-3)",
                }, children: [sessions.length === 0
                        ? isAdmin
                            ? "Пока нет ни одной сессии."
                            : "Опубликованных отчётов пока нет."
                        : "По заданным фильтрам ничего не найдено.", isAdmin && (_jsx("div", { style: { marginTop: 12 }, children: _jsxs(Link, { to: "/upload", className: "btn btn--primary btn--sm", children: [_jsx(Icon, { name: "upload", size: 12 }), " \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0422\u0417"] }) }))] })) : (_jsxs("div", { className: "card", style: { padding: 0 }, children: [_jsx("div", { style: {
                            padding: "10px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            display: "grid",
                            gridTemplateColumns: "60px 1fr 160px 100px 100px 100px",
                            gap: 16,
                            alignItems: "center",
                        }, children: ["#", "Темы / режим", "Дата", "Длительность", "Уровень", "Статус"].map((h) => (_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)" }, children: h }, h))) }), filtered.map((s) => (_jsxs(Link, { to: s.status === "finished"
                            ? `/sessions/${s.id}/report`
                            : isAdmin
                                ? `/admin/sessions/${s.id}`
                                : `/sessions/${s.id}/interview`, style: {
                            padding: "14px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            cursor: "pointer",
                            display: "grid",
                            gridTemplateColumns: "60px 1fr 160px 100px 100px 100px",
                            gap: 16,
                            alignItems: "center",
                        }, children: [_jsxs("span", { className: "mono", style: { color: "var(--ink-3)" }, children: ["#", s.id] }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: s.selected_topics.join(", ") || "—" }), _jsx("div", { style: {
                                            fontSize: 11,
                                            color: "var(--ink-3)",
                                            fontFamily: "var(--font-mono)",
                                        }, children: s.mode })] }), _jsx("span", { className: "mono", style: { color: "var(--ink-3)", fontSize: 12 }, children: new Date(s.created_at).toLocaleString("ru-RU") }), _jsxs("span", { className: "mono", style: { fontSize: 12, color: "var(--ink-3)" }, children: [s.target_duration_min, " \u043C\u0438\u043D"] }), _jsx("span", { className: "pill", style: { justifyContent: "center" }, children: s.selected_level }), _jsx(StatusPill, { status: s.status })] }, s.id)))] }))] }));
}
