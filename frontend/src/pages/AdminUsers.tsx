import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { User, UserPatch, UserRole } from "../api/types";
import Icon from "../components/Icon";

interface NewUserForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

interface EditForm {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

const ROW_GRID = "60px 1fr 130px 80px 36px 36px";

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
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

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    email: "",
    full_name: "",
    password: "",
    role: "user",
    is_active: true,
  });
  const [editError, setEditError] = useState<string | null>(null);

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
    mutationFn: async (vars: { id: number; patch: UserPatch }) =>
      (await api.patch<User>(`/api/admin/users/${vars.id}`, vars.patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/api/admin/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setEditForm({
      email: u.email,
      full_name: u.full_name ?? "",
      password: "",
      role: u.role,
      is_active: u.is_active ?? true,
    });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const submitEdit = async (u: User) => {
    const patch: UserPatch = {};
    const trimmedEmail = editForm.email.trim();
    const trimmedName = editForm.full_name.trim();
    if (trimmedEmail && trimmedEmail !== u.email) patch.email = trimmedEmail;
    if (trimmedName !== (u.full_name ?? "")) patch.full_name = trimmedName;
    if (editForm.password) {
      if (editForm.password.length < 6) {
        setEditError("Пароль должен быть не короче 6 символов");
        return;
      }
      patch.password = editForm.password;
    }
    if (editForm.role !== u.role) patch.role = editForm.role;
    if (editForm.is_active !== (u.is_active ?? true)) patch.is_active = editForm.is_active;

    if (Object.keys(patch).length === 0) {
      closeEdit();
      return;
    }
    try {
      await patchM.mutateAsync({ id: u.id, patch });
      closeEdit();
    } catch (err: any) {
      setEditError(err?.response?.data?.detail ?? "Не удалось сохранить");
    }
  };

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
                color: "var(--danger-fg)",
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
            gridTemplateColumns: ROW_GRID,
            gap: 16,
            alignItems: "center",
          }}
        >
          {["ID", "EMAIL / ФИО", "РОЛЬ", "АКТИВЕН", "", ""].map((h, i) => (
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
        {usersQ.data?.map((u) => {
          const isEditing = editingId === u.id;
          const isSelf = currentUser?.id === u.id;
          return (
            <div key={u.id} style={{ borderBottom: "1px solid var(--bg-line)" }}>
              <div
                style={{
                  padding: "12px 20px",
                  display: "grid",
                  gridTemplateColumns: ROW_GRID,
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
                <span
                  className={`pill ${u.role === "admin" ? "pill--accent" : ""}`}
                >
                  {u.role}
                </span>
                <span
                  className="mono"
                  style={{
                    color: (u.is_active ?? true) ? "var(--accent)" : "var(--ink-3)",
                    fontSize: 12,
                  }}
                >
                  {(u.is_active ?? true) ? "✓ да" : "— нет"}
                </span>
                <button
                  type="button"
                  onClick={() => (isEditing ? closeEdit() : openEdit(u))}
                  title={isEditing ? "Закрыть" : "Редактировать"}
                  style={{
                    color: isEditing ? "var(--accent)" : "var(--ink-3)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    display: "inline-flex",
                  }}
                >
                  <Icon name={isEditing ? "x" : "edit"} size={14} />
                </button>
                {isSelf ? (
                  <span
                    title="Это вы — нельзя удалить самого себя"
                    style={{ color: "var(--ink-4)", fontSize: 11 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Удалить пользователя ${u.email}?`)) deleteM.mutate(u.id);
                    }}
                    title="Удалить"
                    style={{
                      color: "var(--danger-fg)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      display: "inline-flex",
                    }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
              {isEditing && (
                <div
                  style={{
                    padding: "16px 20px 18px",
                    background: "var(--bg-2)",
                    borderTop: "1px solid var(--bg-line)",
                  }}
                >
                  <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 11 }}>
                    Редактировать пользователя #{u.id}
                  </div>
                  <form
                    autoComplete="off"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitEdit(u);
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <FormField label="Email">
                        <input
                          className="input"
                          type="email"
                          name={`edit-email-${u.id}`}
                          autoComplete="off"
                          value={editForm.email}
                          onChange={(e) => {
                            setEditForm({ ...editForm, email: e.target.value });
                            if (editError) setEditError(null);
                          }}
                        />
                      </FormField>
                      <FormField label="ФИО">
                        <input
                          className="input"
                          type="text"
                          name={`edit-name-${u.id}`}
                          autoComplete="off"
                          placeholder="Иван Иванов"
                          value={editForm.full_name}
                          onChange={(e) => {
                            setEditForm({ ...editForm, full_name: e.target.value });
                            if (editError) setEditError(null);
                          }}
                        />
                      </FormField>
                      <FormField label="Новый пароль">
                        <input
                          className="input"
                          type="password"
                          name={`edit-password-${u.id}`}
                          autoComplete="new-password"
                          placeholder="оставьте пустым, чтобы не менять"
                          value={editForm.password}
                          onChange={(e) => {
                            setEditForm({ ...editForm, password: e.target.value });
                            if (editError) setEditError(null);
                          }}
                        />
                      </FormField>
                      <FormField label="Роль">
                        <select
                          className="select"
                          value={editForm.role}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "Нельзя сменить роль самому себе"
                              : ""
                          }
                          onChange={(e) => {
                            setEditForm({
                              ...editForm,
                              role: e.target.value as UserRole,
                            });
                            if (editError) setEditError(null);
                          }}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </FormField>
                      <FormField label="Активен">
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 0",
                            fontSize: 13,
                            color: "var(--ink-2)",
                            textTransform: "none",
                            letterSpacing: 0,
                          }}
                          title={
                            isSelf
                              ? "Нельзя деактивировать самого себя"
                              : ""
                          }
                        >
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            disabled={isSelf}
                            onChange={(e) => {
                              setEditForm({
                                ...editForm,
                                is_active: e.target.checked,
                              });
                              if (editError) setEditError(null);
                            }}
                          />
                          <span>
                            {editForm.is_active
                              ? "пользователь активен"
                              : "учётная запись отключена"}
                          </span>
                        </label>
                      </FormField>
                    </div>
                    {editError && (
                      <div style={{ fontSize: 12, color: "var(--danger-fg)", marginBottom: 8 }}>
                        {editError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="submit"
                        disabled={patchM.isPending}
                        className="btn btn--primary btn--sm"
                      >
                        <Icon name="check" size={11} />
                        {patchM.isPending ? "Сохраняю..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={closeEdit}
                        className="btn btn--ghost btn--sm"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
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
