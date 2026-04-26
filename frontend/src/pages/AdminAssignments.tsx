import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import {
  LLM_MODELS,
  TTS_VOICES,
  type AssignmentDetailOut,
  type Level,
  type LlmModel,
  type RequirementsDetailOut,
  type RequirementsOut,
  type TtsVoice,
  type User,
} from "../api/types";
import Icon from "../components/Icon";

interface Form {
  user_id: number | null;
  requirements_id: number | null;
  selected_topics: string[];
  selected_level: Level;
  mode: "voice" | "text";
  target_duration_min: number;
  note: string;
  // null означает «использовать дефолт сервера» — бэк подставит значения из app.config.
  voice: TtsVoice | null;
  llm_model: LlmModel | null;
}

// Подписи на русском для комбобокса голоса (озвучивает интервьюер).
// Описания — короткие маркеры тембра, чтобы admin понимал что выбрать.
// Список = голоса OpenAI Realtime API.
const VOICE_LABELS: Record<TtsVoice, string> = {
  alloy: "alloy — нейтральный",
  ash: "ash — низкий мужской",
  ballad: "ballad — мягкий мужской",
  coral: "coral — тёплый женский",
  echo: "echo — глубокий мужской",
  sage: "sage — спокойный женский",
  shimmer: "shimmer — звонкий женский",
  verse: "verse — выразительный",
  marin: "marin — живой женский",
  cedar: "cedar — собранный мужской",
};

const MODEL_LABELS: Record<LlmModel, string> = {
  "gpt-4o-mini": "gpt-4o-mini — быстро и дёшево",
  "gpt-4o": "gpt-4o — баланс качества",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1": "gpt-4.1 — максимальная точность",
};

const EMPTY_FORM: Form = {
  user_id: null,
  requirements_id: null,
  selected_topics: [],
  selected_level: "middle",
  mode: "voice",
  target_duration_min: 12,
  note: "",
  voice: null,
  llm_model: null,
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
          voice: payload.voice,
          llm_model: payload.llm_model,
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
    <div className="page">
      <div className="page-head">
        <div>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8 }}
          >
            ADMIN · ASSIGNMENTS · {assignmentsQ.data?.length ?? 0}
          </div>
          <h1 className="page-title">Назначения кикоффов</h1>
          <div className="page-sub">
            Назначайте интервью пользователям и контролируйте статусы выполнения.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__label">Назначить кикофф</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <FormField label="Пользователь">
            <select
              className="select"
              value={form.user_id ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  user_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">— выбрать —</option>
              {regularUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} {u.full_name ? `(${u.full_name})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Проект">
            <select
              className="select"
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
          </FormField>

          <FormField label="Уровень">
            <select
              className="select"
              value={form.selected_level}
              onChange={(e) =>
                setForm({ ...form, selected_level: e.target.value as Level })
              }
            >
              <option value="junior">junior</option>
              <option value="middle">middle</option>
              <option value="senior">senior</option>
            </select>
          </FormField>

          <FormField label="Режим">
            <select
              className="select"
              value={form.mode}
              onChange={(e) =>
                setForm({ ...form, mode: e.target.value as "voice" | "text" })
              }
            >
              <option value="voice">голосовой</option>
              <option value="text">текстовый</option>
            </select>
          </FormField>

          <FormField label="Голос (TTS)">
            <select
              className="select"
              value={form.voice ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  voice: e.target.value ? (e.target.value as TtsVoice) : null,
                })
              }
              disabled={form.mode === "text"}
              title={
                form.mode === "text"
                  ? "В текстовом режиме голос не используется"
                  : ""
              }
            >
              <option value="">— по умолчанию —</option>
              {TTS_VOICES.map((v) => (
                <option key={v} value={v}>
                  {VOICE_LABELS[v]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Модель LLM">
            <select
              className="select"
              value={form.llm_model ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  llm_model: e.target.value
                    ? (e.target.value as LlmModel)
                    : null,
                })
              }
            >
              <option value="">— по умолчанию —</option>
              {LLM_MODELS.map((m) => (
                <option key={m} value={m}>
                  {MODEL_LABELS[m]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {form.requirements_id != null && (
          <div style={{ marginBottom: 12 }}>
            <div
              className="mono upper"
              style={{ color: "var(--ink-3)", marginBottom: 6 }}
            >
              Темы
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableTopics.map((t) => {
                const on = form.selected_topics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className="pill"
                    style={{
                      cursor: "pointer",
                      padding: "5px 12px",
                      background: on ? "var(--accent)" : "var(--bg-2)",
                      color: on ? "var(--accent-ink)" : "var(--ink-2)",
                      borderColor: on ? "var(--accent)" : "var(--bg-line)",
                    }}
                  >
                    {on && <Icon name="check" size={11} />}
                    {t}
                  </button>
                );
              })}
              {availableTopics.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Темы загружаются...
                </span>
              )}
            </div>
          </div>
        )}

        <textarea
          className="input textarea"
          style={{ resize: "vertical", marginBottom: 12 }}
          rows={2}
          placeholder="Комментарий пользователю (опционально)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

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
          type="button"
          onClick={() => createM.mutate(form)}
          disabled={!canSubmit || createM.isPending}
          className="btn btn--primary"
        >
          <Icon name="plus" size={13} />
          {createM.isPending ? "Создаю..." : "Назначить"}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--bg-line)",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 110px 110px",
            gap: 16,
            alignItems: "center",
          }}
        >
          {["ПОЛЬЗОВАТЕЛЬ", "ПРОЕКТ", "УРОВЕНЬ / ТЕМЫ", "СТАТУС", ""].map((h, i) => (
            <div
              key={i}
              className="mono upper"
              style={{ color: "var(--ink-3)" }}
            >
              {h}
            </div>
          ))}
        </div>
        {assignmentsQ.isLoading && (
          <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
            Загрузка...
          </div>
        )}
        {!assignmentsQ.isLoading && (assignmentsQ.data?.length ?? 0) === 0 && (
          <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
            Назначений пока нет.
          </div>
        )}
        {assignmentsQ.data?.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--bg-line)",
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 110px 110px",
              gap: 16,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{a.user_email}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {a.user_full_name || ""}
              </div>
            </div>
            <div style={{ fontSize: 13 }}>{a.requirements_title}</div>
            <div>
              <div
                className="mono upper"
                style={{ color: "var(--accent)" }}
              >
                {a.selected_level}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 2,
                }}
              >
                {a.selected_topics.join(", ")}
              </div>
            </div>
            <StatusPillSmall status={a.status} />
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "flex-end",
              }}
            >
              {a.session_id ? (
                <Link
                  to={`/admin/sessions/${a.session_id}`}
                  className="btn btn--sm"
                >
                  Открыть
                </Link>
              ) : a.status === "assigned" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Удалить назначение?")) deleteM.mutate(a.id);
                  }}
                  className="btn btn--sm"
                  style={{
                    color: "var(--danger-fg)",
                    borderColor: "var(--danger-border)",
                  }}
                >
                  <Icon name="trash" size={11} />
                </button>
              ) : null}
            </div>
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

function StatusPillSmall({ status }: { status: string }) {
  const variant: Record<string, string> = {
    assigned: "",
    started: "pill--warn",
    completed: "pill--info",
    published: "pill--accent",
  };
  return <span className={`pill ${variant[status] ?? ""}`}>{status}</span>;
}
