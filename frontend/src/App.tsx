import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Interview from "./pages/Interview";
import Login from "./pages/Login";
import NewSession from "./pages/NewSession";
import Register from "./pages/Register";
import Report from "./pages/Report";
import RequirementsDetail from "./pages/RequirementsDetail";
import Upload from "./pages/Upload";

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-slate-500">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
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
        <Route path="/upload" element={<Upload />} />
        <Route path="/requirements/:id" element={<RequirementsDetail />} />
        <Route path="/requirements/:id/new-session" element={<NewSession />} />
        <Route path="/sessions/:id/interview" element={<Interview />} />
        <Route path="/sessions/:id/report" element={<Report />} />
        <Route path="/history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
