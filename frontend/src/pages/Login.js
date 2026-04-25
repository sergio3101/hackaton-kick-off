import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
export default function Login() {
    const { user, login } = useAuth();
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
            await login(email, password);
            navigate("/");
        }
        catch (e) {
            setError(e?.response?.data?.detail || "Не удалось войти");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-50", children: _jsxs("form", { onSubmit: onSubmit, className: "bg-white p-8 rounded-xl shadow w-full max-w-md space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0412\u0445\u043E\u0434" }), _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email", className: "w-full px-3 py-2 border rounded-lg" }), _jsx("input", { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u041F\u0430\u0440\u043E\u043B\u044C", className: "w-full px-3 py-2 border rounded-lg" }), error && _jsx("div", { className: "text-rose-600 text-sm", children: error }), _jsx("button", { type: "submit", disabled: busy, className: "w-full bg-brand hover:bg-brand-dark text-white py-2 rounded-lg disabled:opacity-50", children: busy ? "..." : "Войти" }), _jsxs("div", { className: "text-sm text-slate-500 text-center", children: ["\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430?", " ", _jsx(Link, { to: "/register", className: "text-brand hover:underline", children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" })] })] }) }));
}
