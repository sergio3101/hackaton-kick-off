import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx("header", { className: "bg-white border-b border-slate-200", children: _jsxs("div", { className: "max-w-6xl mx-auto px-6 py-3 flex items-center justify-between", children: [_jsx(Link, { to: "/", className: "font-semibold text-brand text-lg", children: "Kick-off Prep" }), _jsxs("nav", { className: "flex items-center gap-6 text-sm", children: [_jsx(NavLink, { to: "/", end: true, className: ({ isActive }) => isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900", children: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434" }), _jsx(NavLink, { to: "/projects", className: ({ isActive }) => isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900", children: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B" }), _jsx(NavLink, { to: "/sessions", className: ({ isActive }) => isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900", children: "\u0421\u0435\u0441\u0441\u0438\u0438" }), _jsx(NavLink, { to: "/analytics", className: ({ isActive }) => isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900", children: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430" }), _jsx("span", { className: "text-slate-400 text-sm", children: user?.email }), _jsx("button", { type: "button", onClick: () => {
                                        logout();
                                        navigate("/login");
                                    }, className: "text-slate-600 hover:text-rose-600", children: "\u0412\u044B\u0439\u0442\u0438" })] })] }) }), _jsx("main", { className: "flex-1 max-w-6xl w-full mx-auto px-6 py-6", children: _jsx(Outlet, {}) })] }));
}
