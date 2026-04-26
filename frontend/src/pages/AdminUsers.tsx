import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../api/client";
import type { User, UserRole } from "../api/types";
import Icon from "../components/Icon";

interface NewUserForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const usersQ = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<User[]>("/api/admin/users")).data,
  });

  const [form, setForm] = useState<NewUserForm>({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState<string | null>(null);

  const createM = useMutation({
    mutationFn: async (payload: NewUserForm) =>
      (await api.post<User>("/api/admin/users", payload)).data,
    onSuccess: () => {
      setForm({ email: "", password: "", full_name: "", role: "user" });
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Ошибка"),
  });

  const patchM = useMutation({
    mutationFn: async (vars: { id: number; patch: Partial<User> & { password?: string } }) =>
      (await api.patch<User>(`/api/admin/users/${vars.id}`, vars.patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/api/admin/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 8 }}>
            ADMIN · USERS · {usersQ.data?.length ?? 0}
          </div>
          <h1 className="page-title">Пользователи</h1>
          <div className="page-sub">
            Управление учётными записями команды: роли, активация, сброс пароля.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__label">Добавить пользователя</div>
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.email || form.password.length < 6) return;
            createM.mutate(form);
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <FormField label="Email">
              <input
                className="input"
                type="email"
                name="new-user-email"
                autoComplete="off"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="ФИО">
              <input
                className="input"
                type="text"
                name="new-user-full-name"
                autoComplete="off"
                placeholder="Иван Иванов"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </FormField>
            <FormField label="Пароль">
              <input
                className="input"
                type="password"
                name="new-user-password"
                autoComplete="new-password"
                placeholder="мин. 6 символов"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </FormField>
            <FormField label="Роль">
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </FormField>
          </div>
          {error && (
            <div
              style={{
                fontSize: 12,
                color: "oklch(0.78 0.16 25)",
                marginBottom: 8,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={createM.isPending || !form.email || form.password.length < 6}
            className="btn btn--primary btn--sm"
          >
            <Icon name="plus" size={11} />
            {createM.isPending ? "Создаю..." : "Создать"}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--bg-line)",
            display: "grid",
            gridTemplateColumns: "60px 1fr 130px 80px 80px",
            gap: 16,
            alignItems: "center",
          }}
        >
          {["ID", "EMAIL / ФИО", "РОЛЬ", "АКТИВЕН", ""].map((h, i) => (
            <div
              key={i}
              className="mono upper"
              style={{ color: "var(--ink-3)" }}
            >
              {h}
            </div>
          ))}
        </div>
        {usersQ.isLoading && (
          <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
            Загрузка...
          </div>
        )}
        {usersQ.data?.map((u) => (
          <div
            key={u.id}
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--bg-line)",
              display: "grid",
              gridTemplateColumns: "60px 1fr 130px 80px 80px",
              gap: 16,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span className="mono" style={{ color: "var(--ink-3)" }}>
              {u.id}
            </span>
            <div>
              <div style={{ fontWeight: 500 }}>{u.email}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {u.full_name || "—"}
              </div>
            </div>
            <select
              className="select"
              style={{ padding: "5px 8px" }}
              value={u.role}
              onChange={(e) =>
                patchM.mutate({ id: u.id, patch: { role: e.target.value as UserRole } })
              }
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <input
              type="checkbox"
              checked={u.is_active ?? true}
              onChange={(e) =>
                patchM.mutate({ id: u.id, patch: { is_active: e.target.checked } })
              }
            />
            <button
              type="button"
              onClick={() => {
                if (confirm(`Удалить пользователя ${u.email}?`)) deleteM.mutate(u.id);
              }}
              style={{
                fontSize: 11,
                color: "oklch(0.78 0.16 25)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 11,
        color: "var(--ink-3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {label}
      {children}
    </label>
  );
}
