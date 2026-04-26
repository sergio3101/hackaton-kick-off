import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import Icon from "../components/Icon";
export default function AdminUsers() {
    const qc = useQueryClient();
    const usersQ = useQuery({
        queryKey: ["admin", "users"],
        queryFn: async () => (await api.get("/api/admin/users")).data,
    });
    const [form, setForm] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "user",
    });
    const [error, setError] = useState(null);
    const createM = useMutation({
        mutationFn: async (payload) => (await api.post("/api/admin/users", payload)).data,
        onSuccess: () => {
            setForm({ email: "", password: "", full_name: "", role: "user" });
            setError(null);
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
        },
        onError: (err) => setError(err?.response?.data?.detail ?? "Ошибка"),
    });
    const patchM = useMutation({
        mutationFn: async (vars) => (await api.patch(`/api/admin/users/${vars.id}`, vars.patch)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    });
    const deleteM = useMutation({
        mutationFn: async (id) => (await api.delete(`/api/admin/users/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    });
    return (_jsxs("div", { className: "page", children: [_jsx("div", { className: "page-head", children: _jsxs("div", { children: [_jsxs("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 8 }, children: ["ADMIN \u00B7 USERS \u00B7 ", usersQ.data?.length ?? 0] }), _jsx("h1", { className: "page-title", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" }), _jsx("div", { className: "page-sub", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0443\u0447\u0451\u0442\u043D\u044B\u043C\u0438 \u0437\u0430\u043F\u0438\u0441\u044F\u043C\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B: \u0440\u043E\u043B\u0438, \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F, \u0441\u0431\u0440\u043E\u0441 \u043F\u0430\u0440\u043E\u043B\u044F." })] }) }), _jsxs("div", { className: "card", style: { marginBottom: 18 }, children: [_jsx("div", { className: "card__label", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsxs("form", { autoComplete: "off", onSubmit: (e) => {
                            e.preventDefault();
                            if (!form.email || form.password.length < 6)
                                return;
                            createM.mutate(form);
                        }, children: [_jsxs("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                    gap: 12,
                                    marginBottom: 12,
                                }, children: [_jsx(FormField, { label: "Email", children: _jsx("input", { className: "input", type: "email", name: "new-user-email", autoComplete: "off", placeholder: "user@example.com", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }) }) }), _jsx(FormField, { label: "\u0424\u0418\u041E", children: _jsx("input", { className: "input", type: "text", name: "new-user-full-name", autoComplete: "off", placeholder: "\u0418\u0432\u0430\u043D \u0418\u0432\u0430\u043D\u043E\u0432", value: form.full_name, onChange: (e) => setForm({ ...form, full_name: e.target.value }) }) }), _jsx(FormField, { label: "\u041F\u0430\u0440\u043E\u043B\u044C", children: _jsx("input", { className: "input", type: "password", name: "new-user-password", autoComplete: "new-password", placeholder: "\u043C\u0438\u043D. 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }) }) }), _jsx(FormField, { label: "\u0420\u043E\u043B\u044C", children: _jsxs("select", { className: "select", value: form.role, onChange: (e) => setForm({ ...form, role: e.target.value }), children: [_jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "admin", children: "admin" })] }) })] }), error && (_jsx("div", { style: {
                                    fontSize: 12,
                                    color: "var(--danger-fg)",
                                    marginBottom: 8,
                                }, children: error })), _jsxs("button", { type: "submit", disabled: createM.isPending || !form.email || form.password.length < 6, className: "btn btn--primary btn--sm", children: [_jsx(Icon, { name: "plus", size: 11 }), createM.isPending ? "Создаю..." : "Создать"] })] })] }), _jsxs("div", { className: "card", style: { padding: 0, overflow: "hidden" }, children: [_jsx("div", { style: {
                            padding: "10px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            display: "grid",
                            gridTemplateColumns: "60px 1fr 130px 80px 80px",
                            gap: 16,
                            alignItems: "center",
                        }, children: ["ID", "EMAIL / ФИО", "РОЛЬ", "АКТИВЕН", ""].map((h, i) => (_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)" }, children: h }, i))) }), usersQ.isLoading && (_jsx("div", { style: { padding: 20, color: "var(--ink-3)", fontSize: 13 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })), usersQ.data?.map((u) => (_jsxs("div", { style: {
                            padding: "12px 20px",
                            borderBottom: "1px solid var(--bg-line)",
                            display: "grid",
                            gridTemplateColumns: "60px 1fr 130px 80px 80px",
                            gap: 16,
                            alignItems: "center",
                            fontSize: 13,
                        }, children: [_jsx("span", { className: "mono", style: { color: "var(--ink-3)" }, children: u.id }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: u.email }), _jsx("div", { style: { fontSize: 11, color: "var(--ink-3)" }, children: u.full_name || "—" })] }), _jsxs("select", { className: "select", style: { padding: "5px 8px" }, value: u.role, onChange: (e) => patchM.mutate({ id: u.id, patch: { role: e.target.value } }), children: [_jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "admin", children: "admin" })] }), _jsx("input", { type: "checkbox", checked: u.is_active ?? true, onChange: (e) => patchM.mutate({ id: u.id, patch: { is_active: e.target.checked } }) }), _jsx("button", { type: "button", onClick: () => {
                                    if (confirm(`Удалить пользователя ${u.email}?`))
                                        deleteM.mutate(u.id);
                                }, style: {
                                    fontSize: 11,
                                    color: "var(--danger-fg)",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "right",
                                }, children: _jsx(Icon, { name: "trash", size: 12 }) })] }, u.id)))] })] }));
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
