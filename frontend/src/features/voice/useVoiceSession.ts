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

interface State {
  current: VoiceQuestion | null;
  phase: VoicePhase;
  log: VoiceLogEntry[];
  error: VoiceError | null;
  recording: boolean;
  segments: number;
}

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
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const totalRecordedMsRef = useRef<number>(0);
  const segmentStartRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingItemRef = useRef<VoiceQuestion | null>(null);

  const resetSegments = useCallback(() => {
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, segments: 0 }));
  }, []);

  const playAudio = useCallback(async (audioB64: string) => {
    try {
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
      ws.send(JSON.stringify({ type: "hello" }));
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "question") {
        const q: VoiceQuestion = {
          itemId: msg.item_id,
          idx: msg.idx,
          topic: msg.topic,
          text: msg.text,
          isFollowUp: !!msg.is_follow_up,
        };
        pendingItemRef.current = q;
        chunksRef.current = [];
        totalRecordedMsRef.current = 0;
        setState((s) => ({ ...s, current: q, phase: "speaking", error: null, segments: 0 }));
        playAudio(msg.audio_b64).then(() => {
          setState((s) => (s.current?.itemId === q.itemId ? { ...s, phase: "listening" } : s));
        });
      } else if (msg.type === "transcript") {
        setState((s) => ({
          ...s,
          phase: "thinking",
          log: [
            ...s.log,
            {
              itemId: msg.item_id,
              topic: pendingItemRef.current?.topic || "",
              question: pendingItemRef.current?.text || "",
              answer: msg.text,
              verdict: null,
              rationale: "",
              isFollowUp: pendingItemRef.current?.isFollowUp || false,
            },
          ],
        }));
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
        setState((s) => ({ ...s, current: null, phase: "done" }));
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
      setState((s) => (s.phase === "done" ? s : { ...s, phase: s.phase === "error" ? "error" : "done" }));
    };

    ws.onerror = () => {
      setState((s) => ({
        ...s,
        phase: "error",
        error: { code: "ws_error", message: "Соединение прервано", recoverable: false },
      }));
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
    wsRef.current?.send(JSON.stringify({ type: "answer", audio_b64: b64 }));
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", segments: 0, error: null }));
  }, [state.recording, stopRecording]);

  const discardSegments = useCallback(() => {
    if (state.recording) return;
    resetSegments();
    setState((s) => ({ ...s, error: null }));
  }, [state.recording, resetSegments]);

  const skip = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "skip" }));
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", error: null, segments: 0 }));
  }, []);

  const finish = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "finish" }));
  }, []);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
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
    discardSegments,
    skip,
    finish,
    dismissError,
  };
}
