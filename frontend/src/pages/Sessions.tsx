import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { SessionOut } from "../api/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  active: "В процессе",
  finished: "Завершено",
};

export default function Sessions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<SessionOut[]>("/api/sessions")).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{isAdmin ? "Сессии" : "Мои отчёты"}</h1>

      {isLoading && <div className="text-slate-500">Загрузка...</div>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="bg-white p-10 rounded-xl border text-center text-slate-500">
          {isAdmin ? (
            <>
              Пока нет ни одной сессии.{" "}
              <Link to="/upload" className="text-brand hover:underline">
                Загрузить требования и начать
              </Link>
            </>
          ) : (
            <>
              Опубликованных отчётов пока нет.{" "}
              <Link to="/me/assignments" className="text-brand hover:underline">
                Перейти к моим кикоффам
              </Link>
            </>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {data?.map((s) => (
          <Link
            key={s.id}
            to={s.status === "finished" ? `/sessions/${s.id}/report` : `/sessions/${s.id}/interview`}
            className="bg-white border rounded-xl p-4 hover:border-brand transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  Сессия #{s.id} • уровень {s.selected_level}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Темы: {s.selected_topics.join(", ") || "—"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(s.created_at).toLocaleString("ru-RU")}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  s.status === "finished"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.status === "active"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {STATUS_LABEL[s.status] || s.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
