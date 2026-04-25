import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { RequirementsOut, RequirementsStatsOut } from "../api/types";

export default function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
  });

  // Мини-статистика по каждому проекту: загружаем параллельно.
  const statsQueries = useQueries({
    queries: (data || []).map((r) => ({
      queryKey: ["requirements-stats", r.id],
      queryFn: async () =>
        (await api.get<RequirementsStatsOut>(`/api/requirements/${r.id}/stats`)).data,
      enabled: !!r.id,
    })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Проекты</h1>
        <Link
          to="/upload"
          className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm"
        >
          Новый проект
        </Link>
      </div>

      {isLoading && <div className="text-slate-500">Загрузка...</div>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="bg-white p-10 rounded-xl border text-center text-slate-500">
          У вас ещё нет загруженных проектов.{" "}
          <Link to="/upload" className="text-brand hover:underline">
            Загрузить .md артефакты
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {data?.map((r, idx) => {
          const stats = statsQueries[idx]?.data;
          return (
            <div key={r.id} className="bg-white p-5 rounded-xl border">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{r.title}</h3>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/requirements/${r.id}`}
                    className="border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-1.5 rounded-lg text-sm"
                  >
                    Открыть
                  </Link>
                  <Link
                    to={`/requirements/${r.id}/new-session`}
                    className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm"
                  >
                    Начать интервью
                  </Link>
                </div>
              </div>
              {stats && stats.sessions_total > 0 && (
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                  <span>{stats.sessions_total} сессий</span>
                  {stats.sessions_finished > 0 && (
                    <span>средний score {Math.round(stats.avg_score * 100)}%</span>
                  )}
                  {stats.last_session_at && (
                    <span>последняя {timeAgo(stats.last_session_at)}</span>
                  )}
                </div>
              )}
              {r.summary && (
                <p className="text-slate-700 text-sm mt-3 leading-relaxed">{r.summary}</p>
              )}
              {r.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.topics.map((t) => (
                    <span
                      key={t.name}
                      className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн назад`;
  const months = Math.floor(days / 30);
  return `${months} мес назад`;
}
