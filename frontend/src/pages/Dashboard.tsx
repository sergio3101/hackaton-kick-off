import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import type { RequirementsOut } from "../api/types";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Проекты</h1>
        <Link
          to="/upload"
          className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm"
        >
          Загрузить новый
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
        {data?.map((r) => (
          <div key={r.id} className="bg-white p-5 rounded-xl border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{r.title}</h3>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(r.created_at).toLocaleString("ru-RU")}
                </div>
              </div>
              <Link
                to={`/requirements/${r.id}/new-session`}
                className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm"
              >
                Начать интервью
              </Link>
            </div>
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
        ))}
      </div>
    </div>
  );
}
