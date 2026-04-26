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

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-slate-500">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function UserOnlyInterview() {
  const { user } = useAuth();
  const { id } = useParams();
  if (user?.role === "admin") {
    return <Navigate to={`/admin/sessions/${id}`} replace />;
  }
  return <Interview />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/projects"
          element={
            <AdminOnly>
              <Projects />
            </AdminOnly>
          }
        />
        <Route
          path="/upload"
          element={
            <AdminOnly>
              <Upload />
            </AdminOnly>
          }
        />
        <Route
          path="/requirements/:id"
          element={
            <AdminOnly>
              <RequirementsDetail />
            </AdminOnly>
          }
        />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id/interview" element={<UserOnlyInterview />} />
        <Route path="/sessions/:id/report" element={<Report />} />
        <Route
          path="/analytics"
          element={
            <AdminOnly>
              <Analytics />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminOnly>
              <AdminUsers />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/assignments"
          element={
            <AdminOnly>
              <AdminAssignments />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/sessions/:id"
          element={
            <AdminOnly>
              <AdminSessionReview />
            </AdminOnly>
          }
        />
        <Route path="/me/assignments" element={<MyAssignments />} />
        {/* Legacy redirect-friendly aliases */}
        <Route path="/history" element={<Sessions />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
