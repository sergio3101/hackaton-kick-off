import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthProvider";
import type { ReportOut, RequirementsOut, SessionDetailOut } from "../api/types";
import CodingPanel from "../features/coding/CodingPanel";
import VoicePanel from "../features/voice/VoicePanel";

export default function Interview() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams] = useSearchParams();
  const continuousFromUrl = searchParams.get("continuous") === "1";
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [localStartedAt, setLocalStartedAt] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () =>
      (await api.get<SessionDetailOut>(`/api/sessions/${sessionId}`)).data,
    enabled: Number.isFinite(sessionId),
  });

  const reqQ = useQuery({
    queryKey: ["requirements", data?.requirements_id],
    queryFn: async () =>
      (await api.get<RequirementsOut>(`/api/requirements/${data!.requirements_id}`)).data,
    enabled: !!data?.requirements_id,
  });

  // Подхватываем started_at у уже активной сессии — для корректного таймера,
  // но НЕ автостартуем VoicePanel: пользователь сам жмёт «Продолжить».
  useEffect(() => {
    if (!data) return;
    if (data.started_at && localStartedAt === null) {
      setLocalStartedAt(new Date(data.started_at).getTime());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.started_at]);

  async function onFinish() {
    if (!confirm("Завершить интервью и сформировать отчёт?")) return;
    setFinishing(true);
    setFinishError(null);
    try {
      await api.post<ReportOut>(`/api/sessions/${sessionId}/finish`);
      if (isAdmin) {
        navigate(`/sessions/${sessionId}/report`);
      } else {
        // Юзер видит отчёт только после публикации администратором —
        // поэтому возвращаем его в список назначений с понятным статусом.
        navigate("/me/assignments");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const msg =
        status === 401
          ? "Сессия истекла — войдите заново и повторите."
          : detail || "Не удалось завершить интервью. Попробуйте ещё раз.";
      setFinishError(msg);
    } finally {
      setFinishing(false);
    }
  }

  if (isLoading || !data) return <div className="text-slate-500">Загрузка сессии...</div>;

  const totalVoice = data.items.filter((i) => i.type === "voice").length;
  const continuous = continuousFromUrl && data.mode === "voice";
  const isTextMode = data.mode === "text";

  return (
    <div className="space-y-4 h-[calc(100vh-110px)] flex flex-col">
      <Breadcrumbs
        items={
          isAdmin
            ? [
                { label: "Проекты", to: "/projects" },
                ...(reqQ.data
                  ? [{ label: reqQ.data.title, to: `/requirements/${data.requirements_id}` }]
                  : []),
                { label: `Сессия #${data.id}` },
              ]
            : [
                { label: "Мои кикоффы", to: "/me/assignments" },
                ...(reqQ.data ? [{ label: reqQ.data.title }] : []),
                { label: `Сессия #${data.id}` },
              ]
        }
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Интервью — уровень {data.selected_level}{" "}
            <span className="text-sm font-normal text-slate-500">
              · {isTextMode ? "текст" : "голос"}
              {continuous && " · непрерывный"}
            </span>
          </h1>
          <div className="text-sm text-slate-500">
            Темы: {data.selected_topics.join(", ")}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer
            startedAtIso={data.started_at}
            localStartedAtMs={localStartedAt}
            targetMin={data.target_duration_min ?? 12}
            running={started && data.status !== "finished"}
          />
          {!started && (
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                setLocalStartedAt(Date.now());
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Начать интервью
            </button>
          )}
          <button
            type="button"
            onClick={onFinish}
            disabled={finishing}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {finishing ? "Формирую отчёт..." : "Завершить досрочно"}
          </button>
        </div>
      </div>

      {finishError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-start justify-between gap-3">
          <span>{finishError}</span>
          <button
            type="button"
            onClick={() => setFinishError(null)}
            className="text-xs text-rose-700 hover:text-rose-900 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {started ? (
          <VoicePanel
            sessionId={sessionId}
            totalVoice={totalVoice}
            continuous={continuous}
            textMode={isTextMode}
          />
        ) : (
          <VoiceStartStub
            totalVoice={totalVoice}
            durationMin={data.target_duration_min ?? 12}
            isResume={data.status === "active"}
            isTextMode={isTextMode}
            onStart={() => {
              setStarted(true);
              if (localStartedAt === null) setLocalStartedAt(Date.now());
            }}
          />
        )}
        <CodingPanel session={data} />
      </div>
    </div>
  );
}

function SessionTimer({
  startedAtIso,
  localStartedAtMs,
  targetMin,
  running,
}: {
  startedAtIso: string | null;
  localStartedAtMs: number | null;
  targetMin: number;
  running: boolean;
}) {
  const startMs = useMemo(() => {
    if (startedAtIso) return new Date(startedAtIso).getTime();
    return localStartedAtMs;
  }, [startedAtIso, localStartedAtMs]);

  const totalSec = targetMin * 60;
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!running || startMs === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, startMs]);

  if (startMs === null) {
    return (
      <span className="text-sm text-slate-400 tabular-nums">
        --:-- / {targetMin}:00
      </span>
    );
  }

  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const mm = Math.floor(remainingSec / 60).toString().padStart(2, "0");
  const ss = (remainingSec % 60).toString().padStart(2, "0");

  let cls = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (remainingSec === 0) cls = "text-rose-700 bg-rose-50 border-rose-200";
  else if (remainingSec <= 120) cls = "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <span
      className={`text-sm tabular-nums px-3 py-1.5 rounded-lg border font-medium ${cls}`}
      title={`Сессия: ${targetMin} мин`}
    >
      ⏱ {mm}:{ss}
    </span>
  );
}

function VoiceStartStub({
  totalVoice,
  durationMin,
  isResume,
  isTextMode,
  onStart,
}: {
  totalVoice: number;
  durationMin: number;
  isResume: boolean;
  isTextMode: boolean;
  onStart: () => void;
}) {
  const title = isResume
    ? isTextMode
      ? "Продолжить текстовое интервью"
      : "Продолжить голосовое интервью"
    : isTextMode
    ? "Текстовое интервью готово"
    : "Голосовое интервью готово";

  const description = isResume
    ? `Сессия уже начата. Останется ответить на оставшиеся вопросы (всего до ${totalVoice}).`
    : isTextMode
    ? `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами.
       Отвечайте текстом — голос отключён. Таймер пойдёт сразу после старта.`
    : `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами.
       Можно ознакомиться с кодинг-задачей справа, а когда будете готовы — нажмите кнопку. Таймер пойдёт сразу.`;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white border rounded-lg p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
        {isTextMode ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8"
            aria-hidden
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-5 4V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h8v-2H6z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8"
            aria-hidden
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
          </svg>
        )}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-xs whitespace-pre-line">{description}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
      >
        {isResume ? "Продолжить →" : "Начать интервью"}
      </button>
    </div>
  );
}
