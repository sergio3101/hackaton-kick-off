import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Icon, { ZebraLogo } from "../components/Icon";
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
    return (_jsxs("div", { className: "login-page", children: [_jsxs("div", { className: "login-side", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: {
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "var(--ink-1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }, children: _jsx(ZebraLogo, { size: 36, color: "#0e0e0e" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }, children: "Kick-off Prep" }), _jsx("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)" }, children: "v3.0 \u00B7 enterprise" })] })] }), _jsxs("div", { style: {
                            position: "relative",
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            marginTop: 32,
                        }, children: [_jsxs("div", { children: [_jsx("div", { className: "mono upper", style: { color: "var(--accent)", marginBottom: 16 }, children: "ONBOARDING \u00B7 2 \u041C\u0418\u041D\u0423\u0422\u042B \u0414\u041E \u041F\u0415\u0420\u0412\u041E\u0413\u041E KICK-OFF" }), _jsxs("h1", { style: {
                                            fontSize: 56,
                                            lineHeight: 1.05,
                                            fontWeight: 500,
                                            letterSpacing: "-0.03em",
                                            margin: "0 0 24px",
                                            maxWidth: 520,
                                        }, children: ["\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442.", _jsx("br", {}), "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 ", _jsx("span", { style: { color: "var(--accent)" }, children: "\u043F\u0435\u0440\u0432\u043E\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E" }), "."] }), _jsx("p", { style: {
                                            color: "var(--ink-2)",
                                            fontSize: 16,
                                            lineHeight: 1.55,
                                            maxWidth: 460,
                                            margin: 0,
                                        }, children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u2192 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0422\u0417 \u2192 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0431\u0430\u043D\u043A \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u2192 \u0433\u043E\u0442\u043E\u0432\u043E \u043A \u043F\u0435\u0440\u0432\u043E\u0439 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438." })] }), _jsx("div", { "aria-hidden": true, style: {
                                    position: "absolute",
                                    right: -80,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    opacity: 0.07,
                                    pointerEvents: "none",
                                }, children: _jsx(ZebraLogo, { size: 420, color: "#fff" }) })] }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--ink-3)",
                            fontSize: 12,
                        }, children: [_jsx("div", { className: "mono", children: "\u00A9 2026 KICK-OFF PREP" }), _jsxs("div", { style: { display: "flex", gap: 16 }, children: [_jsx("span", { children: "SOC2" }), _jsx("span", { children: "GDPR" }), _jsx("span", { children: "ISO 27001" })] })] })] }), _jsx("div", { className: "login-form", children: _jsxs("form", { onSubmit: onSubmit, className: "login-form__inner", children: [_jsx("div", { className: "zebra-divider", style: { marginBottom: 28, width: 80 } }), _jsx("h2", { style: {
                                fontSize: 28,
                                fontWeight: 500,
                                letterSpacing: "-0.02em",
                                margin: "0 0 8px",
                            }, children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" }), _jsx("div", { style: { color: "var(--ink-3)", marginBottom: 28, fontSize: 13 }, children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u0440\u043F\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0434\u043B\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsx("label", { style: {
                                display: "block",
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "var(--ink-3)",
                                marginBottom: 6,
                            }, children: "Email" }), _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", className: "input", style: { marginBottom: 14 } }), _jsx("label", { style: {
                                display: "block",
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "var(--ink-3)",
                                marginBottom: 6,
                            }, children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", className: "input", style: { marginBottom: 20 } }), error && (_jsx("div", { style: {
                                color: "oklch(0.78 0.16 25)",
                                fontSize: 12,
                                marginBottom: 14,
                                padding: "8px 12px",
                                background: "var(--danger-soft)",
                                borderRadius: "var(--r-2)",
                                border: "1px solid oklch(0.40 0.10 25)",
                            }, children: error })), _jsx("button", { type: "submit", disabled: busy, className: "btn btn--primary btn--lg", style: { width: "100%", justifyContent: "center" }, children: busy ? "..." : (_jsxs(_Fragment, { children: ["\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442 ", _jsx(Icon, { name: "arrow-right", size: 14 })] })) }), _jsxs("div", { style: {
                                marginTop: 18,
                                fontSize: 12,
                                color: "var(--ink-3)",
                                textAlign: "center",
                            }, children: ["\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442?", " ", _jsx(Link, { to: "/login", style: { color: "var(--accent)", textDecoration: "none" }, children: "\u0412\u043E\u0439\u0442\u0438" })] })] }) })] }));
}
