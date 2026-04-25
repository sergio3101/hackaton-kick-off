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
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {finishing ? "Формирую отчёт..." : "Завершить досрочно"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <VoicePanel sessionId={sessionId} totalVoice={totalVoice} />
        <CodingPanel session={data} />
      </div>
    </div>
  );
}
