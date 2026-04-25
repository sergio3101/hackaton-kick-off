import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { ReportOut, Verdict } from "../api/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "верно",
  partial: "частично",
  incorrect: "неверно",
  skipped: "пропущено",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  correct: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  incorrect: "bg-rose-100 text-rose-800",
  skipped: "bg-slate-200 text-slate-600",
};

export default function Report() {
  const { id } = useParams();
  const sessionId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: async () =>
      (await api.get<ReportOut>(`/api/sessions/${sessionId}/report`)).data,
    enabled: Number.isFinite(sessionId),
  });

  if (isLoading || !data) return <div className="text-slate-500">Загрузка...</div>;

  const summary = data.summary;
  const total =
    (summary?.correct ?? 0) +
    (summary?.partial ?? 0) +
    (summary?.incorrect ?? 0) +
    (summary?.skipped ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Отчёт по интервью</h1>
        <Link to="/history" className="text-sm text-brand hover:underline">
          ← К истории
        </Link>
      </div>

      {summary && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Итоги</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Верно" value={summary.correct} color="text-emerald-700" />
            <Stat label="Частично" value={summary.partial} color="text-amber-700" />
            <Stat label="Неверно" value={summary.incorrect} color="text-rose-700" />
            <Stat label="Пропущено" value={summary.skipped} color="text-slate-600" />
          </div>
          <div className="text-xs text-slate-400 mb-3">Всего пунктов: {total}</div>
          {summary.overall && (
            <div className="bg-slate-50 border rounded-lg p-4 text-slate-800 leading-relaxed whitespace-pre-wrap">
              {summary.overall}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Голосовые вопросы</h2>
        {data.items
          .filter((i) => i.type === "voice")
          .map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase text-slate-400">{item.topic}</div>
                  <div className="font-medium mt-1">{item.prompt_text}</div>
                </div>
                {item.verdict && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${VERDICT_COLOR[item.verdict]}`}
                  >
                    {VERDICT_LABEL[item.verdict]}
                  </span>
                )}
              </div>
              <div className="mt-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Ответ кандидата</div>
                <div className="text-slate-800 whitespace-pre-wrap">
                  {item.answer_text || "(пусто)"}
                </div>
              </div>
              {item.rationale && (
                <div className="mt-3 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Обоснование</div>
                  <div className="text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap">
                    {item.rationale}
                  </div>
                </div>
              )}
            </div>
          ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Лайв-кодинг</h2>
        {data.items
          .filter((i) => i.type === "coding")
          .map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase text-slate-400">Задача</div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{item.prompt_text}</div>
                </div>
                {item.verdict && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${VERDICT_COLOR[item.verdict]}`}
                  >
                    {VERDICT_LABEL[item.verdict]}
                  </span>
                )}
              </div>
              {item.answer_text && (
                <pre className="mt-3 bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-auto">
                  {item.answer_text}
                </pre>
              )}
              {item.rationale && (
                <div className="mt-3 text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap text-sm">
                  {item.rationale}
                </div>
              )}
            </div>
          ))}
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-50 border rounded-lg p-3 text-center">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
