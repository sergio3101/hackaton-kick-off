import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL, getToken } from "../../api/client";
import type { Verdict } from "../../api/types";

export interface VoiceQuestion {
  itemId: number;
  idx: number;
  topic: string;
  text: string;
  isFollowUp: boolean;
}

export interface VoiceLogEntry {
  itemId: number;
  topic: string;
  question: string;
  answer: string;
  verdict: Verdict | null;
  rationale: string;
  isFollowUp: boolean;
}

export type VoicePhase = "idle" | "speaking" | "listening" | "thinking" | "done" | "error";

export interface VoiceError {
  code: string;
  message: string;
  recoverable: boolean;
}

export type DoneReason = "completed" | "time_up";

interface State {
  current: VoiceQuestion | null;
  phase: VoicePhase;
  log: VoiceLogEntry[];
  error: VoiceError | null;
  recording: boolean;
  segments: number;
  doneReason: DoneReason | null;
  timeWarningRemainingSec: number | null;
  reconnecting: boolean;
}

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000];  // backoff schedule (max 3 попытки)

const MIN_TOTAL_RECORDING_MS = 600;
const MIN_TOTAL_BLOB_BYTES = 1500;

function wsUrl(sessionId: number): string {
  const token = getToken() || "";
  const base = API_BASE_URL.replace(/^http/, "ws");
  return `${base}/ws/interview/${sessionId}?token=${encodeURIComponent(token)}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoiceSession(sessionId: number) {
  const [state, setState] = useState<State>({
    current: null,
    phase: "idle",
    log: [],
    error: null,
    recording: false,
    segments: 0,
    doneReason: null,
    timeWarningRemainingSec: null,
    reconnecting: false,
  });

  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Безопасная отправка: молчаливо игнорируем сообщения, если WS не открыт
  // (например, между обрывом и reconnect). Возвращает true при успехе.
  const safeSend = useCallback((payload: object): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setState((s) => ({
        ...s,
        error: {
          code: "ws_not_ready",
          message: "Соединение не готово — попробуйте через секунду",
          recoverable: true,
        },
      }));
      return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const totalRecordedMsRef = useRef<number>(0);
  const segmentStartRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingItemRef = useRef<VoiceQuestion | null>(null);
  // Композитный ключ уже сыгранного вопроса, чтобы не повторять TTS на reconnect.
  // Очищаем перед replay (там повтор — намеренный).
  const lastPlayedKeyRef = useRef<string | null>(null);

  const resetSegments = useCallback(() => {
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, segments: 0 }));
  }, []);

  const stopRecorderIfActive = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve();
        return;
      }
      const prevOnStop = recorder.onstop;
      recorder.onstop = (ev) => {
        if (typeof prevOnStop === "function") prevOnStop.call(recorder, ev);
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const playAudio = useCallback(async (audioB64: string) => {
    try {
      // Останавливаем предыдущий TTS, иначе при быстрой смене вопросов два
      // голоса заиграют одновременно и пользователь услышит «кашу».
      const prev = audioRef.current;
      if (prev) {
        try {
          prev.pause();
          prev.src = "";
        } catch {
          /* ignore */
        }
      }
      const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } catch {
      /* ignore */
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl(sessionId));
    wsRef.current = ws;
    setState((s) => ({ ...s, phase: "thinking", error: null }));

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setState((s) => ({ ...s, reconnecting: false }));
      ws.send(JSON.stringify({ type: "hello" }));
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;  // молча игнорируем невалидный JSON, чтобы не убить хук
      }
      if (msg.type === "question") {
        const q: VoiceQuestion = {
          itemId: msg.item_id,
          idx: msg.idx,
          topic: msg.topic,
          text: msg.text,
          isFollowUp: !!msg.is_follow_up,
        };
        pendingItemRef.current = q;
        // Композитный ключ: тот же item с тем же follow-up и тем же текстом
        // считаем за «уже сыгранный» — это случается при WS-reconnect.
        const key = `${q.itemId}:${q.isFollowUp ? 1 : 0}:${q.text}`;
        const alreadyPlayed = lastPlayedKeyRef.current === key;
        const hasAudio = typeof msg.audio_b64 === "string" && msg.audio_b64.length > 0;
        // На reconnect или text-mode сразу стоим в listening, без повторного TTS.
        const shouldPlay = hasAudio && !alreadyPlayed;
        chunksRef.current = [];
        totalRecordedMsRef.current = 0;
        const initialPhase: VoicePhase = shouldPlay ? "speaking" : "listening";
        setState((s) => ({
          ...s,
          current: q,
          phase: initialPhase,
          error: null,
          segments: 0,
          recording: false,
        }));
        if (shouldPlay) {
          lastPlayedKeyRef.current = key;
          // Защита: TTS нового вопроса не должен играть поверх записи ответа.
          // Если recorder ещё работает (race с сервером — например, follow-up
          // пришёл до того как пользователь нажал submit) — сначала глушим запись.
          void stopRecorderIfActive().then(() =>
            playAudio(msg.audio_b64).then(() => {
              setState((s) => (s.current?.itemId === q.itemId ? { ...s, phase: "listening" } : s));
            }),
          );
        }
      } else if (msg.type === "transcript") {
        // Берём тему/вопрос из текущего state.current (а не из ref) —
        // так логи переживают быструю смену вопроса/follow-up без race.
        setState((s) => {
          const matched = s.current && s.current.itemId === msg.item_id ? s.current : null;
          return {
            ...s,
            phase: "thinking",
            log: [
              ...s.log,
              {
                itemId: msg.item_id,
                topic: matched?.topic || "",
                question: matched?.text || "",
                answer: msg.text,
                verdict: null,
                rationale: "",
                isFollowUp: matched?.isFollowUp || false,
              },
            ],
          };
        });
      } else if (msg.type === "evaluation") {
        setState((s) => {
          const log = [...s.log];
          for (let i = log.length - 1; i >= 0; i--) {
            if (log[i].itemId === msg.item_id && log[i].verdict === null) {
              log[i] = { ...log[i], verdict: msg.verdict, rationale: msg.rationale };
              break;
            }
          }
          return { ...s, log };
        });
      } else if (msg.type === "done") {
        const reason: DoneReason = msg.reason === "time_up" ? "time_up" : "completed";
        setState((s) => ({ ...s, current: null, phase: "done", doneReason: reason }));
      } else if (msg.type === "time_warning") {
        const rem = typeof msg.remaining_sec === "number" ? msg.remaining_sec : null;
        setState((s) => ({ ...s, timeWarningRemainingSec: rem }));
      } else if (msg.type === "error") {
        const recoverable = !!msg.recoverable;
        const err: VoiceError = {
          code: msg.code || "error",
          message: msg.message || "Что-то пошло не так",
          recoverable,
        };
        setState((s) => ({
          ...s,
          phase: recoverable ? "listening" : "error",
          error: err,
        }));
      }
    };

    ws.onclose = () => {
      // C5: если сессия не закончена — пробуем переподключиться с backoff.
      if (!isMountedRef.current) return;
      setState((s) => {
        if (s.phase === "done") return s;
        const attempt = reconnectAttemptRef.current;
        if (attempt < RECONNECT_DELAYS_MS.length) {
          const delay = RECONNECT_DELAYS_MS[attempt];
          reconnectAttemptRef.current = attempt + 1;
          if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
          }
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            // Защита от reconnect после unmount: setState на unmounted = warning React.
            if (!isMountedRef.current) return;
            connect();
          }, delay);
          return { ...s, reconnecting: true };
        }
        return {
          ...s,
          phase: "error",
          reconnecting: false,
          error: {
            code: "ws_disconnect",
            message: "Не удалось восстановить соединение. Обновите страницу.",
            recoverable: false,
          },
        };
      });
    };

    ws.onerror = () => {
      // ничего не делаем здесь — onclose сделает reconnect
    };
  }, [sessionId, playAudio]);

  const ensureMic = useCallback(async (): Promise<MediaStream> => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    if (state.phase !== "listening" || state.recording) return;
    try {
      const stream = await ensureMic();
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const elapsed = Date.now() - segmentStartRef.current;
        totalRecordedMsRef.current += elapsed;
        setState((s) => ({ ...s, recording: false, segments: s.segments + 1 }));
      };
      segmentStartRef.current = Date.now();
      recorder.start();
      recorderRef.current = recorder;
      setState((s) => ({ ...s, recording: true, error: null }));
    } catch (e: any) {
      setState((s) => ({
        ...s,
        error: {
          code: "mic_denied",
          message: e?.message || "Не удалось получить доступ к микрофону",
          recoverable: false,
        },
      }));
    }
  }, [ensureMic, state.phase, state.recording]);

  const stopRecording = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      const prevOnStop = recorder.onstop;
      recorder.onstop = (ev) => {
        if (typeof prevOnStop === "function") prevOnStop.call(recorder, ev);
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const toggleRecording = useCallback(() => {
    if (state.recording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  }, [state.recording, startRecording, stopRecording]);

  const submitAnswer = useCallback(async () => {
    if (state.recording) {
      await stopRecording();
    }
    const totalBytes = chunksRef.current.reduce((acc, b) => acc + b.size, 0);
    const totalMs = totalRecordedMsRef.current;
    if (totalBytes < MIN_TOTAL_BLOB_BYTES || totalMs < MIN_TOTAL_RECORDING_MS) {
      setState((s) => ({
        ...s,
        error: {
          code: "audio_too_short",
          message: "Запись слишком короткая — допишите ещё или начните заново",
          recoverable: true,
        },
      }));
      return;
    }
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const b64 = await blobToBase64(blob);
    if (!safeSend({ type: "answer", audio_b64: b64 })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", segments: 0, error: null }));
  }, [state.recording, stopRecording, safeSend]);

  const discardSegments = useCallback(() => {
    if (state.recording) return;
    resetSegments();
    setState((s) => ({ ...s, error: null }));
  }, [state.recording, resetSegments]);

  const skip = useCallback(() => {
    // Запрещаем перейти к следующему вопросу пока идёт запись —
    // иначе TTS нового вопроса начнёт играть поверх ответа.
    if (state.recording) return;
    if (!safeSend({ type: "skip" })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", error: null, segments: 0 }));
  }, [safeSend, state.recording]);

  const submitTextAnswer = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      setState((s) => ({
        ...s,
        error: {
          code: "answer_too_short",
          message: "Ответ слишком короткий — напишите подробнее",
          recoverable: true,
        },
      }));
      return;
    }
    if (state.recording) {
      await stopRecording();
    }
    if (!safeSend({ type: "answer_text", text: trimmed })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", segments: 0, error: null }));
  }, [state.recording, stopRecording, safeSend]);

  const finish = useCallback(() => {
    safeSend({ type: "finish" });
  }, [safeSend]);

  const replay = useCallback(() => {
    // F2: повторить текущий вопрос голосом — сервер пришлёт question заново.
    // Запрещаем повтор во время записи, чтобы TTS не лёг поверх микрофона.
    if (state.recording) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    // Сбрасываем «уже сыгранный» ключ — иначе наша анти-дублирующая защита
    // подавит повторное воспроизведение на replay.
    lastPlayedKeyRef.current = null;
    if (!safeSend({ type: "replay" })) return;
    setState((s) => ({ ...s, phase: "speaking", segments: 0, error: null }));
  }, [safeSend, state.recording]);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      try {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptRef.current = RECONNECT_DELAYS_MS.length;  // не пытаться реконнектиться при cleanup
      wsRef.current?.close();
    };
  }, []);

  return {
    ...state,
    connect,
    startRecording,
    stopRecording,
    toggleRecording,
    submitAnswer,
    submitTextAnswer,
    discardSegments,
    skip,
    finish,
    replay,
    dismissError,
  };
}
