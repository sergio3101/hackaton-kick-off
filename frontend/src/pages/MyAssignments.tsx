import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import {
  FINAL_VERDICT_LABEL_RU,
  FINAL_VERDICT_PILL,
  type AssignmentDetailOut,
  type AssignmentSessionInfo,
  type FinalVerdict,
  type SessionDetailOut,
} from "../api/types";
import Icon from "../components/Icon";

type SyntheticEvent = { stopPropagation: () => void };

export default function MyAssignments() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const listQ = useQuery({
    queryKey: ["me", "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentDetailOut[]>("/api/me/assignments")).data,
    // Глобально queryClient держит данные «свежими» 30 секунд и не рефетчит
    // при focus — иначе только что назначенный админом кикофф не появится у
    // пользователя без F5. Эта страница — основная точка входа после логина,
    // здесь надёжнее всегда фетчить заново.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const [startError, setStartError] = useState<string | null>(null);
  const startM = useMutation({
    mutationFn: async (id: number) =>
      (await api.post<SessionDetailOut>(`/api/me/assignments/${id}/start`)).data,
    onSuccess: (sess) => {
      setStartError(null);
      qc.invalidateQueries({ queryKey: ["me", "assignments"] });
      nav(`/sessions/${sess.id}/interview`);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      setStartError(
        typeof detail === "string"
          ? detail
          : "Не удалось запустить интервью. Попробуйте ещё раз.",
      );
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
          <div
            className="mono upper"
            style={{ color: "var(--accent)", marginBottom: 8 }}
          >
            ASSIGNMENTS · {data.length}
          </div>
          <h1 className="page-title">Мои кикоффы</h1>
          <div className="page-sub">
            Назначенные интервью и история ваших попыток.
          </div>
        </div>
      </div>

      {startError && (
        <div
          className="state-block state-block--danger"
          style={{ marginBottom: 14, fontSize: 13 }}
        >
          <span>{startError}</span>
          <button
            type="button"
            onClick={() => setStartError(null)}
            className="state-block__close"
          >
            Закрыть
          </button>
        </div>
      )}

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
  const [expanded, setExpanded] = useState(false);

  const sessions = a.sessions ?? [];
  const lastSession =
    sessions.length > 0 ? sessions[sessions.length - 1] : a.session ?? null;
  const lastSessionId = a.last_session_id ?? a.session_id ?? lastSession?.id ?? null;
  const lastStatus = lastSession?.status;
  const inProgress = lastStatus === "active" || lastStatus === "draft";
  const canExpand = sessions.length > 0;
  const bestIdx = findBestIdx(sessions);

  // Stop-propagation для кликов по интерактивным элементам внутри карточки —
  // иначе клик по кнопке/ссылке ещё и развернёт/свернёт список попыток.
  const stopBubble = (e: SyntheticEvent) => e.stopPropagation();

  const handleCardClick = () => {
    if (canExpand) setExpanded((v) => !v);
  };

  return (
    <div
      className="card"
      onClick={handleCardClick}
      style={{ cursor: canExpand ? "pointer" : "default" }}
    >
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
            {canExpand && (
              <span style={{ marginLeft: 10, fontSize: 10 }}>
                {expanded ? "▴" : "▾"} Попыток: {a.attempts_count}
              </span>
            )}
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
          onClick={stopBubble}
        >
          {inProgress && lastSessionId ? (
            <Link
              to={`/sessions/${lastSessionId}/interview`}
              className="btn btn--primary"
              style={{ background: "var(--warn)", borderColor: "var(--warn)" }}
              onClick={stopBubble}
            >
              Продолжить <Icon name="arrow-right" size={13} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                stopBubble(e);
                onStart();
              }}
              disabled={starting || disabled}
              className="btn btn--primary"
            >
              {starting ? (
                "Запускаю..."
              ) : (
                <>
                  <Icon name="play" size={13} /> Старт интервью
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && canExpand && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--bg-line)",
          }}
          onClick={stopBubble}
        >
          <div
            className="mono upper"
            style={{ color: "var(--ink-3)", marginBottom: 8, fontSize: 11 }}
          >
            Попытки прохождения · {sessions.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions
              .map((s, originalIdx) => ({ s, originalIdx }))
              .slice()
              .reverse()
              .map(({ s, originalIdx }) => {
                // attemptNo и dprev считаются по исходной хронологии (ASC),
                // чтобы #1 всегда означало первую попытку, а дельта сравнивалась
                // с предыдущей по времени, а не с предыдущей в списке.
                const prevScore =
                  originalIdx > 0 ? sessions[originalIdx - 1].score_pct : null;
                return (
                  <SessionRow
                    key={s.id}
                    attemptNo={originalIdx + 1}
                    s={s}
                    prevScore={prevScore}
                    isBest={originalIdx === bestIdx}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// Индекс попытки с максимальным score_pct. Возвращает -1, если ни одна попытка
// не содержит ненулевого score (тогда бейдж «Лучший» не имеет смысла) или
// если попытка всего одна (нечего сравнивать).
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

function SessionRow({
  attemptNo,
  s,
  prevScore,
  isBest,
}: {
  attemptNo: number;
  s: AssignmentSessionInfo;
  prevScore: number | null;
  isBest: boolean;
}) {
  const verdict = s.final_verdict || "";
  const hasVerdict = !!verdict;
  const verdictPill = hasVerdict
    ? `pill ${FINAL_VERDICT_PILL[verdict as FinalVerdict]}`
    : "";
  const verdictLabel = hasVerdict
    ? FINAL_VERDICT_LABEL_RU[verdict as FinalVerdict]
    : "—";

  // Дельта score между этой и предыдущей попыткой. Считаем только если
  // оба значения определены — иначе пользователь не должен видеть «↓ —100%».
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

  const correct = s.correct ?? 0;
  const partial = s.partial ?? 0;
  const incorrect = s.incorrect ?? 0;
  const skipped = s.skipped ?? 0;
  const totalAnswers = correct + partial + incorrect + skipped;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "48px minmax(110px, 0.9fr) 60px minmax(150px, 1fr) 120px minmax(130px, 1fr) minmax(150px, auto)",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        background: "var(--bg-2)",
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
        {formatDate(s.started_at ?? s.finished_at)}
      </span>
      <span
        className="mono"
        style={{ color: "var(--ink-3)", fontSize: 12 }}
        title="Длительность"
      >
        {formatDuration(s.duration_sec)}
      </span>
      <Breakdown
        correct={correct}
        partial={partial}
        incorrect={incorrect}
        skipped={skipped}
        empty={totalAnswers === 0}
      />
      {hasVerdict ? (
        <span className={verdictPill}>{verdictLabel}</span>
      ) : (
        <span
          className="mono"
          style={{ color: "var(--ink-3)", fontSize: 12 }}
        >
          —
        </span>
      )}
      <span
        className="mono"
        style={{ fontVariantNumeric: "tabular-nums", display: "flex", gap: 8 }}
      >
        <span style={{ color: scoreColor(s.score_pct) }}>
          {formatScore(s.score_pct)}
        </span>
        {deltaText && (
          <span style={{ color: deltaColor, fontSize: 12 }}>{deltaText}</span>
        )}
      </span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        {s.status === "finished" ? (
          <Link to={`/sessions/${s.id}/report`} className="btn btn--sm">
            <Icon name="doc" size={11} /> Открыть отчёт
          </Link>
        ) : (
          <Link
            to={`/sessions/${s.id}/interview`}
            className="btn btn--sm btn--primary"
          >
            Продолжить
          </Link>
        )}
      </div>
    </div>
  );
}

function Breakdown({
  correct,
  partial,
  incorrect,
  skipped,
  empty,
}: {
  correct: number;
  partial: number;
  incorrect: number;
  skipped: number;
  empty: boolean;
}) {
  if (empty) {
    return (
      <span style={{ color: "var(--ink-3)", fontSize: 12 }}>нет ответов</span>
    );
  }
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        gap: 8,
        fontVariantNumeric: "tabular-nums",
        fontSize: 12,
      }}
      title={`Верно ${correct} · Частично ${partial} · Неверно ${incorrect} · Пропущено ${skipped}`}
    >
      <span style={{ color: "var(--accent)" }}>✓{correct}</span>
      <span style={{ color: "var(--warn-fg, var(--ink-2))" }}>~{partial}</span>
      <span style={{ color: "var(--danger-fg)" }}>✗{incorrect}</span>
      <span style={{ color: "var(--ink-3)" }}>−{skipped}</span>
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
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
