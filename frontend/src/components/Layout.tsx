import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-brand text-lg">
            Kick-off Prep
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900"
              }
            >
              Дашборд
            </NavLink>
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900"
              }
            >
              Новый проект
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900"
              }
            >
              История
            </NavLink>
            <span className="text-slate-400 text-sm">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-slate-600 hover:text-rose-600"
            >
              Выйти
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
