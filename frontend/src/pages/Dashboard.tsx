import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type {
  AnalyticsOverviewOut,
  RequirementsOut,
  SessionOut,
} from "../api/types";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const projectsQ = useQuery({
    queryKey: ["requirements"],
    queryFn: async () => (await api.get<RequirementsOut[]>("/api/requirements")).data,
    enabled: isAdmin,
  });
  const sessionsQ = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<SessionOut[]>("/api/sessions")).data,
    enabled: isAdmin,
  });
  const analyticsQ = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () =>
      (await api.get<AnalyticsOverviewOut>("/api/analytics/overview")).data,
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/me/assignments" replace />;

  const isEmpty =
    !projectsQ.isLoading && (projectsQ.data?.length ?? 0) === 0;
  const activeSession = sessionsQ.data?.find((s) => s.status === "active");
  const lastFinished = sessionsQ.data?.find((s) => s.status === "finished");
  const lastProject = projectsQ.data?.[0];
  const overview = analyticsQ.data;

  if (isEmpty) {
    return <OnboardingWizard />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Дашборд</h1>

      {overview && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Сессий завершено"
            value={String(overview.finished_sessions)}
            color="text-sky-700"
          />
          <KpiCard
            label="Средний score"
            value={
              overview.total_questions_answered > 0
                ? `${Math.round(overview.overall_avg_score * 100)}%`
                : "—"
            }
            color="text-emerald-700"
          />
          <KpiCard
            label="Ответов на вопросы"
            value={String(overview.total_questions_answered)}
            color="text-slate-700"
          />
        </section>
      )}

      {activeSession && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase text-amber-700 font-medium">Активная сессия</div>
            <div className="text-lg font-semibold mt-1">
              Сессия #{activeSession.id} • уровень {activeSession.selected_level}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Темы: {activeSession.selected_topics.join(", ")}
            </div>
          </div>
          <Link
            to={`/sessions/${activeSession.id}/interview`}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            Продолжить →
          </Link>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ActionCard
          title="Создать сессию"
          subtitle={lastProject ? `по «${lastProject.title}»` : "выберите проект"}
          to={
            lastProject
              ? `/requirements/${lastProject.id}/new-session`
              : "/projects"
          }
          primary
        />
        <ActionCard
          title="Загрузить новый ТЗ"
          subtitle="Markdown-файлы вашего проекта"
          to="/upload"
        />
        <ActionCard
          title="Полная аналитика"
          subtitle="Тренд, темы, слабые места"
          to="/analytics"
        />
      </section>

      {lastFinished && (
        <section className="bg-white border rounded-xl p-5">
          <div className="text-xs uppercase text-slate-400 mb-1">Последний отчёт</div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">
                Сессия #{lastFinished.id} • {lastFinished.selected_level}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(lastFinished.created_at).toLocaleString("ru-RU")}
              </div>
            </div>
            <Link
              to={`/sessions/${lastFinished.id}/report`}
              className="text-sm text-brand hover:underline whitespace-nowrap"
            >
              Открыть отчёт →
            </Link>
          </div>
        </section>
      )}
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

function ActionCard({
  title,
  subtitle,
  to,
  primary = false,
}: {
  title: string;
  subtitle: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-xl border p-5 transition-colors ${
        primary
          ? "bg-brand text-white border-brand hover:bg-brand-dark"
          : "bg-white hover:border-brand"
      }`}
    >
      <div className="font-semibold">{title}</div>
      <div className={`text-sm mt-1 ${primary ? "text-white/80" : "text-slate-500"}`}>
        {subtitle}
      </div>
    </Link>
  );
}

function OnboardingWizard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Добро пожаловать!</h1>
      <p className="text-slate-600">
        Тренировочное интервью за 3 шага. Начните с загрузки ТЗ вашего проекта.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Step
          n={1}
          title="Загрузите ТЗ"
          desc="Markdown-файлы или вставьте текст. ИИ извлечёт темы и сгенерирует банк вопросов."
          cta="Загрузить ТЗ"
          to="/upload"
          primary
        />
        <Step
          n={2}
          title="Создайте сессию"
          desc="Выберите темы и уровень. Длительность 10–15 минут."
          cta="После шага 1"
          to="/projects"
        />
        <Step
          n={3}
          title="Получите отчёт"
          desc="Голосовое Q&A + лайв-кодинг. Эталонные ответы и слабые места — в отчёте."
          cta="После шага 2"
          to="/analytics"
        />
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  cta,
  to,
  primary = false,
}: {
  n: number;
  title: string;
  desc: string;
  cta: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3 ${
          primary ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {n}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-600 mb-3 leading-relaxed">{desc}</div>
      {primary ? (
        <Link
          to={to}
          className="inline-block bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm"
        >
          {cta}
        </Link>
      ) : (
        <span className="text-xs text-slate-400">{cta}</span>
      )}
    </div>
  );
}
