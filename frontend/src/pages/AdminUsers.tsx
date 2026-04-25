import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../api/client";
import type { User, UserRole } from "../api/types";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Пользователи</h1>

      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Добавить пользователя</h2>
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.email || form.password.length < 6) return;
            createM.mutate(form);
          }}
        >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            Email
            <input
              className="border rounded px-3 py-2 text-sm"
              type="email"
              name="new-user-email"
              autoComplete="off"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            ФИО
            <input
              className="border rounded px-3 py-2 text-sm"
              type="text"
              name="new-user-full-name"
              autoComplete="off"
              placeholder="Иван Иванов"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            Пароль
            <input
              className="border rounded px-3 py-2 text-sm"
              type="password"
              name="new-user-password"
              autoComplete="new-password"
              placeholder="мин. 6 символов"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            Роль
            <select
              className="border rounded px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>
        {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
        <button
          type="submit"
          disabled={createM.isPending || !form.email || form.password.length < 6}
          className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded text-sm disabled:opacity-50 mt-3"
        >
          {createM.isPending ? "Создаю..." : "Создать"}
        </button>
        </form>
      </section>

      <section className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Email / ФИО</th>
              <th className="px-4 py-2">Роль</th>
              <th className="px-4 py-2">Активен</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usersQ.data?.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2 text-slate-500">{u.id}</td>
                <td className="px-4 py-2">
                  <div>{u.email}</div>
                  <div className="text-xs text-slate-500">{u.full_name || "—"}</div>
                </td>
                <td className="px-4 py-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={u.role}
                    onChange={(e) =>
                      patchM.mutate({ id: u.id, patch: { role: e.target.value as UserRole } })
                    }
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={u.is_active ?? true}
                    onChange={(e) =>
                      patchM.mutate({ id: u.id, patch: { is_active: e.target.checked } })
                    }
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Удалить пользователя ${u.email}?`)) deleteM.mutate(u.id);
                    }}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usersQ.isLoading && <div className="px-4 py-3 text-slate-500">Загрузка...</div>}
      </section>
    </div>
  );
}
