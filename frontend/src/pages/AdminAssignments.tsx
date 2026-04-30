import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import {
  FINAL_VERDICT_LABEL_RU,
  FINAL_VERDICT_PILL,
  LLM_MODELS,
  TTS_VOICES,
  type AssignmentDetailOut,
  type AssignmentSessionInfo,
  type AssignmentStatus,
  type FinalVerdict,
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

type StatusFilter = "all" | AssignmentStatus;
type LevelFilter = "all" | Level;

// Грид-разметка таблицы назначений: ПОЛЬЗОВАТЕЛЬ | ПРОЕКТ | УРОВЕНЬ/ТЕМЫ | ПОПЫТОК.
// Поля сессии (длительность/breakdown/score/стоимость) живут в раскрытой панели.
// Клик по самой строке разворачивает/сворачивает список попыток (как на /me).
const GRID_COLUMNS =
  "minmax(170px, 1.4fr) minmax(140px, 1.1fr) minmax(160px, 1.2fr) 110px";

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
  const [showForm, setShowForm] = useState(false);
  // editingId !== null означает: форма работает в режиме редактирования. Создание
  // → POST, редактирование → PATCH. Сброс при «Свернуть форму» / успешной
  // мутации, чтобы случайно не отправить старый PATCH.
  const [editingId, setEditingId] = useState<number | null>(null);
  // Поддержка query ?new=1 (открыть форму) и ?requirements_id=N (предзаполнить
  // проект). Приходим либо с дашборда («Назначить kick-off»), либо со страницы
  // деталей проекта («Назначить пользователю»). Параметры чистим, чтобы при
  // ручном "Свернуть форму" + reload состояние не возвращалось.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const wantOpen = searchParams.get("new") === "1";
    const reqIdParam = searchParams.get("requirements_id");
    if (!wantOpen && !reqIdParam) return;
    if (wantOpen) setShowForm(true);
    if (reqIdParam) {
      const reqId = Number(reqIdParam);
      if (Number.isFinite(reqId)) {
        setForm((f) => ({ ...f, requirements_id: reqId, selected_topics: [] }));
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("requirements_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  // Множество id раскрытых assignment'ов: админу часто нужно сравнить
  // несколько кандидатов одновременно, поэтому Set, а не одиночный id.
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function downloadPdf(sessionId: number) {
    setDownloadingId(sessionId);
    try {
      const r = await api.get(`/api/sessions/${sessionId}/report.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

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
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Ошибка"),
  });

  const updateM = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Form }) =>
      (
        await api.patch<AssignmentDetailOut>(`/api/admin/assignments/${id}`, {
          requirements_id: payload.requirements_id,
          selected_topics: payload.selected_topics,
          selected_level: payload.selected_level,
          mode: payload.mode,
          target_duration_min: payload.target_duration_min,
          note: payload.note,
          // Пустая строка → бэк сбросит на null (default из конфига).
          voice: payload.voice ?? "",
          llm_model: payload.llm_model ?? "",
        })
      ).data,
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      setShowForm(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Ошибка"),
  });

  const startEdit = (a: AssignmentDetailOut) => {
    setEditingId(a.id);
    setForm({
      user_id: a.user_id,
      requirements_id: a.requirements_id,
      selected_topics: a.selected_topics,
      selected_level: a.selected_level,
      mode: a.mode,
      target_duration_min: a.target_duration_min,
      note: a.note ?? "",
      voice: (a.voice as TtsVoice | null) ?? null,
      llm_model: (a.llm_model as LlmModel | null) ?? null,
    });
    setError(null);
    setShowForm(true);
    // Скроллим к форме, чтобы пользователь сразу её увидел.
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(false);
  };

  const submitForm = () => {
    if (editingId != null) {
      updateM.mutate({ id: editingId, payload: form });
    } else {
      createM.mutate(form);
    }
  };

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

  const filtered = useMemo(() => {
    const all = assignmentsQ.data ?? [];
    const needle = search.trim().toLowerCase();
    return all.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (levelFilter !== "all" && a.selected_level !== levelFilter) return false;
      if (needle) {
        const haystack = [
          a.user_email,
          a.user_full_name,
          a.requirements_title,
          a.selected_topics.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [assignmentsQ.data, search, statusFilter, levelFilter]);

  const totalCount = assignmentsQ.data?.length ?? 0;
  const filteredCount = filtered.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8 }}
          >
            ADMIN · ASSIGNMENTS · {totalCount}
          </div>
          <h1 className="page-title">Назначения кикоффов</h1>
          <div className="page-sub">
            Назначайте интервью пользователям и контролируйте статусы выполнения.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <button
            type="button"
            className={showForm ? "btn" : "btn btn--primary"}
            onClick={() => {
              if (showForm) {
                cancelEdit();
              } else {
                setShowForm(true);
              }
            }}
          >
            <Icon name={showForm ? "x" : "plus"} size={13} />
            {showForm
              ? editingId != null
                ? "Отмена"
                : "Свернуть форму"
              : "Назначить кикофф"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card__label">
            {editingId != null
              ? `Редактирование назначения #${editingId}`
              : "Назначить кикофф"}
          </div>
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
                disabled={editingId != null}
                title={
                  editingId != null
                    ? "Нельзя сменить пользователя — создайте новое назначение"
                    : ""
                }
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
            onClick={submitForm}
            disabled={
              !canSubmit || createM.isPending || updateM.isPending
            }
            className="btn btn--primary"
          >
            <Icon name={editingId != null ? "check" : "plus"} size={13} />
            {editingId != null
              ? updateM.isPending
                ? "Сохраняю..."
                : "Сохранить"
              : createM.isPending
                ? "Создаю..."
                : "Назначить"}
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 160px 160px",
          gap: 10,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          className="input"
          placeholder="Поиск: email, ФИО, проект, темы"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          title="Фильтр по статусу"
        >
          <option value="all">все статусы</option>
          <option value="assigned">назначено</option>
          <option value="started">идёт</option>
          <option value="completed">завершено</option>
        </select>
        <select
          className="select"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
          title="Фильтр по уровню"
        >
          <option value="all">все уровни</option>
          <option value="junior">junior</option>
          <option value="middle">middle</option>
          <option value="senior">senior</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto", minWidth: 0 }}>
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--bg-line)",
            display: "grid",
            gridTemplateColumns: GRID_COLUMNS,
            gap: 10,
            alignItems: "center",
            minWidth: 760,
          }}
        >
          {[
            "ПОЛЬЗОВАТЕЛЬ",
            "ПРОЕКТ",
            "УРОВЕНЬ / ТЕМЫ",
            "ПОПЫТОК",
          ].map((h, i) => (
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
        {!assignmentsQ.isLoading && filteredCount === 0 && totalCount === 0 && (
          <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
            Назначений пока нет.
          </div>
        )}
        {!assignmentsQ.isLoading && filteredCount === 0 && totalCount > 0 && (
          <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
            Нет назначений по выбранным фильтрам.
          </div>
        )}
        {filtered.map((a) => {
          const isOpen = expandedIds.has(a.id);
          const sessions = a.sessions ?? [];
          const canExpand = sessions.length > 0;
          const bestIdx = findBestIdx(sessions);
          const stopBubble = (e: { stopPropagation: () => void }) =>
            e.stopPropagation();
          return (
            <div
              key={a.id}
              style={{ borderBottom: "1px solid var(--bg-line)" }}
            >
              <div
                onClick={canExpand ? () => toggleExpand(a.id) : undefined}
                style={{
                  padding: "12px 20px",
                  display: "grid",
                  gridTemplateColumns: GRID_COLUMNS,
                  gap: 10,
                  alignItems: "center",
                  fontSize: 13,
                  minWidth: 600,
                  cursor: canExpand ? "pointer" : "default",
                  background: isOpen ? "var(--bg-2)" : undefined,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{a.user_email}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {a.user_full_name || ""}
                    {a.user_full_name ? " · " : ""}
                    {formatDate(a.created_at)}
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
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={a.selected_topics.join(", ")}
                  >
                    {a.selected_topics.join(", ")}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {a.attempts_count ?? 0}
                  </span>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {(a.attempts_count ?? 0) === 0 && a.status === "assigned" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          stopBubble(e);
                          if (confirm("Удалить назначение?")) deleteM.mutate(a.id);
                        }}
                        className="btn btn--sm"
                        style={{
                          color: "var(--danger-fg)",
                          borderColor: "var(--danger-border)",
                        }}
                        title="Удалить назначение"
                      >
                        <Icon name="trash" size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        stopBubble(e);
                        startEdit(a);
                      }}
                      className="btn btn--sm"
                      title={
                        (a.attempts_count ?? 0) > 0
                          ? "Редактировать настройки. Изменения применятся к следующим попыткам."
                          : "Редактировать назначение"
                      }
                    >
                      <Icon name="edit" size={11} />
                    </button>
                  </span>
                </div>
              </div>

              {isOpen && canExpand && (
                <div
                  style={{
                    background: "var(--bg-2)",
                    padding: "8px 20px 14px 40px",
                  }}
                  onClick={stopBubble}
                >
                  <div
                    className="mono upper"
                    style={{ color: "var(--ink-3)", fontSize: 11, marginBottom: 6 }}
                  >
                    Попытки прохождения · {sessions.length}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sessions
                      .map((s, originalIdx) => ({ s, originalIdx }))
                      .slice()
                      .reverse()
                      .map(({ s, originalIdx }) => {
                        const prevScore =
                          originalIdx > 0
                            ? sessions[originalIdx - 1].score_pct
                            : null;
                        return (
                          <SessionAttemptRow
                            key={s.id}
                            attemptNo={originalIdx + 1}
                            s={s}
                            prevScore={prevScore}
                            isBest={originalIdx === bestIdx}
                            downloadingId={downloadingId}
                            onPdf={() => downloadPdf(s.id)}
                          />
                        );
                      })}
                  </div>
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

function SessionAttemptRow({
  attemptNo,
  s,
  prevScore,
  isBest,
  downloadingId,
  onPdf,
}: {
  attemptNo: number;
  s: AssignmentSessionInfo;
  prevScore: number | null;
  isBest: boolean;
  downloadingId: number | null;
  onPdf: () => void;
}) {
  const verdict = s.final_verdict || "";
  const hasVerdict = !!verdict;
  const verdictPill = hasVerdict
    ? `pill ${FINAL_VERDICT_PILL[verdict as FinalVerdict]}`
    : "";
  const verdictLabel = hasVerdict
    ? FINAL_VERDICT_LABEL_RU[verdict as FinalVerdict]
    : "—";

  const correct = s.correct ?? 0;
  const partial = s.partial ?? 0;
  const incorrect = s.incorrect ?? 0;
  const skipped = s.skipped ?? 0;
  const totalAnswers = correct + partial + incorrect + skipped;

  const delta =
    s.score_pct != null && prevScore != null ? s.score_pct - prevScore : null;
  const deltaText =
    delta == null
      ? ""
      : delta > 0
        ? `↑ +${delta.toFixed(0)}%`
        : delta < 0
          ? `↓ ${delta.toFixed(0)}%`
          : "= 0%";
  const deltaColor =
    delta == null
      ? "var(--ink-3)"
      : delta > 0
        ? "var(--accent)"
        : delta < 0
          ? "var(--danger-fg)"
          : "var(--ink-3)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "52px minmax(110px, 1fr) 60px minmax(140px, 1fr) 120px minmax(120px, 1fr) 80px minmax(140px, auto)",
        gap: 10,
        alignItems: "center",
        padding: "8px 10px",
        background: "var(--bg-1)",
        borderRadius: "var(--r-2)",
        fontSize: 13,
      }}
    >
      <span
        className="mono"
        style={{
          color: "var(--ink-3)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        #{attemptNo}
        {isBest && (
          <span
            title="Лучший результат"
            style={{ color: "var(--accent)", fontSize: 11 }}
          >
            ★
          </span>
        )}
      </span>
      <span className="mono" style={{ color: "var(--ink-2)", fontSize: 12 }}>
        {formatDate(s.started_at ?? s.finished_at ?? "")}
      </span>
      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>
        {formatDuration(s.duration_sec)}
      </span>
      {totalAnswers === 0 ? (
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>нет ответов</span>
      ) : (
        <span
          className="mono"
          title={`Верно ${correct} · Частично ${partial} · Неверно ${incorrect} · Пропущено ${skipped}`}
          style={{
            display: "inline-flex",
            gap: 8,
            fontVariantNumeric: "tabular-nums",
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--accent)" }}>✓{correct}</span>
          <span style={{ color: "var(--warn-fg, var(--ink-2))" }}>~{partial}</span>
          <span style={{ color: "var(--danger-fg)" }}>✗{incorrect}</span>
          <span style={{ color: "var(--ink-3)" }}>−{skipped}</span>
        </span>
      )}
      {hasVerdict ? (
        <span className={verdictPill}>{verdictLabel}</span>
      ) : (
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
      )}
      <span
        className="mono"
        style={{ display: "flex", gap: 8, fontVariantNumeric: "tabular-nums" }}
      >
        <span style={{ color: scoreColor(s.score_pct) }}>
          {formatScore(s.score_pct)}
        </span>
        {deltaText && (
          <span style={{ color: deltaColor, fontSize: 12 }}>{deltaText}</span>
        )}
      </span>
      <span className="mono" style={{ color: "var(--ink-2)", fontSize: 12 }}>
        {formatCost(s.total_cost_usd)}
      </span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <Link to={`/admin/sessions/${s.id}`} className="btn btn--sm">
          Открыть
        </Link>
        {s.status === "finished" && (
          <button
            type="button"
            onClick={onPdf}
            disabled={downloadingId === s.id}
            className="btn btn--sm"
            title="Скачать отчёт PDF"
          >
            <Icon name="doc" size={11} />
            {downloadingId === s.id ? "..." : "PDF"}
          </button>
        )}
      </div>
    </div>
  );
}

// Индекс попытки с максимальным score_pct в исходной (ASC по created_at) последовательности.
// -1 если попыток меньше двух или ни одна не имеет ненулевого score (звёздочка теряет смысл).
function findBestIdx(sessions: AssignmentSessionInfo[]): number {
  if (sessions.length < 2) return -1;
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < sessions.length; i++) {
    const sc = sessions[i].score_pct ?? 0;
    if (sc > bestScore) {
      bestScore = sc;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yy} ${hh}:${mi}`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatScore(pct: number | null | undefined): string {
  if (pct == null) return "—";
  return `${pct.toFixed(0)}%`;
}

function scoreColor(pct: number | null | undefined): string {
  if (pct == null) return "var(--ink-3)";
  if (pct >= 70) return "var(--accent)";
  if (pct >= 40) return "var(--warn-fg, var(--ink-2))";
  return "var(--danger-fg)";
}

function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  return `$${usd.toFixed(2)}`;
}
