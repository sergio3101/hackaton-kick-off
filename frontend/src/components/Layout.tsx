import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "text-brand font-medium" : "text-slate-600 hover:text-slate-900";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to={isAdmin ? "/" : "/me/assignments"}
            className="font-semibold text-brand text-lg"
          >
            Kick-off Prep
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {isAdmin && (
              <>
                <NavLink to="/" end className={linkCls}>
                  Дашборд
                </NavLink>
                <NavLink to="/projects" className={linkCls}>
                  Проекты
                </NavLink>
                <NavLink to="/admin/users" className={linkCls}>
                  Пользователи
                </NavLink>
                <NavLink to="/admin/assignments" className={linkCls}>
                  Назначения
                </NavLink>
                <NavLink to="/sessions" className={linkCls}>
                  Сессии
                </NavLink>
                <NavLink to="/analytics" className={linkCls}>
                  Аналитика
                </NavLink>
              </>
            )}

            {!isAdmin && (
              <>
                <NavLink to="/me/assignments" className={linkCls}>
                  Мои кикоффы
                </NavLink>
                <NavLink to="/sessions" className={linkCls}>
                  Мои отчёты
                </NavLink>
              </>
            )}

            <span className="text-slate-400 text-sm">
              {user?.email}
              {isAdmin ? " · admin" : ""}
            </span>
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
