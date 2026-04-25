import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    if (user)
        return _jsx(Navigate, { to: "/", replace: true });
    async function onSubmit(e) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await register(email, password);
            navigate("/");
        }
        catch (e) {
            setError(e?.response?.data?.detail || "Не удалось зарегистрироваться");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-50", children: _jsxs("form", { onSubmit: onSubmit, className: "bg-white p-8 rounded-xl shadow w-full max-w-md space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" }), _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email", className: "w-full px-3 py-2 border rounded-lg" }), _jsx("input", { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u041F\u0430\u0440\u043E\u043B\u044C (\u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)", className: "w-full px-3 py-2 border rounded-lg" }), error && _jsx("div", { className: "text-rose-600 text-sm", children: error }), _jsx("button", { type: "submit", disabled: busy, className: "w-full bg-brand hover:bg-brand-dark text-white py-2 rounded-lg disabled:opacity-50", children: busy ? "..." : "Зарегистрироваться" }), _jsxs("div", { className: "text-sm text-slate-500 text-center", children: ["\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442?", " ", _jsx(Link, { to: "/login", className: "text-brand hover:underline", children: "\u0412\u043E\u0439\u0442\u0438" })] })] }) }));
}
