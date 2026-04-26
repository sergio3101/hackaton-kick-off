import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Icon from "../components/Icon";
export default function MyAssignments() {
    const qc = useQueryClient();
    const nav = useNavigate();
    const listQ = useQuery({
        queryKey: ["me", "assignments"],
        queryFn: async () => (await api.get("/api/me/assignments")).data,
    });
    const startM = useMutation({
        mutationFn: async (id) => (await api.post(`/api/me/assignments/${id}/start`)).data,
        onSuccess: (sess) => {
            qc.invalidateQueries({ queryKey: ["me", "assignments"] });
            nav(`/sessions/${sess.id}/interview`);
        },
    });
    const startingId = startM.isPending ? startM.variables : null;
    if (listQ.isLoading) {
        return (_jsx("div", { className: "page", style: { color: "var(--ink-3)" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }));
    }
    const data = listQ.data ?? [];
    return (_jsxs("div", { className: "page", children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 8 }, children: ["ASSIGNMENTS \u00B7 ", data.length] }), _jsx("h1", { className: "page-title", children: "\u041C\u043E\u0438 \u043A\u0438\u043A\u043E\u0444\u0444\u044B" }), _jsx("div", { className: "page-sub", children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0438 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0442\u0447\u0451\u0442\u044B \u043F\u043E \u043D\u0438\u043C." })] }) }), data.length === 0 ? (_jsx("div", { className: "card", style: {
                    padding: 40,
                    textAlign: "center",
                    color: "var(--ink-3)",
                }, children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044B\u0445 \u043A\u0438\u043A\u043E\u0444\u0444\u043E\u0432. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435, \u043F\u043E\u043A\u0430 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043D\u0430\u0437\u043D\u0430\u0447\u0438\u0442 \u0432\u0430\u043C \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E." })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: data.map((a) => (_jsx(AssignmentCard, { a: a, starting: startingId === a.id, disabled: startM.isPending && startingId !== a.id, onStart: () => startM.mutate(a.id) }, a.id))) }))] }));
}
function AssignmentCard({ a, onStart, starting, disabled, }) {
    const isPublished = a.status === "published";
    const inProgress = a.status === "started";
    const completedNotPublished = a.status === "completed";
    return (_jsx("div", { className: "card", children: _jsxs("div", { style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
            }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 6 }, children: a.selected_level }), _jsx("div", { style: {
                                fontSize: 18,
                                fontWeight: 500,
                                letterSpacing: "-0.01em",
                                marginBottom: 6,
                            }, children: a.requirements_title }), _jsxs("div", { style: { fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }, children: ["\u0422\u0435\u043C\u044B:", " ", _jsx("span", { className: "mono", children: a.selected_topics.join(", ") || "—" })] }), a.note && (_jsxs("div", { style: {
                                fontSize: 12,
                                color: "var(--ink-3)",
                                fontStyle: "italic",
                                marginTop: 4,
                            }, children: ["\u00AB", a.note, "\u00BB"] }))] }), _jsxs("div", { style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 8,
                    }, children: [_jsx(StatusBadge, { status: a.status }), a.status === "assigned" && (_jsx("button", { type: "button", onClick: onStart, disabled: starting || disabled, className: "btn btn--primary", children: starting ? ("Запускаю...") : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "play", size: 13 }), " \u041F\u0440\u043E\u0439\u0442\u0438 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E"] })) })), inProgress && a.session_id && (_jsxs(Link, { to: `/sessions/${a.session_id}/interview`, className: "btn btn--primary", style: { background: "var(--warn)", borderColor: "var(--warn)" }, children: ["\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C ", _jsx(Icon, { name: "arrow-right", size: 13 })] })), completedNotPublished && (_jsx("span", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: "\u0436\u0434\u0451\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C" })), isPublished && a.session_id && (_jsxs(Link, { to: `/sessions/${a.session_id}/report`, className: "btn btn--primary", children: [_jsx(Icon, { name: "doc", size: 13 }), " \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442"] }))] })] }) }));
}
function StatusBadge({ status }) {
    const labels = {
        assigned: "Назначено",
        started: "В процессе",
        completed: "На проверке",
        published: "Результаты доступны",
    };
    const variant = {
        assigned: "",
        started: "pill--warn",
        completed: "pill--info",
        published: "pill--accent",
    };
    return (_jsx("span", { className: `pill ${variant[status] ?? ""}`, children: labels[status] ?? status }));
}
