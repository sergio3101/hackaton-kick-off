import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Icon, { ZebraLogo } from "./Icon";
export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = user?.role === "admin";
    const adminItems = [
        { to: "/", label: "Дашборд", icon: "dashboard", end: true },
        { to: "/sessions", label: "История сессий", icon: "history" },
        { to: "/analytics", label: "Аналитика", icon: "chart" },
    ];
    const adminAdminSection = [
        { to: "/projects", label: "Проекты", icon: "kanban" },
        { to: "/admin/users", label: "Пользователи", icon: "users" },
        { to: "/admin/assignments", label: "Назначения", icon: "tag" },
        { to: "/upload", label: "Загрузить ТЗ", icon: "upload" },
    ];
    const userItems = [
        { to: "/me/assignments", label: "Мои кикоффы", icon: "play" },
        { to: "/sessions", label: "Мои отчёты", icon: "doc" },
    ];
    const initials = useMemo(() => {
        const e = user?.email || "";
        const local = e.split("@")[0] || "";
        if (!local)
            return "U";
        const parts = local.split(/[._-]/);
        if (parts.length >= 2)
            return (parts[0][0] + parts[1][0]).toUpperCase();
        return local.slice(0, 2).toUpperCase();
    }, [user]);
    const crumbs = useMemo(() => {
        const path = location.pathname;
        if (path === "/")
            return ["Дашборд"];
        if (path === "/projects")
            return ["Проекты"];
        if (path === "/upload")
            return ["Загрузить ТЗ"];
        if (path.startsWith("/requirements/"))
            return ["Проекты", "Требования"];
        if (path.startsWith("/sessions/") && path.endsWith("/interview"))
            return ["Сессии", "В эфире"];
        if (path.startsWith("/sessions/") && path.endsWith("/report"))
            return ["Сессии", "Отчёт"];
        if (path === "/sessions")
            return ["История сессий"];
        if (path === "/analytics")
            return ["Аналитика"];
        if (path === "/admin/users")
            return ["Пользователи"];
        if (path === "/admin/assignments")
            return ["Назначения"];
        if (path.startsWith("/admin/sessions/"))
            return ["Сессии", "Ревью"];
        if (path === "/me/assignments")
            return ["Мои кикоффы"];
        return ["Kick-off Prep"];
    }, [location.pathname]);
    const linkCls = ({ isActive }) => `nav-item ${isActive ? "active" : ""}`;
    return (_jsxs("div", { className: "app", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs(Link, { to: "/", className: "sidebar__brand", children: [_jsx("div", { className: "sidebar__brand-logo", children: _jsx(ZebraLogo, { size: 26, color: "#0e0e0e" }) }), _jsxs("div", { children: [_jsx("div", { className: "sidebar__brand-name", children: "Kick-off Prep" }), _jsx("div", { className: "sidebar__brand-tag", children: "v3.0 \u00B7 enterprise" })] })] }), _jsx("div", { className: "sidebar__section", children: "\u0420\u0430\u0431\u043E\u0447\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C" }), (isAdmin ? adminItems : userItems).map((it) => (_jsxs(NavLink, { to: it.to, end: it.end, className: linkCls, children: [_jsx("span", { className: "nav-item__icon", children: _jsx(Icon, { name: it.icon, size: 16 }) }), _jsx("span", { children: it.label }), it.live && (_jsx("span", { className: "dot dot--live", style: { marginLeft: "auto" } }))] }, it.to))), isAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { className: "sidebar__section", children: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435" }), adminAdminSection.map((it) => (_jsxs(NavLink, { to: it.to, className: linkCls, children: [_jsx("span", { className: "nav-item__icon", children: _jsx(Icon, { name: it.icon, size: 16 }) }), _jsx("span", { children: it.label })] }, it.to)))] })), _jsx("div", { className: "sidebar__footer", children: _jsxs("div", { className: "user-chip", children: [_jsx("div", { className: "user-chip__avatar", children: initials }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { className: "user-chip__name", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: user?.email, children: user?.email }), _jsx("div", { className: "user-chip__role", children: isAdmin ? "ADMIN" : "USER" })] }), _jsx("button", { type: "button", className: "icon-btn", title: "\u0412\u044B\u0439\u0442\u0438", style: { width: 26, height: 26 }, onClick: () => {
                                        logout();
                                        navigate("/login");
                                    }, children: _jsx(Icon, { name: "logout", size: 14 }) })] }) })] }), _jsxs("div", { className: "main", children: [_jsxs("div", { className: "topbar", children: [_jsx("div", { className: "topbar__crumbs", children: crumbs.map((c, i) => (_jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [i > 0 && _jsx("span", { className: "topbar__crumb-sep", children: "/" }), i === crumbs.length - 1 ? _jsx("strong", { children: c }) : _jsx("span", { children: c })] }, i))) }), _jsx("div", { className: "topbar__actions" })] }), _jsx(Outlet, {})] })] }));
}
