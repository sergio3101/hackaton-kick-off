import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthProvider";
import { PasteBadge } from "../features/coding/CodingPanel";
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: async () =>
      (await api.get<ReportOut>(`/api/sessions/${sessionId}/report`)).data,
    enabled: Number.isFinite(sessionId),
    retry: false,
  });
  const status = (error as any)?.response?.status;

  async function downloadPdf() {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const r = await api.get(`/api/sessions/${sessionId}/report.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Сессия истекла — войдите заново"
          : status === 404
          ? "Отчёт не найден"
          : "Не удалось сформировать PDF — попробуйте ещё раз";
      setPdfError(msg);
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isLoading) return <div className="text-slate-500">Загрузка...</div>;

  if (status === 403) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Отчёт ещё не опубликован</h1>
        <p className="text-slate-600 max-w-xl">
          Спасибо, ответы записаны. Администратор просмотрит результаты и опубликует
          отчёт — после этого вы увидите его в разделе «Мои кикоффы».
        </p>
        <Link
          to="/me/assignments"
          className="inline-block bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm"
        >
          ← К моим кикоффам
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="text-slate-500">Отчёт недоступен.</div>
        <Link
          to={isAdmin ? "/sessions" : "/me/assignments"}
          className="text-sm text-brand hover:underline"
        >
          ← Назад
        </Link>
      </div>
    );
  }

  const summary = data.summary;
  const total =
    (summary?.correct ?? 0) +
    (summary?.partial ?? 0) +
    (summary?.incorrect ?? 0) +
    (summary?.skipped ?? 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: isAdmin ? "Сессии" : "Мои отчёты", to: "/sessions" },
          { label: `Сессия #${data.session.id}` },
          { label: "Отчёт" },
        ]}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Отчёт по интервью</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <Link
              to={`/requirements/${data.session.requirements_id}/new-session`}
              className="text-sm bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg"
            >
              Ещё одну сессию по этому проекту
            </Link>
          )}
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="text-sm bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {downloadingPdf ? "Готовлю PDF..." : "Скачать PDF"}
          </button>
          <Link
            to={isAdmin ? "/sessions" : "/me/assignments"}
            className="text-sm text-brand hover:underline"
          >
            ← {isAdmin ? "К сессиям" : "К моим кикоффам"}
          </Link>
        </div>
      </div>
      {pdfError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-start justify-between gap-3">
          <span>{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError(null)}
            className="text-xs text-rose-700 hover:text-rose-900 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {summary && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Итоги</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Верно" value={summary.correct} color="text-emerald-700" />
            <Stat label="Частично" value={summary.partial} color="text-amber-700" />
            <Stat label="Неверно" value={summary.incorrect} color="text-rose-700" />
            <Stat label="Пропущено" value={summary.skipped} color="text-slate-600" />
          </div>
          <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
            <span>Всего пунктов: {total}</span>
            {data.total_cost_usd !== undefined && data.total_cost_usd > 0 && (
              <span title="Стоимость OpenAI-вызовов на эту сессию">
                Стоимость сессии: ${data.total_cost_usd.toFixed(4)}
              </span>
            )}
          </div>
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
              {item.explanation && (
                <div className="mt-3 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Что упущено</div>
                  <div className="text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 whitespace-pre-wrap">
                    {item.explanation}
                  </div>
                </div>
              )}
              {item.expected_answer && (
                <div className="mt-3 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Эталонный ответ</div>
                  <div className="text-slate-800 bg-emerald-50 border border-emerald-200 rounded p-3 whitespace-pre-wrap leading-relaxed">
                    {item.expected_answer}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {item.verdict && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${VERDICT_COLOR[item.verdict]}`}
                    >
                      {VERDICT_LABEL[item.verdict]}
                    </span>
                  )}
                  {isAdmin && (item.paste_chars ?? 0) > 0 && (
                    <PasteBadge
                      pasteChars={item.paste_chars ?? 0}
                      codeLen={item.answer_text?.length ?? 0}
                    />
                  )}
                </div>
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
              {item.explanation && (
                <div className="mt-3 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Что упущено</div>
                  <div className="text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 whitespace-pre-wrap">
                    {item.explanation}
                  </div>
                </div>
              )}
              {item.expected_answer && (
                <div className="mt-3 text-sm">
                  <div className="text-slate-500 text-xs mb-1">Эталонное решение</div>
                  <pre className="bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-auto">
                    {item.expected_answer}
                  </pre>
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
