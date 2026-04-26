import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Icon from "../components/Icon";
const EMPTY_FORM = {
    user_id: null,
    requirements_id: null,
    selected_topics: [],
    selected_level: "middle",
    mode: "voice",
    target_duration_min: 12,
    note: "",
};
export default function AdminAssignments() {
    const qc = useQueryClient();
    const usersQ = useQuery({
        queryKey: ["admin", "users"],
        queryFn: async () => (await api.get("/api/admin/users")).data,
    });
    const projectsQ = useQuery({
        queryKey: ["requirements"],
        queryFn: async () => (await api.get("/api/requirements")).data,
    });
    const assignmentsQ = useQuery({
        queryKey: ["admin", "assignments"],
        queryFn: async () => (await api.get("/api/admin/assignments")).data,
    });
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState(null);
    const detailQ = useQuery({
        queryKey: ["requirements", form.requirements_id, "detail"],
        queryFn: async () => (await api.get(`/api/requirements/${form.requirements_id}`)).data,
        enabled: form.requirements_id != null,
    });
    const availableTopics = useMemo(() => detailQ.data?.topics.map((t) => t.name) ?? [], [detailQ.data]);
    const createM = useMutation({
        mutationFn: async (payload) => (await api.post("/api/admin/assignments", {
            user_id: payload.user_id,
            requirements_id: payload.requirements_id,
            selected_topics: payload.selected_topics,
            selected_level: payload.selected_level,
            mode: payload.mode,
            target_duration_min: payload.target_duration_min,
            note: payload.note,
        })).data,
        onSuccess: () => {
            setForm(EMPTY_FORM);
            setError(null);
            qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
        },
        onError: (err) => setError(err?.response?.data?.detail ?? "Ошибка"),
    });
    const deleteM = useMutation({
        mutationFn: async (id) => (await api.delete(`/api/admin/assignments/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assignments"] }),
    });
    const toggleTopic = (t) => setForm((f) => ({
        ...f,
        selected_topics: f.selected_topics.includes(t)
            ? f.selected_topics.filter((x) => x !== t)
            : [...f.selected_topics, t],
    }));
    const canSubmit = form.user_id != null &&
        form.requirements_id != null &&
        form.selected_topics.length >= 1;
    const regularUsers = usersQ.data?.filter((u) => u.role === "user") ?? [];
    return (_jsxs("div", { className: "page", children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["ADMIN \u00B7 ASSIGNMENTS \u00B7 ", assignmentsQ.data?.length ?? 0] }), _jsx("h1", { className: "page-title", children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043A\u0438\u043A\u043E\u0444\u0444\u043E\u0432" }), _jsx("div", { className: "page-sub", children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0430\u0439\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044B \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F." })] }) }), _jsxs("div", { className: "card", style: { marginBottom: 18 }, children: [_jsx("div", { className: "card__label", children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u043A\u0438\u043A\u043E\u0444\u0444" }), _jsxs("div", { style: {
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginBottom: 12,
                        }, children: [_jsx(FormField, { label: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C", children: _jsxs("select", { className: "select", value: form.user_id ?? "", onChange: (e) => setForm({
                                        ...form,
                                        user_id: e.target.value ? Number(e.target.value) : null,
                                    }), children: [_jsx("option", { value: "", children: "\u2014 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u2014" }), regularUsers.map((u) => (_jsxs("option", { value: u.id, children: [u.email, " ", u.full_name ? `(${u.full_name})` : ""] }, u.id)))] }) }), _jsx(FormField, { label: "\u041F\u0440\u043E\u0435\u043A\u0442", children: _jsxs("select", { className: "select", value: form.requirements_id ?? "", onChange: (e) => setForm({
                                        ...form,
                                        requirements_id: e.target.value ? Number(e.target.value) : null,
                                        selected_topics: [],
                                    }), children: [_jsx("option", { value: "", children: "\u2014 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u2014" }), projectsQ.data?.map((p) => (_jsx("option", { value: p.id, children: p.title }, p.id)))] }) }), _jsx(FormField, { label: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C", children: _jsxs("select", { className: "select", value: form.selected_level, onChange: (e) => setForm({ ...form, selected_level: e.target.value }), children: [_jsx("option", { value: "junior", children: "junior" }), _jsx("option", { value: "middle", children: "middle" }), _jsx("option", { value: "senior", children: "senior" })] }) }), _jsx(FormField, { label: "\u0420\u0435\u0436\u0438\u043C", children: _jsxs("select", { className: "select", value: form.mode, onChange: (e) => setForm({ ...form, mode: e.target.value }), children: [_jsx("option", { value: "voice", children: "\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439" }), _jsx("option", { value: "text", children: "\u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439" })] }) })] }), form.requirements_id != null && (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 6 }, children: "\u0422\u0435\u043C\u044B" }), _jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: [availableTopics.map((t) => {
                                        const on = form.selected_topics.includes(t);
                                        return (_jsxs("button", { type: "button", onClick: () => toggleTopic(t), className: "pill", style: {
                                                cursor: "pointer",
                                                padding: "5px 12px",
                                                background: on ? "var(--accent)" : "var(--bg-2)",
                                                color: on ? "var(--accent-ink)" : "var(--ink-2)",
                                                borderColor: on ? "var(--accent)" : "var(--bg-line)",
                                            }, children: [on && _jsx(Icon, { name: "check", size: 11 }), t] }, t));
                                    }), availableTopics.length === 0 && (_jsx("span", { style: { fontSize: 12, color: "var(--ink-3)" }, children: "\u0422\u0435\u043C\u044B \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044E\u0442\u0441\u044F..." }))] })] })), _jsx("textarea", { className: "input textarea", style: { resize: "vertical", marginBottom: 12 }, rows: 2, placeholder: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)", value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }) }), error && (_jsx("div", { style: {
                            fontSize: 12,
                            color: "var(--danger-fg)",
                            marginBottom: 8,
                        }, children: error })), _jsxs("button", { type: "button", onClick: () => createM.mutate(form), disabled: !canSubmit || createM.isPending, className: "btn btn--primary", children: [_jsx(Icon, { name: "plus", size: 13 }), createM.isPending ? "Создаю..." : "Назначить"] })] }), _jsxs("div", { className: "card", style: { padding: 0, overflow: "hidden" }, children: [_jsx("div", { style: {
                            padding: "10px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 110px 110px",
                            gap: 16,
                            alignItems: "center",
                        }, children: ["ПОЛЬЗОВАТЕЛЬ", "ПРОЕКТ", "УРОВЕНЬ / ТЕМЫ", "СТАТУС", ""].map((h, i) => (_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)" }, children: h }, i))) }), assignmentsQ.isLoading && (_jsx("div", { style: { padding: 20, color: "var(--ink-3)", fontSize: 13 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })), !assignmentsQ.isLoading && (assignmentsQ.data?.length ?? 0) === 0 && (_jsx("div", { style: { padding: 20, color: "var(--ink-3)", fontSize: 13 }, children: "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442." })), assignmentsQ.data?.map((a) => (_jsxs("div", { style: {
                            padding: "12px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 110px 110px",
                            gap: 16,
                            alignItems: "center",
                            fontSize: 13,
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: a.user_email }), _jsx("div", { style: { fontSize: 11, color: "var(--ink-3)" }, children: a.user_full_name || "" })] }), _jsx("div", { style: { fontSize: 13 }, children: a.requirements_title }), _jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)" }, children: a.selected_level }), _jsx("div", { className: "mono", style: {
                                            fontSize: 11,
                                            color: "var(--ink-3)",
                                            marginTop: 2,
                                        }, children: a.selected_topics.join(", ") })] }), _jsx(StatusPillSmall, { status: a.status }), _jsx("div", { style: {
                                    display: "flex",
                                    gap: 6,
                                    justifyContent: "flex-end",
                                }, children: a.session_id ? (_jsx(Link, { to: `/admin/sessions/${a.session_id}`, className: "btn btn--sm", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" })) : a.status === "assigned" ? (_jsx("button", { type: "button", onClick: () => {
                                        if (confirm("Удалить назначение?"))
                                            deleteM.mutate(a.id);
                                    }, className: "btn btn--sm", style: {
                                        color: "var(--danger-fg)",
                                        borderColor: "var(--danger-border)",
                                    }, children: _jsx(Icon, { name: "trash", size: 11 }) })) : null })] }, a.id)))] })] }));
}
function FormField({ label, children, }) {
    return (_jsxs("label", { style: {
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
        }, children: [label, children] }));
}
function StatusPillSmall({ status }) {
    const variant = {
        assigned: "",
        started: "pill--warn",
        completed: "pill--info",
        published: "pill--accent",
    };
    return _jsx("span", { className: `pill ${variant[status] ?? ""}`, children: status });
}
