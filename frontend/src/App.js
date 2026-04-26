import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Layout from "./components/Layout";
import AdminAssignments from "./pages/AdminAssignments";
import AdminSessionReview from "./pages/AdminSessionReview";
import AdminUsers from "./pages/AdminUsers";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Login from "./pages/Login";
import MyAssignments from "./pages/MyAssignments";
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
function AdminOnly({ children }) {
    const { user } = useAuth();
    if (user?.role !== "admin")
        return _jsx(Navigate, { to: "/", replace: true });
    return children;
}
function UserOnlyInterview() {
    const { user } = useAuth();
    const { id } = useParams();
    if (user?.role === "admin") {
        return _jsx(Navigate, { to: `/admin/sessions/${id}`, replace: true });
    }
    return _jsx(Interview, {});
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsxs(Route, { element: _jsx(Private, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/projects", element: _jsx(AdminOnly, { children: _jsx(Projects, {}) }) }), _jsx(Route, { path: "/upload", element: _jsx(AdminOnly, { children: _jsx(Upload, {}) }) }), _jsx(Route, { path: "/requirements/:id", element: _jsx(AdminOnly, { children: _jsx(RequirementsDetail, {}) }) }), _jsx(Route, { path: "/sessions", element: _jsx(Sessions, {}) }), _jsx(Route, { path: "/sessions/:id/interview", element: _jsx(UserOnlyInterview, {}) }), _jsx(Route, { path: "/sessions/:id/report", element: _jsx(Report, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(AdminOnly, { children: _jsx(Analytics, {}) }) }), _jsx(Route, { path: "/admin/users", element: _jsx(AdminOnly, { children: _jsx(AdminUsers, {}) }) }), _jsx(Route, { path: "/admin/assignments", element: _jsx(AdminOnly, { children: _jsx(AdminAssignments, {}) }) }), _jsx(Route, { path: "/admin/sessions/:id", element: _jsx(AdminOnly, { children: _jsx(AdminSessionReview, {}) }) }), _jsx(Route, { path: "/me/assignments", element: _jsx(MyAssignments, {}) }), _jsx(Route, { path: "/history", element: _jsx(Sessions, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
