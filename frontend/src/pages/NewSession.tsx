import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { Level, RequirementsDetailOut, SessionDetailOut } from "../api/types";

const LEVELS: Level[] = ["junior", "middle", "senior"];

export default function NewSession() {
  const { id } = useParams();
  const reqId = Number(id);
  const navigate = useNavigate();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [level, setLevel] = useState<Level>("middle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", reqId],
    queryFn: async () =>
      (await api.get<RequirementsDetailOut>(`/api/requirements/${reqId}`)).data,
    enabled: Number.isFinite(reqId),
  });

  const matrix = useMemo(() => {
    const m: Record<string, Record<Level, number>> = {};
    for (const t of data?.topics ?? []) {
      m[t.name] = { junior: 0, middle: 0, senior: 0 };
    }
    for (const q of data?.bank ?? []) {
      if (!m[q.topic]) m[q.topic] = { junior: 0, middle: 0, senior: 0 };
      m[q.topic][q.level] += 1;
    }
    return m;
  }, [data]);

  function toggleTopic(name: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function onStart() {
    if (selectedTopics.size === 0) {
      setError("Выберите хотя бы одну тему");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<SessionDetailOut>("/api/sessions", {
        requirements_id: reqId,
        selected_topics: Array.from(selectedTopics),
        selected_level: level,
      });
      navigate(`/sessions/${r.data.id}/interview`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не удалось создать сессию");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !data) return <div className="text-slate-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">{data.summary}</p>
      </div>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Темы и количество сгенерированных вопросов</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.topics.map((t) => {
            const checked = selectedTopics.has(t.name);
            const stat = matrix[t.name] || { junior: 0, middle: 0, senior: 0 };
            return (
              <label
                key={t.name}
                className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${
                  checked ? "border-brand bg-indigo-50" : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() => toggleTopic(t.name)}
                />
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-slate-600">{t.description}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    junior: {stat.junior} • middle: {stat.middle} • senior: {stat.senior}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Уровень</h2>
        <div className="flex gap-3">
          {LEVELS.map((l) => (
            <label
              key={l}
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center ${
                level === l ? "border-brand bg-indigo-50" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                className="hidden"
                checked={level === l}
                onChange={() => setLevel(l)}
              />
              <span className="capitalize font-medium">{l}</span>
            </label>
          ))}
        </div>
      </section>

      {error && <div className="text-rose-600 text-sm">{error}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg disabled:opacity-50"
        >
          {busy ? "Готовим сессию..." : "Начать интервью"}
        </button>
      </div>
    </div>
  );
}
