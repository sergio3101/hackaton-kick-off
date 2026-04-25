import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { AssignmentDetailOut, SessionDetailOut } from "../api/types";

export default function MyAssignments() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const listQ = useQuery({
    queryKey: ["me", "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentDetailOut[]>("/api/me/assignments")).data,
  });

  const startM = useMutation({
    mutationFn: async (id: number) =>
      (await api.post<SessionDetailOut>(`/api/me/assignments/${id}/start`)).data,
    onSuccess: (sess) => {
      qc.invalidateQueries({ queryKey: ["me", "assignments"] });
      nav(`/sessions/${sess.id}/interview`);
    },
  });
  const startingId = startM.isPending ? (startM.variables as number) : null;

  if (listQ.isLoading) return <div className="text-slate-500">Загрузка...</div>;

  const data = listQ.data ?? [];
  if (data.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Мои кикоффы</h1>
        <p className="text-slate-500">
          Пока нет назначенных кикоффов. Подождите, пока администратор назначит вам интервью.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Мои кикоффы</h1>
      <div className="space-y-3">
        {data.map((a) => (
          <Card
            key={a.id}
            a={a}
            starting={startingId === a.id}
            disabled={startM.isPending && startingId !== a.id}
            onStart={() => startM.mutate(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  a,
  onStart,
  starting,
  disabled,
}: {
  a: AssignmentDetailOut;
  onStart: () => void;
  starting: boolean;
  disabled: boolean;
}) {
  const isPublished = a.status === "published";
  const inProgress = a.status === "started";
  const completedNotPublished = a.status === "completed";

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase text-slate-500">{a.selected_level}</div>
          <div className="text-lg font-semibold mt-1">{a.requirements_title}</div>
          <div className="text-sm text-slate-600 mt-1">
            Темы: {a.selected_topics.join(", ") || "—"}
          </div>
          {a.note && (
            <div className="text-sm text-slate-600 mt-2 italic">«{a.note}»</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={a.status} />
          {a.status === "assigned" && (
            <button
              type="button"
              onClick={onStart}
              disabled={starting || disabled}
              className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {starting ? "Запускаю..." : "Пройти интервью →"}
            </button>
          )}
          {inProgress && a.session_id && (
            <a
              href={`/sessions/${a.session_id}/interview`}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm"
            >
              Продолжить →
            </a>
          )}
          {completedNotPublished && (
            <span className="text-xs text-slate-500">
              Ждём проверки администратором
            </span>
          )}
          {isPublished && a.session_id && (
            <a
              href={`/sessions/${a.session_id}/report`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
            >
              Открыть отчёт →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    assigned: "Назначено",
    started: "В процессе",
    completed: "На проверке",
    published: "Результаты доступны",
  };
  const palette: Record<string, string> = {
    assigned: "bg-slate-100 text-slate-700",
    started: "bg-amber-100 text-amber-700",
    completed: "bg-sky-100 text-sky-700",
    published: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${palette[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
