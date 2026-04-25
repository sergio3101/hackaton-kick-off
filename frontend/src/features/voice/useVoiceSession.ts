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

interface State {
  current: VoiceQuestion | null;
  phase: VoicePhase;
  log: VoiceLogEntry[];
  error: string | null;
  recording: boolean;
}

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
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingItemRef = useRef<VoiceQuestion | null>(null);

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
        setState((s) => ({ ...s, current: q, phase: "speaking", error: null }));
        playAudio(msg.audio_b64).then(() => {
          setState((s) => (s.current?.itemId === q.itemId ? { ...s, phase: "listening" } : s));
        });
      } else if (msg.type === "transcript") {
        setState((s) => ({ ...s, phase: "thinking" }));
        setState((s) => ({
          ...s,
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
        setState((s) => ({ ...s, phase: "error", error: msg.message }));
      }
    };

    ws.onclose = () => {
      setState((s) => (s.phase === "done" ? s : { ...s, phase: s.phase === "error" ? "error" : "done" }));
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, phase: "error", error: "WebSocket connection error" }));
    };
  }, [sessionId]);

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

  const ensureMic = useCallback(async (): Promise<MediaStream> => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    if (state.phase !== "listening") return;
    try {
      const stream = await ensureMic();
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (blob.size === 0) return;
        const b64 = await blobToBase64(blob);
        wsRef.current?.send(JSON.stringify({ type: "answer", audio_b64: b64 }));
        setState((s) => ({ ...s, phase: "thinking", recording: false }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setState((s) => ({ ...s, recording: true }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e?.message || "Не удалось получить доступ к микрофону" }));
    }
  }, [ensureMic, state.phase]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const skip = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "skip" }));
    setState((s) => ({ ...s, phase: "thinking" }));
  }, []);

  const finish = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "finish" }));
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
    skip,
    finish,
  };
}
