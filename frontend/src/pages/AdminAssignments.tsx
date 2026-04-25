import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type {
  AssignmentDetailOut,
  Level,
  RequirementsDetailOut,
  RequirementsOut,
  User,
} from "../api/types";

interface Form {
  user_id: number | null;
  requirements_id: number | null;
  selected_topics: string[];
  selected_level: Level;
  mode: "voice" | "text";
  target_duration_min: number;
  note: string;
}

const EMPTY_FORM: Form = {
  user_id: null,
  requirements_id: null,
  selected_topics: [],
  selected_level: "middle",
  mode: "voice",
  target_duration_min: 12,
  note: "",
};

export default function AdminAssignments() {
  const qc = useQueryClient();
  const usersQ = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<User[]>("/api/admin/users")).data,
  });
  const projectsQ = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
  });
  const assignmentsQ = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentDetailOut[]>("/api/admin/assignments")).data,
  });

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const detailQ = useQuery({
    queryKey: ["requirements", form.requirements_id, "detail"],
    queryFn: async () =>
      (await api.get<RequirementsDetailOut>(`/api/requirements/${form.requirements_id}`)).data,
    enabled: form.requirements_id != null,
  });

  const availableTopics = useMemo(
    () => detailQ.data?.topics.map((t) => t.name) ?? [],
    [detailQ.data],
  );

  const createM = useMutation({
    mutationFn: async (payload: Form) =>
      (
        await api.post<AssignmentDetailOut>("/api/admin/assignments", {
          user_id: payload.user_id,
          requirements_id: payload.requirements_id,
          selected_topics: payload.selected_topics,
          selected_level: payload.selected_level,
          mode: payload.mode,
          target_duration_min: payload.target_duration_min,
          note: payload.note,
        })
      ).data,
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Ошибка"),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/api/admin/assignments/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assignments"] }),
  });

  const toggleTopic = (t: string) =>
    setForm((f) => ({
      ...f,
      selected_topics: f.selected_topics.includes(t)
        ? f.selected_topics.filter((x) => x !== t)
        : [...f.selected_topics, t],
    }));

  const canSubmit =
    form.user_id != null &&
    form.requirements_id != null &&
    form.selected_topics.length >= 1;

  const regularUsers = usersQ.data?.filter((u) => u.role === "user") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Назначения кикоффов</h1>

      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Назначить кикофф</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            Пользователь
            <select
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={form.user_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">— выбрать —</option>
              {regularUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} {u.full_name ? `(${u.full_name})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Проект
            <select
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={form.requirements_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  requirements_id: e.target.value ? Number(e.target.value) : null,
                  selected_topics: [],
                })
              }
            >
              <option value="">— выбрать —</option>
              {projectsQ.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Уровень
            <select
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={form.selected_level}
              onChange={(e) =>
                setForm({ ...form, selected_level: e.target.value as Level })
              }
            >
              <option value="junior">junior</option>
              <option value="middle">middle</option>
              <option value="senior">senior</option>
            </select>
          </label>

          <label className="text-sm">
            Режим
            <select
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as "voice" | "text" })}
            >
              <option value="voice">голосовой</option>
              <option value="text">текстовый</option>
            </select>
          </label>
        </div>

        {form.requirements_id != null && (
          <div>
            <div className="text-sm font-medium mb-2">Темы</div>
            <div className="flex flex-wrap gap-2">
              {availableTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopic(t)}
                  className={`text-sm px-3 py-1 rounded-full border ${
                    form.selected_topics.includes(t)
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-slate-600 hover:border-brand"
                  }`}
                >
                  {t}
                </button>
              ))}
              {availableTopics.length === 0 && (
                <span className="text-sm text-slate-500">Темы загружаются...</span>
              )}
            </div>
          </div>
        )}

        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          rows={2}
          placeholder="Комментарий пользователю (опционально)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        {error && <div className="text-sm text-rose-600">{error}</div>}

        <button
          type="button"
          onClick={() => createM.mutate(form)}
          disabled={!canSubmit || createM.isPending}
          className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded text-sm disabled:opacity-50"
        >
          {createM.isPending ? "Создаю..." : "Назначить"}
        </button>
      </section>

      <section className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-4 py-2">Пользователь</th>
              <th className="px-4 py-2">Проект</th>
              <th className="px-4 py-2">Уровень / темы</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {assignmentsQ.data?.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="px-4 py-2">
                  <div>{a.user_email}</div>
                  <div className="text-xs text-slate-500">{a.user_full_name || ""}</div>
                </td>
                <td className="px-4 py-2">{a.requirements_title}</td>
                <td className="px-4 py-2">
                  <div className="text-xs uppercase text-slate-500">{a.selected_level}</div>
                  <div className="text-xs">{a.selected_topics.join(", ")}</div>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  {a.session_id ? (
                    <Link
                      to={`/admin/sessions/${a.session_id}`}
                      className="text-brand hover:underline"
                    >
                      Открыть сессию
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">сессия не начата</span>
                  )}
                  {a.status === "assigned" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Удалить назначение?")) deleteM.mutate(a.id);
                      }}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assignmentsQ.isLoading && (
          <div className="px-4 py-3 text-slate-500">Загрузка...</div>
        )}
        {!assignmentsQ.isLoading && (assignmentsQ.data?.length ?? 0) === 0 && (
          <div className="px-4 py-3 text-slate-500">Назначений пока нет.</div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    assigned: "bg-slate-100 text-slate-700",
    started: "bg-amber-100 text-amber-700",
    completed: "bg-sky-100 text-sky-700",
    published: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded ${palette[status] ?? ""}`}>
      {status}
    </span>
  );
}
