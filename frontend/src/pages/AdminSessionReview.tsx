import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { PasteBadge } from "../features/coding/CodingPanel";
import type { ReportOut } from "../api/types";

export default function AdminSessionReview() {
  const { id } = useParams<{ id: string }>();
  const sid = Number(id);
  const qc = useQueryClient();

  const reportQ = useQuery({
    queryKey: ["admin", "session-report", sid],
    queryFn: async () => (await api.get<ReportOut>(`/api/admin/sessions/${sid}`)).data,
    enabled: !!sid,
  });

  const publishM = useMutation({
    mutationFn: async () => (await api.post(`/api/admin/sessions/${sid}/publish`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "session-report", sid] }),
  });
  const unpublishM = useMutation({
    mutationFn: async () => (await api.delete(`/api/admin/sessions/${sid}/publish`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "session-report", sid] }),
  });

  if (reportQ.isLoading) return <div className="text-slate-500">Загрузка...</div>;
  if (!reportQ.data) return <div className="text-slate-500">Сессия не найдена.</div>;

  const { session, summary, items } = reportQ.data;
  const isFinished = session.status === "finished";
  const isPublished = !!session.published_at;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/admin/assignments" className="text-sm text-slate-500 hover:underline">
            ← К назначениям
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            Сессия #{session.id} • {session.selected_level}
          </h1>
          <div className="text-sm text-slate-500 mt-1">
            Статус: {session.status} • {session.selected_topics.join(", ")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded text-sm">
              ✓ Опубликовано
            </span>
          ) : null}
          {isFinished && !isPublished && (
            <button
              type="button"
              onClick={() => publishM.mutate()}
              disabled={publishM.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {publishM.isPending ? "Публикую..." : "Опубликовать пользователю"}
            </button>
          )}
          {isPublished && (
            <button
              type="button"
              onClick={() => unpublishM.mutate()}
              disabled={unpublishM.isPending}
              className="bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              Отозвать публикацию
            </button>
          )}
        </div>
      </div>

      {summary && (
        <section className="bg-white border rounded-xl p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            <Stat label="correct" value={summary.correct} color="text-emerald-700" />
            <Stat label="partial" value={summary.partial} color="text-amber-700" />
            <Stat label="incorrect" value={summary.incorrect} color="text-rose-700" />
            <Stat label="skipped" value={summary.skipped} color="text-slate-500" />
          </div>
          {summary.overall && (
            <div className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {summary.overall}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="text-xs uppercase text-slate-500">
                [{it.type}] {it.topic} {it.verdict ? `• ${it.verdict}` : ""}
              </div>
              {it.type === "coding" && (it.paste_chars ?? 0) > 0 && (
                <PasteBadge
                  pasteChars={it.paste_chars ?? 0}
                  codeLen={it.answer_text?.length ?? 0}
                />
              )}
            </div>
            <div className="font-medium mt-1">{it.prompt_text}</div>
            {it.answer_text && (
              <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                <span className="text-slate-500">Ответ:</span> {it.answer_text}
              </div>
            )}
            {it.rationale && (
              <div className="mt-2 text-sm text-slate-600">
                <span className="text-slate-500">Обоснование:</span> {it.rationale}
              </div>
            )}
            {it.expected_answer && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-slate-500">Эталон</summary>
                <div className="mt-1 text-slate-700 whitespace-pre-wrap">{it.expected_answer}</div>
              </details>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 uppercase">{label}</div>
    </div>
  );
}
