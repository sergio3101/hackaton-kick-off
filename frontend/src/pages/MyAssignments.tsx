import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { AssignmentDetailOut, SessionDetailOut } from "../api/types";
import Icon from "../components/Icon";

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

  if (listQ.isLoading) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка...
      </div>
    );
  }

  const data = listQ.data ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--accent)", marginBottom: 8 }}>
            ASSIGNMENTS · {data.length}
          </div>
          <h1 className="page-title">Мои кикоффы</h1>
          <div className="page-sub">
            Назначенные интервью и опубликованные отчёты по ним.
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--ink-3)",
          }}
        >
          Пока нет назначенных кикоффов. Подождите, пока администратор назначит вам интервью.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              starting={startingId === a.id}
              disabled={startM.isPending && startingId !== a.id}
              onStart={() => startM.mutate(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
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
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 6 }}
          >
            {a.selected_level}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              marginBottom: 6,
            }}
          >
            {a.requirements_title}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
            Темы:{" "}
            <span className="mono">{a.selected_topics.join(", ") || "—"}</span>
          </div>
          {a.note && (
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              «{a.note}»
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <StatusBadge status={a.status} />
          {a.status === "assigned" && (
            <button
              type="button"
              onClick={onStart}
              disabled={starting || disabled}
              className="btn btn--primary"
            >
              {starting ? (
                "Запускаю..."
              ) : (
                <>
                  <Icon name="play" size={13} /> Пройти интервью
                </>
              )}
            </button>
          )}
          {inProgress && a.session_id && (
            <Link
              to={`/sessions/${a.session_id}/interview`}
              className="btn btn--primary"
              style={{ background: "var(--warn)", borderColor: "var(--warn)" }}
            >
              Продолжить <Icon name="arrow-right" size={13} />
            </Link>
          )}
          {completedNotPublished && (
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
              ждём проверки администратором
            </span>
          )}
          {isPublished && a.session_id && (
            <Link
              to={`/sessions/${a.session_id}/report`}
              className="btn btn--primary"
            >
              <Icon name="doc" size={13} /> Открыть отчёт
            </Link>
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
  const variant: Record<string, string> = {
    assigned: "",
    started: "pill--warn",
    completed: "pill--info",
    published: "pill--accent",
  };
  return (
    <span className={`pill ${variant[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
