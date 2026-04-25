import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";
import type { AnalyticsOverviewOut, TopicStat, TrendPoint } from "../api/types";

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () =>
      (await api.get<AnalyticsOverviewOut>("/api/analytics/overview")).data,
  });

  if (isLoading || !data) return <div className="text-slate-500">Загрузка аналитики...</div>;

  const empty = data.total_questions_answered === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Аналитика</h1>
        <div className="text-sm text-slate-500">
          Сессий: {data.total_sessions} • Завершено: {data.finished_sessions} • Ответов:{" "}
          {data.total_questions_answered}
        </div>
      </div>

      {empty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Пока нет данных для анализа — пройдите хотя бы одно интервью, чтобы увидеть
          статистику по темам и тренд.
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Средний score"
          value={`${(data.overall_avg_score * 100).toFixed(0)}%`}
          color="text-emerald-700"
        />
        <KpiCard
          label="Сессий завершено"
          value={String(data.finished_sessions)}
          color="text-sky-700"
        />
        <KpiCard
          label="Ответов на вопросы"
          value={String(data.total_questions_answered)}
          color="text-slate-700"
        />
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Score по темам</h2>
        {data.by_topic.length === 0 ? (
          <div className="text-sm text-slate-400">Нет данных</div>
        ) : (
          <TopicBars topics={data.by_topic} />
        )}
      </section>

      {data.weak_topics.length > 0 && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Слабые места — что подтянуть</h2>
          <TopicBars topics={data.weak_topics} variant="weak" />
        </section>
      )}

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Активность за 30 дней</h2>
        <TrendChart trend={data.trend_30d} />
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Сессии по уровням</h2>
        <div className="flex flex-wrap gap-3">
          {data.by_level.map((b) => (
            <div
              key={b.level}
              className="px-3 py-2 rounded-lg border bg-slate-50 text-sm"
            >
              <span className="text-slate-500">{b.level}</span>:{" "}
              <strong>{b.sessions}</strong>
            </div>
          ))}
          {data.by_level.length === 0 && (
            <div className="text-sm text-slate-400">Нет сессий</div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TopicBars({ topics, variant = "default" }: { topics: TopicStat[]; variant?: "default" | "weak" }) {
  return (
    <div className="space-y-2">
      {topics.map((t) => {
        const pct = Math.round(t.avg_score * 100);
        const color =
          variant === "weak"
            ? "bg-rose-500"
            : pct >= 70
            ? "bg-emerald-500"
            : pct >= 40
            ? "bg-amber-500"
            : "bg-rose-500";
        return (
          <div key={t.topic} className="flex items-center gap-3 text-sm">
            <div className="w-40 text-slate-700 truncate" title={t.topic}>
              {t.topic}
            </div>
            <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
              <div
                className={`h-full ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-20 text-right text-slate-600 tabular-nums">
              {pct}% · {t.answered}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = Math.max(1, ...trend.map((p) => p.sessions));
  const totalSessions = trend.reduce((acc, p) => acc + p.sessions, 0);
  if (totalSessions === 0) {
    return <div className="text-sm text-slate-400">Нет активности за последние 30 дней</div>;
  }
  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {trend.map((p) => {
          const h = (p.sessions / max) * 100;
          const score = p.avg_score;
          const color =
            p.sessions === 0
              ? "bg-slate-100"
              : score >= 0.7
              ? "bg-emerald-500"
              : score >= 0.4
              ? "bg-amber-500"
              : "bg-rose-500";
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col justify-end"
              title={`${p.date}: ${p.sessions} сессий, score ${(score * 100).toFixed(0)}%`}
            >
              <div
                className={`${color} rounded-sm transition-all`}
                style={{ height: `${h}%`, minHeight: p.sessions > 0 ? "4px" : "1px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        <span>{trend[0]?.date}</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  );
}
