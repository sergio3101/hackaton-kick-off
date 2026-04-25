import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { BankQuestion, Level, RequirementsDetailOut } from "../api/types";

const LEVELS: Level[] = ["junior", "middle", "senior"];

export default function RequirementsDetail() {
  const { id } = useParams();
  const reqId = Number(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", reqId],
    queryFn: async () =>
      (await api.get<RequirementsDetailOut>(`/api/requirements/${reqId}`)).data,
    enabled: Number.isFinite(reqId),
  });

  const renameMut = useMutation({
    mutationFn: async (title: string) =>
      (await api.patch<RequirementsDetailOut>(`/api/requirements/${reqId}`, { title })).data,
    onSuccess: (d) => {
      qc.setQueryData(["requirements", reqId], d);
      qc.invalidateQueries({ queryKey: ["requirements"] });
      setEditing(false);
    },
  });

  const regenerateMut = useMutation({
    mutationFn: async () =>
      (await api.post<RequirementsDetailOut>(`/api/requirements/${reqId}/regenerate`)).data,
    onSuccess: (d) => {
      qc.setQueryData(["requirements", reqId], d);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/requirements/${reqId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      navigate("/");
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Map<Level, BankQuestion[]>>();
    for (const q of data?.bank ?? []) {
      const t = map.get(q.topic) ?? new Map<Level, BankQuestion[]>();
      const arr = t.get(q.level) ?? [];
      arr.push(q);
      t.set(q.level, arr);
      map.set(q.topic, t);
    }
    return map;
  }, [data?.bank]);

  if (isLoading || !data) return <div className="text-slate-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (titleDraft.trim()) renameMut.mutate(titleDraft.trim());
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-lg font-semibold flex-1"
                maxLength={255}
              />
              <button
                type="submit"
                disabled={renameMut.isPending}
                className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="border border-slate-300 px-3 py-1.5 rounded-lg text-sm"
              >
                Отмена
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold truncate">{data.title}</h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(data.title);
                  setEditing(true);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                переименовать
              </button>
            </div>
          )}
          <div className="text-xs text-slate-400 mt-1">
            Создан {new Date(data.created_at).toLocaleString("ru-RU")}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/requirements/${reqId}/new-session`}
            className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm"
          >
            Начать интервью
          </Link>
          <button
            type="button"
            onClick={() => {
              if (confirm("Перегенерировать банк вопросов? Существующие будут заменены.")) {
                regenerateMut.mutate();
              }
            }}
            disabled={regenerateMut.isPending}
            className="border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
          >
            {regenerateMut.isPending ? "Генерирую..." : "Перегенерировать банк"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Удалить проект безвозвратно? Все связанные сессии и отчёты тоже будут удалены.",
                )
              ) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
            className="border border-rose-300 text-rose-700 hover:border-rose-500 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
          >
            Удалить
          </button>
        </div>
      </div>

      {regenerateMut.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Не удалось перегенерировать банк. Попробуйте ещё раз.
        </div>
      )}

      {data.summary && (
        <section className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-2">Описание проекта</h2>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
            {data.summary}
          </p>
        </section>
      )}

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Темы ({data.topics.length})</h2>
        {data.topics.length === 0 ? (
          <div className="text-sm text-slate-500">Темы не извлечены.</div>
        ) : (
          <ul className="space-y-2">
            {data.topics.map((t) => (
              <li key={t.name} className="border rounded-lg p-3">
                <div className="font-medium text-sm">{t.name}</div>
                {t.description && (
                  <div className="text-xs text-slate-600 mt-1">{t.description}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Банк вопросов ({data.bank.length})</h2>
          <div className="text-xs text-slate-500">
            ожидается ~{data.topics.length * 3 * 5} (5 на пару тема × уровень)
          </div>
        </div>

        {data.topics.length === 0 ? (
          <div className="text-sm text-slate-500">Сначала загрузите темы.</div>
        ) : (
          <div className="space-y-4">
            {data.topics.map((t) => {
              const byLevel = grouped.get(t.name);
              return (
                <details key={t.name} className="border rounded-lg" open>
                  <summary className="cursor-pointer px-3 py-2 font-medium text-sm flex items-center gap-2">
                    <span>{t.name}</span>
                    <span className="text-xs text-slate-400">
                      ({LEVELS.reduce((acc, lvl) => acc + (byLevel?.get(lvl)?.length ?? 0), 0)} вопр.)
                    </span>
                  </summary>
                  <div className="px-3 pb-3 space-y-3">
                    {LEVELS.map((lvl) => {
                      const items = byLevel?.get(lvl) ?? [];
                      return (
                        <div key={lvl}>
                          <div className="text-xs uppercase text-slate-500 mb-1 flex items-center gap-2">
                            <span>{lvl}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                items.length >= 5
                                  ? "bg-emerald-100 text-emerald-800"
                                  : items.length > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {items.length}/5
                            </span>
                          </div>
                          {items.length === 0 ? (
                            <div className="text-xs text-slate-400">— нет вопросов —</div>
                          ) : (
                            <ol className="text-sm text-slate-700 list-decimal list-inside space-y-1">
                              {items.map((q) => (
                                <li key={q.id} className="leading-relaxed">{q.prompt}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
