import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Layout from "./components/Layout";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Login from "./pages/Login";
import NewSession from "./pages/NewSession";
import Projects from "./pages/Projects";
import Register from "./pages/Register";
import Report from "./pages/Report";
import RequirementsDetail from "./pages/RequirementsDetail";
import Sessions from "./pages/Sessions";
import Upload from "./pages/Upload";
function Private({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { className: "p-6 text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsxs(Route, { element: _jsx(Private, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/projects", element: _jsx(Projects, {}) }), _jsx(Route, { path: "/upload", element: _jsx(Upload, {}) }), _jsx(Route, { path: "/requirements/:id", element: _jsx(RequirementsDetail, {}) }), _jsx(Route, { path: "/requirements/:id/new-session", element: _jsx(NewSession, {}) }), _jsx(Route, { path: "/sessions", element: _jsx(Sessions, {}) }), _jsx(Route, { path: "/sessions/:id/interview", element: _jsx(Interview, {}) }), _jsx(Route, { path: "/sessions/:id/report", element: _jsx(Report, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(Analytics, {}) }), _jsx(Route, { path: "/history", element: _jsx(Sessions, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
