import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { editor } from "monaco-editor";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { ReportOut, RequirementsOut, SessionDetailOut } from "../api/types";
import Icon from "../components/Icon";
import { Orb } from "../components/UI";
import CodingEditor from "../features/coding/CodingEditor";
import CodingResults from "../features/coding/CodingResults";
import { useCodingState } from "../features/coding/useCodingState";
import VoiceInteract from "../features/voice/VoiceInteract";
import VoiceLog from "../features/voice/VoiceLog";
import { useVoiceSession } from "../features/voice/useVoiceSession";

type ActiveTab = "voice" | "coding";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("voice");
  const [timeUp, setTimeUp] = useState(false);

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

  // Хуки голоса/кодинга поднимаем сюда: оба компонента (Interact + Log /
  // Editor + Results) делят одно состояние, и переключение табов через CSS
  // display не размонтирует панели — WebSocket / Monaco остаются живыми.
  const v = useVoiceSession(sessionId);
  const coding = useCodingState(data);

  // Гидратируем лог голоса из ранее сохранённых ответов (resume).
  useEffect(() => {
    if (!data) return;
    const completed = data.items
      .filter(
        (i) =>
          i.type === "voice" &&
          (i.verdict !== null || (i.answer_text || "").length > 0),
      )
      .sort((a, b) => a.idx - b.idx)
      .map((i) => ({
        itemId: i.id,
        topic: i.topic,
        question: i.prompt_text,
        answer: i.answer_text,
        verdict: i.verdict,
        rationale: i.rationale,
        isFollowUp: false,
      }));
    if (completed.length > 0) {
      v.hydrate(completed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  // Если сессия уже active — автоматически считаем её начатой
  // (пользователь возвращается через «Продолжить» из /me/assignments).
  useEffect(() => {
    if (data?.status === "active" && !started) {
      setStarted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  // Подключаемся к WS только после нажатия «Начать».
  useEffect(() => {
    if (started) v.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // При истечении времени сессии — остановить активную запись.
  useEffect(() => {
    if (timeUp && v.recording) {
      void v.stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, v.recording]);

  // Monaco при первом показе через display:none может остаться 0×0 — нужен
  // editor.layout() при переключении на coding-таб.
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (activeTab === "coding") {
      requestAnimationFrame(() => editorRef.current?.layout());
    }
  }, [activeTab]);

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

  if (isLoading || !data) {
    return (
      <div className="page" style={{ color: "var(--ink-3)" }}>
        Загрузка сессии...
      </div>
    );
  }

  const totalVoice = data.items.filter((i) => i.type === "voice").length;
  const continuous = continuousFromUrl && data.mode === "voice";
  const isTextMode = data.mode === "text";
  const codingSolved = Object.values(coding.resultById).filter(
    (r) => r.verdict === "correct",
  ).length;
  const codingTotal = coding.codingItems.length;
  const phaseActive =
    v.phase === "speaking" || v.phase === "listening" || v.phase === "thinking";
  const frozen =
    timeUp ||
    v.phase === "done" ||
    v.doneReason === "time_up" ||
    data.status === "finished";

  return (
    <div
      className="page page--wide"
      style={{
        paddingTop: 0,
        height: "calc(100vh - 56px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Session header */}
      <div
        style={{
          padding: "16px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--bg-line)",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <span className="pill pill--accent">
              <span className="dot dot--live" />
              SESSION #{data.id} · {data.status === "active" ? "LIVE" : data.status.toUpperCase()}
            </span>
            <span className="pill">{data.selected_level}</span>
            <span className="pill">{isTextMode ? "TEXT" : "VOICE"}</span>
            {continuous && <span className="pill pill--accent">непрерывный</span>}
            {data.selected_topics.slice(0, 3).map((t) => (
              <span key={t} className="pill">
                {t}
              </span>
            ))}
            {data.selected_topics.length > 3 && (
              <span className="pill">+{data.selected_topics.length - 3}</span>
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            {reqQ.data?.title || `Сессия #${data.id}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SessionTimer
            startedAtIso={data.started_at}
            localStartedAtMs={localStartedAt}
            targetMin={data.target_duration_min ?? 12}
            running={started && data.status !== "finished" && !frozen}
            onTimeUp={() => setTimeUp(true)}
          />
          {!started && (
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                setLocalStartedAt(Date.now());
              }}
              className="btn btn--primary"
            >
              <Icon name="play" size={13} /> Начать
            </button>
          )}
          <button
            type="button"
            onClick={onFinish}
            disabled={finishing}
            className="btn btn--danger"
          >
            <Icon name="stop" size={13} />
            {finishing ? "Формирую отчёт..." : "Завершить"}
          </button>
        </div>
      </div>

      {finishError && (
        <div
          className="state-block state-block--danger"
          style={{ margin: "12px 0", fontSize: 13 }}
        >
          <span>{finishError}</span>
          <button
            type="button"
            onClick={() => setFinishError(null)}
            className="state-block__close"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--bg-line)",
          marginTop: 12,
        }}
      >
        <TabButton
          active={activeTab === "voice"}
          onClick={() => setActiveTab("voice")}
        >
          <Icon name="mic" size={14} />
          <span>{isTextMode ? "Текстовое интервью" : "Голосовое интервью"}</span>
          {phaseActive && (
            <span
              className="dot dot--live"
              style={{ marginLeft: 2 }}
              aria-hidden
            />
          )}
          {v.log.length > 0 && <span className="pill">{v.log.length}</span>}
        </TabButton>
        <TabButton
          active={activeTab === "coding"}
          onClick={() => setActiveTab("coding")}
        >
          <Icon name="code" size={14} />
          <span>Лайв-кодинг</span>
          {codingTotal > 0 && (
            <span className="pill">
              {codingSolved}/{codingTotal}
            </span>
          )}
        </TabButton>
      </div>

      {/* Main 2-col layout */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          padding: "18px 0",
          minHeight: 0,
        }}
      >
        {/* LEFT — interactive panel */}
        <div
          style={{
            display: activeTab === "voice" ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          {started ? (
            <VoiceInteract
              v={v}
              totalVoice={totalVoice}
              continuous={continuous}
              textMode={isTextMode}
              frozen={frozen}
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
        </div>
        <div
          style={{
            display: activeTab === "coding" ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          <CodingEditor
            state={coding}
            onMonacoMount={(editor) => {
              editorRef.current = editor;
            }}
            onSubmit={() => void coding.submit()}
            frozen={frozen}
          />
        </div>

        {/* RIGHT — log / results */}
        <div
          style={{
            display: activeTab === "voice" ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          {started ? (
            <VoiceLog log={v.log} />
          ) : (
            <EmptyLog text="Лог появится после старта интервью." />
          )}
        </div>
        <div
          style={{
            display: activeTab === "coding" ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          <CodingResults state={coding} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        background: "transparent",
        border: "none",
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--ink-1)" : "var(--ink-3)",
        borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
        marginBottom: -1,
        cursor: "pointer",
        transition: "color 120ms",
      }}
    >
      {children}
    </button>
  );
}

function EmptyLog({ text }: { text: string }) {
  return (
    <div
      className="card"
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-3)",
        fontSize: 13,
        textAlign: "center",
        padding: 24,
      }}
    >
      {text}
    </div>
  );
}

function SessionTimer({
  startedAtIso,
  localStartedAtMs,
  targetMin,
  running,
  onTimeUp,
}: {
  startedAtIso: string | null;
  localStartedAtMs: number | null;
  targetMin: number;
  running: boolean;
  onTimeUp?: () => void;
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

  let label = "--:--";
  let color = "var(--ink-3)";
  let remainingSec = totalSec;

  if (startMs !== null) {
    const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
    remainingSec = Math.max(0, totalSec - elapsedSec);
    const mm = Math.floor(remainingSec / 60).toString().padStart(2, "0");
    const ss = (remainingSec % 60).toString().padStart(2, "0");
    label = `${mm}:${ss}`;
    if (remainingSec === 0) color = "var(--danger)";
    else if (remainingSec <= 120) color = "var(--warn)";
    else color = "var(--accent)";
  }

  const firedTimeUp = useRef(false);
  useEffect(() => {
    if (startMs !== null && remainingSec === 0 && !firedTimeUp.current) {
      firedTimeUp.current = true;
      onTimeUp?.();
    }
  }, [remainingSec, startMs, onTimeUp]);

  return (
    <div
      style={{
        padding: "6px 14px",
        borderRadius: "var(--r-2)",
        background: "var(--bg-2)",
        border: "1px solid var(--bg-line)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      title={`Сессия: ${targetMin} мин`}
    >
      <span className="mono upper" style={{ color: "var(--ink-3)" }}>
        ОСТАЛОСЬ
      </span>
      <span
        className="mono"
        style={{
          fontSize: 16,
          fontWeight: 500,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {label}
      </span>
    </div>
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
      ? `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами. Отвечайте текстом — голос отключён.`
      : `Будет задано до ${totalVoice} вопросов. Сессия ограничена ${durationMin} минутами. Можно ознакомиться с кодинг-задачей в табе «Лайв-кодинг».`;

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        className="zebra-stripes--soft"
        style={{ position: "absolute", inset: 0, opacity: 0.4 }}
      />
      <div style={{ position: "relative", marginBottom: 24 }}>
        <Orb state="idle" />
      </div>
      <div
        className="mono upper"
        style={{ color: "var(--accent)", marginBottom: 8 }}
      >
        AI AGENT · ГОТОВ
      </div>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          maxWidth: 360,
          margin: 0,
        }}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="btn btn--primary btn--lg"
        style={{ marginTop: 24 }}
      >
        {isResume ? (
          <>
            Продолжить <Icon name="arrow-right" size={14} />
          </>
        ) : (
          <>
            <Icon name="play" size={14} /> Начать интервью
          </>
        )}
      </button>
    </div>
  );
}
