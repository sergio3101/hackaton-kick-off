import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { ReportOut, SessionDetailOut } from "../api/types";
import CodingPanel from "../features/coding/CodingPanel";
import VoicePanel from "../features/voice/VoicePanel";

export default function Interview() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);
  const [started, setStarted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () =>
      (await api.get<SessionDetailOut>(`/api/sessions/${sessionId}`)).data,
    enabled: Number.isFinite(sessionId),
  });

  async function onFinish() {
    if (!confirm("Завершить интервью и сформировать отчёт?")) return;
    setFinishing(true);
    try {
      const r = await api.post<ReportOut>(`/api/sessions/${sessionId}/finish`);
      navigate(`/sessions/${r.data.session.id}/report`);
    } finally {
      setFinishing(false);
    }
  }

  if (isLoading || !data) return <div className="text-slate-500">Загрузка сессии...</div>;

  const totalVoice = data.items.filter((i) => i.type === "voice").length;

  return (
    <div className="space-y-4 h-[calc(100vh-110px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Интервью — уровень {data.selected_level}
          </h1>
          <div className="text-sm text-slate-500">
            Темы: {data.selected_topics.join(", ")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!started && (
            <button
              type="button"
              onClick={() => setStarted(true)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {started ? (
          <VoicePanel sessionId={sessionId} totalVoice={totalVoice} />
        ) : (
          <VoiceStartStub totalVoice={totalVoice} onStart={() => setStarted(true)} />
        )}
        <CodingPanel session={data} />
      </div>
    </div>
  );
}

function VoiceStartStub({ totalVoice, onStart }: { totalVoice: number; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white border rounded-lg p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
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
      </div>
      <h3 className="font-semibold text-lg">Голосовое интервью готово</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-xs">
        Будет задано {totalVoice} вопросов. Можно ознакомиться с кодинг-задачей справа,
        а когда будете готовы — нажмите кнопку.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
      >
        Начать интервью
      </button>
    </div>
  );
}
