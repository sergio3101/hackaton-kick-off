import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import {
  FINAL_VERDICT_LABEL_RU,
  FINAL_VERDICT_PILL,
  type AssignmentDetailOut,
  type AssignmentSessionInfo,
  type FinalVerdict,
} from "../api/types";
import Icon from "../components/Icon";
import { Kpi } from "../components/UI";

type FinishedRow = AssignmentSessionInfo & {
  requirements_title: string;
};

const VERDICT_RANK: FinalVerdict[] = [
  "ready",
  "almost",
  "needs_practice",
  "not_ready",
];

export default function MyStats() {
  const listQ = useQuery({
    queryKey: ["me", "assignments"],
    queryFn: async () =>
      (await api.get<AssignmentDetailOut[]>("/api/me/assignments")).data,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const data = listQ.data ?? [];

  const stats = useMemo(() => {
    const allSessions: FinishedRow[] = data.flatMap((a) =>
      (a.sessions ?? []).map((s) => ({
        ...s,
        requirements_title: a.requirements_title,
      })),
    );
    const finished = allSessions.filter((s) => s.status === "finished");
    const scores = finished
      .map((s) => s.score_pct)
      .filter((v): v is number => v != null);

    const totalAttempts = finished.length;
    const best = scores.length ? Math.max(...scores) : null;
    const avg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    const totalSec = finished.reduce(
      (acc, s) => acc + (s.duration_sec ?? 0),
      0,
    );

    let bestVerdict: "" | FinalVerdict = "";
    for (const v of VERDICT_RANK) {
      if (finished.some((s) => s.final_verdict === v)) {
        bestVerdict = v;
        break;
      }
    }

    const verdictCounts: Record<FinalVerdict, number> = {
      ready: 0,
      almost: 0,
      needs_practice: 0,
      not_ready: 0,
    };
    for (const s of finished) {
      const v = s.final_verdict;
      if (v && v in verdictCounts) {
        verdictCounts[v as FinalVerdict] += 1;
      }
    }

    const recent = [...finished]
      .sort((a, b) => {
        const ta = a.finished_at ? Date.parse(a.finished_at) : 0;
        const tb = b.finished_at ? Date.parse(b.finished_at) : 0;
        return tb - ta;
      })
      .slice(0, 10);

    return {
      totalAttempts,
      best,
      avg,
      totalSec,
      bestVerdict,
      verdictCounts,
      recent,
    };
  }, [data]);

  if (listQ.isLoading) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка...
      </div>
    );
  }

  const empty = stats.totalAttempts === 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div
            className="mono upper"
            style={{ color: "var(--accent)", marginBottom: 8 }}
          >
            STATS · ВАШ ПРОГРЕСС
          </div>
          <h1 className="page-title">Статистика</h1>
          <div className="page-sub">
            Сводка по всем вашим завершённым попыткам в тренажёре.
          </div>
        </div>
      </div>

      {empty && (
        <div
          className="card"
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--ink-3)",
            marginBottom: 18,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            Пока нет завершённых попыток. Пройдите первое интервью, чтобы появилась статистика.
          </div>
          <Link to="/me/assignments" className="btn btn--primary">
            <Icon name="play" size={13} /> К моим кикоффам
          </Link>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Kpi
          label="Попыток завершено"
          value={stats.totalAttempts}
          hint={
            stats.bestVerdict
              ? `лучший вердикт — ${FINAL_VERDICT_LABEL_RU[stats.bestVerdict]}`
              : "ещё не пройдено"
          }
        />
        <Kpi
          label="Лучший score"
          value={stats.best == null ? "—" : `${Math.round(stats.best)}%`}
          hint="личный рекорд"
        />
        <Kpi
          label="Средний score"
          value={stats.avg == null ? "—" : `${Math.round(stats.avg)}%`}
          hint={
            stats.totalAttempts > 0
              ? `по ${stats.totalAttempts} попыткам`
              : "—"
          }
        />
        <Kpi
          label="Время в тренажёре"
          value={stats.totalSec > 0 ? formatTotalDuration(stats.totalSec) : "—"}
          hint="суммарно"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <div className="card">
          <div style={{ fontWeight: 500, marginBottom: 12 }}>
            Распределение вердиктов
          </div>
          {stats.totalAttempts === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Нет данных</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VERDICT_RANK.map((v) => (
                <VerdictBar
                  key={v}
                  verdict={v}
                  count={stats.verdictCounts[v]}
                  total={stats.totalAttempts}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: "16px 20px 12px",
              borderBottom: "1px solid var(--bg-line)",
              fontWeight: 500,
            }}
          >
            История попыток
            <span
              className="mono"
              style={{ marginLeft: 10, color: "var(--ink-3)", fontSize: 12 }}
            >
              {stats.recent.length} последних
            </span>
          </div>
          {stats.recent.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Пока нет завершённых попыток
            </div>
          ) : (
            <div
              style={{
                padding: "10px 20px",
                borderBottom: "1px solid var(--bg-line)",
                display: "grid",
                gridTemplateColumns: HISTORY_GRID,
                gap: 10,
                alignItems: "center",
              }}
            >
              {["ДАТА", "ПРОЕКТ", "ВЕРДИКТ", "SCORE", ""].map((h, i) => (
                <div
                  key={i}
                  className="mono upper"
                  style={{ color: "var(--ink-3)" }}
                >
                  {h}
                </div>
              ))}
            </div>
          )}
          {stats.recent.map((s) => (
            <HistoryRow key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VerdictBar({
  verdict,
  count,
  total,
}: {
  verdict: FinalVerdict;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const fillColor =
    verdict === "ready"
      ? "var(--accent)"
      : verdict === "almost"
        ? "var(--info, var(--accent))"
        : verdict === "needs_practice"
          ? "var(--warn)"
          : "var(--danger)";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 1fr) 50px 60px",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          className={`pill ${FINAL_VERDICT_PILL[verdict]}`}
          style={{ alignSelf: "flex-start" }}
        >
          {FINAL_VERDICT_LABEL_RU[verdict]}
        </span>
        <div
          style={{
            height: 6,
            background: "var(--bg-2)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: fillColor,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
      <span
        className="mono"
        style={{
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          color: "var(--ink-2)",
        }}
      >
        {count}
      </span>
      <span
        className="mono"
        style={{
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          color: "var(--ink-3)",
          fontSize: 12,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

const HISTORY_GRID =
  "100px minmax(140px, 1.4fr) 130px 70px minmax(110px, auto)";

function HistoryRow({ s }: { s: FinishedRow }) {
  const verdict = s.final_verdict || "";
  const verdictPill = verdict
    ? `pill ${FINAL_VERDICT_PILL[verdict as FinalVerdict]}`
    : "";
  const verdictLabel = verdict
    ? FINAL_VERDICT_LABEL_RU[verdict as FinalVerdict]
    : "—";
  return (
    <Link
      to={`/sessions/${s.id}/report`}
      style={{
        padding: "12px 20px",
        display: "grid",
        gridTemplateColumns: HISTORY_GRID,
        gap: 10,
        alignItems: "center",
        borderBottom: "1px solid var(--bg-line)",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      <span className="mono" style={{ color: "var(--ink-2)", fontSize: 12 }}>
        {formatShortDate(s.finished_at ?? s.started_at)}
      </span>
      <span
        style={{
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={s.requirements_title}
      >
        {s.requirements_title || "—"}
      </span>
      {verdict ? (
        <span className={verdictPill}>{verdictLabel}</span>
      ) : (
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
      )}
      <span
        className="mono"
        style={{
          color: scoreColor(s.score_pct),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {s.score_pct == null ? "—" : `${Math.round(s.score_pct)}%`}
      </span>
      <span style={{ color: "var(--ink-3)", fontSize: 12, textAlign: "right" }}>
        Открыть →
      </span>
    </Link>
  );
}

function formatTotalDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

function scoreColor(pct: number | null | undefined): string {
  if (pct == null) return "var(--ink-3)";
  if (pct >= 70) return "var(--accent)";
  if (pct >= 40) return "var(--warn-fg, var(--ink-2))";
  return "var(--danger-fg)";
}
