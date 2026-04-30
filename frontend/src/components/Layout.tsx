import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import Icon, { ZebraLogo } from "./Icon";
import type { IconName } from "./Icon";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  live?: boolean;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  // Иерархия данных: Проект → Назначение → Сессия (1:n, история попыток) → Отчёт.
  // У админа в сайдбаре одна точка входа в работу с прохождениями — «Назначения»
  // (см. AdminAssignments): из неё раскрываются все попытки и отчёты по каждой.
  // Отдельной страницы «Сессии» намеренно нет.
  const adminItems: NavItem[] = [
    { to: "/", label: "Дашборд", icon: "dashboard", end: true },
  ];

  const adminAdminSection: NavItem[] = [
    { to: "/projects", label: "Проекты", icon: "kanban" },
    { to: "/admin/users", label: "Пользователи", icon: "users" },
    { to: "/admin/assignments", label: "Назначения", icon: "tag" },
    { to: "/upload", label: "Загрузить ТЗ", icon: "upload" },
  ];

  // У пользователя один раздел «Мои кикоффы»: там видно и предстоящие, и
  // завершённые с опубликованным отчётом. Отдельной страницы /sessions больше
  // нет — её роль покрывает MyAssignments.
  const userItems: NavItem[] = [
    { to: "/me/stats", label: "Статистика", icon: "chart" },
    { to: "/me/assignments", label: "Мои кикоффы", icon: "play" },
  ];

  // Раздел «Поддержка» — общий для admin и user.
  const supportItems: NavItem[] = [
    { to: "/docs", label: "Документация", icon: "doc" },
  ];

  const initials = useMemo(() => {
    const e = user?.email || "";
    const local = e.split("@")[0] || "";
    if (!local) return "U";
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }, [user]);

  const crumbs = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return ["Рабочая область", "Дашборд"];
    if (path === "/projects") return ["Администрирование", "Проекты"];
    if (path === "/upload") return ["Администрирование", "Загрузить ТЗ"];
    if (path.startsWith("/requirements/"))
      return ["Администрирование", "Проекты", "Проект"];
    if (path.startsWith("/sessions/") && path.endsWith("/interview"))
      return ["Мои кикоффы", "Сессия", "В эфире"];
    if (path.startsWith("/sessions/") && path.endsWith("/report"))
      return isAdmin
        ? ["Администрирование", "Отчёт сессии"]
        : ["Мои кикоффы", "Отчёт сессии"];
    if (path === "/admin/users") return ["Администрирование", "Пользователи"];
    if (path === "/admin/assignments") return ["Администрирование", "Назначения"];
    if (path.startsWith("/admin/sessions/"))
      return ["Администрирование", "Назначения", "Отчёт сессии"];
    if (path === "/me/assignments") return ["Рабочая область", "Мои кикоффы"];
    if (path === "/me/stats") return ["Рабочая область", "Статистика"];
    if (path === "/docs") return ["Поддержка", "Документация"];
    return ["Kick-off Prep"];
  }, [location.pathname, isAdmin]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `nav-item ${isActive ? "active" : ""}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="sidebar__brand">
          <div className="sidebar__brand-logo">
            <ZebraLogo size={26} color="var(--logo-fg)" />
          </div>
          <div>
            <div className="sidebar__brand-name">Kick-off Prep</div>
            <div className="sidebar__brand-tag">v3.0 · enterprise</div>
          </div>
        </Link>

        <div className="sidebar__section">Рабочая область</div>
        {(isAdmin ? adminItems : userItems).map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={linkCls}>
            <span className="nav-item__icon">
              <Icon name={it.icon} size={16} />
            </span>
            <span>{it.label}</span>
            {it.live && (
              <span className="dot dot--live" style={{ marginLeft: "auto" }} />
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="sidebar__section">Администрирование</div>
            {adminAdminSection.map((it) => (
              <NavLink key={it.to} to={it.to} className={linkCls}>
                <span className="nav-item__icon">
                  <Icon name={it.icon} size={16} />
                </span>
                <span>{it.label}</span>
              </NavLink>
            ))}
          </>
        )}

        <div className="sidebar__section">Поддержка</div>
        {supportItems.map((it) => (
          <NavLink key={it.to} to={it.to} className={linkCls}>
            <span className="nav-item__icon">
              <Icon name={it.icon} size={16} />
            </span>
            <span>{it.label}</span>
          </NavLink>
        ))}

        <div className="sidebar__footer">
          <div className="user-chip">
            <div className="user-chip__avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="user-chip__name"
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={user?.email}
              >
                {user?.email}
              </div>
              <div className="user-chip__role">
                {isAdmin ? "ADMIN" : "USER"}
              </div>
            </div>
            <button
              type="button"
              className="icon-btn"
              title="Выйти"
              style={{ width: 26, height: 26 }}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar__crumbs">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <span className="topbar__crumb-sep">/</span>}
                {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
              </span>
            ))}
          </div>
          <div className="topbar__actions">
            <ThemeToggle />
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
