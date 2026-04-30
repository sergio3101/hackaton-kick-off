import { useCallback, useEffect, useRef, useState } from "react";

import { api, API_BASE_URL } from "../../api/client";
import type { Verdict } from "../../api/types";

import workletUrl from "./pcmWorklet.js?url";

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

/** В Realtime-режиме фаз меньше: speaking — модель говорит, listening —
 *  модель ждёт ответ кандидата (мы стримим аудио на сервер), thinking —
 *  кандидат закончил, ждём evaluation/следующий вопрос. */
export type VoicePhase =
  | "idle"
  | "speaking"
  | "listening"
  | "thinking"
  | "awaiting_next"
  | "done"
  | "error";

export type VadState = "idle" | "speech";

export interface VoiceError {
  code: string;
  message: string;
  recoverable: boolean;
}

export type DoneReason = "completed" | "time_up";

export type SessionMode = "voice" | "text";

interface State {
  current: VoiceQuestion | null;
  phase: VoicePhase;
  log: VoiceLogEntry[];
  error: VoiceError | null;
  /** В legacy/text-режиме — true, когда MediaRecorder активен. В Realtime —
   *  всегда true пока соединение открыто (микрофон стримится непрерывно). */
  recording: boolean;
  segments: number;
  doneReason: DoneReason | null;
  timeWarningRemainingSec: number | null;
  reconnecting: boolean;
  /** TTS реально воспроизводится прямо сейчас. */
  playing: boolean;
  /** Realtime: частичный транскрипт пользователя по мере речи. */
  partialTranscript: string;
  /** Realtime: уровень микрофона 0..1 (RMS), для UI-индикатора. */
  micLevel: number;
  /** Realtime: server-VAD сигнал. */
  vadState: VadState;
}

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000];

// Текстовые сессии сохраняют legacy-минимумы по объёму ответа.
const MIN_TEXT_ANSWER_CHARS = 5;

function wsUrl(sessionId: number, ticket: string): string {
  const base = API_BASE_URL.replace(/^http/, "ws");
  return `${base}/ws/interview/${sessionId}?ticket=${encodeURIComponent(ticket)}`;
}

async function fetchWsTicket(sessionId: number): Promise<string> {
  const { data } = await api.post<{ ticket: string; expires_in: number }>(
    `/api/sessions/${sessionId}/ws-ticket`,
  );
  return data.ticket;
}

/** Realtime отдаёт PCM16 24 kHz base64 в `tts_chunk`. Декодируем в Float32
 *  и склеиваем в очередь AudioBufferSourceNode для непрерывного воспроизведения. */
function decodeTtsChunkToFloat32(audioB64: string): Float32Array {
  const binary = atob(audioB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // Int16 little-endian.
  const view = new DataView(bytes.buffer);
  const samples = bytes.byteLength >> 1;
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const s = view.getInt16(i * 2, true);
    out[i] = s < 0 ? s / 0x8000 : s / 0x7fff;
  }
  return out;
}

/** Конвертация PCM16 (Int16Array) в base64 для отправки на сервер. */
function int16ToBase64(arr: Int16Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let binary = "";
  // Чанк 0x8000 — баланс между числом вызовов fromCharCode и size of arg list.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function useVoiceSession(
  sessionId: number,
  opts: { mode: SessionMode } = { mode: "voice" },
) {
  // mode может прийти позже (data из useQuery загружается асинхронно).
  // Держим в ref, чтобы connect() прочитал актуальное значение в момент
  // запуска, а не зафиксированное при первом рендере.
  const modeRef = useRef<SessionMode>(opts.mode);
  modeRef.current = opts.mode;
  const isRealtime = opts.mode === "voice";

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
    playing: false,
    partialTranscript: "",
    micLevel: 0,
    vadState: "idle",
  });

  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const intentionalCloseRef = useRef<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Realtime-only refs:
  // AudioContext для микрофона (24 kHz при возможности; иначе ресемплим в worklet).
  const micCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  // AudioContext для воспроизведения TTS-чанков. На 24 kHz, чтобы не было
  // ресемплинга на стороне браузера — Realtime сам отдаёт 24 kHz.
  const playCtxRef = useRef<AudioContext | null>(null);
  // Время, в которое запланировано начало следующего TTS-чанка. Используем
  // currentTime + накопленную длительность, чтобы чанки шли встык без
  // микро-разрывов.
  const playCursorRef = useRef<number>(0);
  // Для barge-in: нам нужно мгновенно остановить все запланированные TTS-source.
  const playSrcsRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // RAF-throttle для micLevel: worklet шлёт RMS на каждом кадре (50 мс),
  // setState 20 раз/сек — норма, но прокидываем через RAF, чтобы не дёргать
  // React в фоне неактивной вкладки.
  const lastMicLevelRef = useRef<number>(0);

  // Legacy/text-only refs (для обратной совместимости с текстовыми сессиями).
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const totalRecordedMsRef = useRef<number>(0);
  const segmentStartRef = useRef<number>(0);
  // Legacy-плеер для intro/question: AudioBufferSource с префиксной тишиной.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const pendingItemRef = useRef<VoiceQuestion | null>(null);

  // SessionStorage только для legacy: интрo по теме раз на сессию.
  const playedKeyKey = `kickoff.voice-played-key:${sessionId}`;
  const introTopicsKey = `kickoff.voice-intro-topics:${sessionId}`;
  const lastPlayedKeyRef = useRef<string | null>(
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(playedKeyKey)
      : null,
  );
  const introPlayedTopicsRef = useRef<Set<string>>(
    new Set(
      typeof window !== "undefined"
        ? (() => {
            try {
              const raw = window.sessionStorage.getItem(introTopicsKey);
              return raw ? (JSON.parse(raw) as string[]) : [];
            } catch {
              return [];
            }
          })()
        : [],
    ),
  );

  const persistPlayedKey = useCallback(
    (key: string) => {
      try {
        window.sessionStorage.setItem(playedKeyKey, key);
      } catch { /* ignore */ }
    },
    [playedKeyKey],
  );
  const persistIntroTopics = useCallback(() => {
    try {
      window.sessionStorage.setItem(
        introTopicsKey,
        JSON.stringify([...introPlayedTopicsRef.current]),
      );
    } catch { /* ignore */ }
  }, [introTopicsKey]);
  const clearVoiceStorage = useCallback(() => {
    try {
      window.sessionStorage.removeItem(playedKeyKey);
      window.sessionStorage.removeItem(introTopicsKey);
    } catch { /* ignore */ }
  }, [playedKeyKey, introTopicsKey]);

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

  // ── Realtime: TTS-плеер (Int16 чанки склеиваются в очередь sources) ──────
  const playRtChunk = useCallback((audioB64: string) => {
    let ctx = playCtxRef.current;
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor({ sampleRate: 24000 });
      playCtxRef.current = ctx;
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }

    const float = decodeTtsChunkToFloat32(audioB64);
    if (float.length === 0) return;
    const buffer = ctx.createBuffer(1, float.length, 24000);
    // Cast: TS 5.x делает Float32Array generic'ом по ArrayBufferLike, а
    // copyToChannel ждёт concrete ArrayBuffer. Наш float гарантированно
    // создан с обычным ArrayBuffer (см. decodeTtsChunkToFloat32).
    buffer.copyToChannel(float as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(playCursorRef.current, now + 0.02);
    src.start(startAt);
    playCursorRef.current = startAt + buffer.duration;
    playSrcsRef.current.add(src);
    src.onended = () => {
      playSrcsRef.current.delete(src);
      if (playSrcsRef.current.size === 0) {
        setState((s) => (s.playing ? { ...s, playing: false } : s));
      }
    };
    setState((s) => (s.playing ? s : { ...s, playing: true }));
  }, []);

  const stopAllTts = useCallback(() => {
    for (const src of playSrcsRef.current) {
      try {
        src.onended = null;
        src.stop();
      } catch { /* already stopped */ }
    }
    playSrcsRef.current.clear();
    playCursorRef.current = 0;
    setState((s) => (s.playing ? { ...s, playing: false } : s));
  }, []);

  // ── Legacy-плеер (для text-mode + intro в голосе старого протокола) ──────
  const playLegacyAudio = useCallback(async (audioB64: string) => {
    try {
      const prevSrc = audioSrcRef.current;
      if (prevSrc) {
        try { prevSrc.onended = null; prevSrc.stop(); } catch { /* ignore */ }
        audioSrcRef.current = null;
        setState((s) => (s.playing ? { ...s, playing: false } : s));
      }

      const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
      const ab = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );

      let ctx = audioCtxRef.current;
      if (!ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctx = new Ctor();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch { /* ignore */ }
      }

      const decoded = await ctx.decodeAudioData(ab);

      const SILENCE_MS = 250;
      const silenceFrames = Math.floor((SILENCE_MS / 1000) * decoded.sampleRate);
      const padded = ctx.createBuffer(
        decoded.numberOfChannels,
        decoded.length + silenceFrames,
        decoded.sampleRate,
      );
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        padded.copyToChannel(decoded.getChannelData(ch), ch, silenceFrames);
      }

      const src = ctx.createBufferSource();
      src.buffer = padded;
      src.connect(ctx.destination);
      audioSrcRef.current = src;

      await new Promise<void>((resolve) => {
        src.onended = () => {
          setState((s) =>
            audioSrcRef.current === src ? { ...s, playing: false } : s,
          );
          if (audioSrcRef.current === src) audioSrcRef.current = null;
          resolve();
        };
        setState((s) =>
          audioSrcRef.current === src ? { ...s, playing: true } : s,
        );
        try { src.start(); } catch { /* already started */ }
      });
    } catch {
      /* ignore */
    }
  }, []);

  // ── Realtime: микрофон через AudioWorklet ────────────────────────────────
  const startMicStream = useCallback(async () => {
    if (workletNodeRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    mediaStreamRef.current = stream;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    // Не задаём sampleRate явно — браузеры часто игнорируют, оставляя
    // дефолтный 48 kHz. Worklet ресемплит сам.
    const ctx = new Ctor();
    micCtxRef.current = ctx;
    await ctx.audioWorklet.addModule(workletUrl);
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pcm-worklet");
    node.port.onmessage = (e) => {
      const data = e.data as { pcm: Int16Array; rms: number } | undefined;
      if (!data) return;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const audio_b64 = int16ToBase64(data.pcm);
        ws.send(JSON.stringify({ type: "audio", audio_b64 }));
      }
      // Плавное затухание уровня для красивой анимации (без рывков на тишине).
      const smoothed = lastMicLevelRef.current * 0.6 + data.rms * 0.4;
      lastMicLevelRef.current = smoothed;
      setState((s) => (Math.abs(s.micLevel - smoothed) < 0.005 ? s : { ...s, micLevel: smoothed }));
    };
    source.connect(node);
    workletNodeRef.current = node;
    setState((s) => ({ ...s, recording: true }));
  }, []);

  const stopMicStream = useCallback(() => {
    const node = workletNodeRef.current;
    if (node) {
      try { node.port.onmessage = null; } catch { /* ignore */ }
      try { node.disconnect(); } catch { /* ignore */ }
      workletNodeRef.current = null;
    }
    const ctx = micCtxRef.current;
    if (ctx) {
      try { void ctx.close(); } catch { /* ignore */ }
      micCtxRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((t) => {
      try { t.stop(); } catch { /* ignore */ }
    });
    mediaStreamRef.current = null;
    setState((s) => ({ ...s, recording: false, micLevel: 0 }));
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setState((s) => ({ ...s, phase: "thinking", error: null }));

    let ticket: string;
    try {
      ticket = await fetchWsTicket(sessionId);
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setState((s) => ({
        ...s,
        phase: "error",
        error: {
          code: "ws_ticket_failed",
          message:
            e?.response?.data?.detail ||
            "Не удалось получить разрешение на голосовое подключение",
          recoverable: false,
        },
      }));
      return;
    }
    if (!isMountedRef.current) return;

    const ws = new WebSocket(wsUrl(sessionId, ticket));
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setState((s) => ({ ...s, reconnecting: false }));
      ws.send(JSON.stringify({ type: "hello" }));
      // Realtime: микрофон стартуем сразу после открытия WS — server VAD
      // ждёт постоянный поток. Если getUserMedia спросит permission,
      // первый вопрос от модели всё равно прозвучит (в ws->client
      // приходят tts_chunk до старта микрофона).
      if (isRealtime) {
        void startMicStream().catch((err) => {
          setState((s) => ({
            ...s,
            error: {
              code: "mic_denied",
              message: err?.message || "Не удалось получить доступ к микрофону",
              recoverable: false,
            },
            phase: "error",
          }));
        });
      }
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      const t = msg.type;

      // ── Общие сообщения (оба протокола) ────────────────────────────────
      if (t === "question") {
        const q: VoiceQuestion = {
          itemId: msg.item_id,
          idx: msg.idx,
          topic: msg.topic,
          text: msg.text,
          isFollowUp: !!msg.is_follow_up,
        };
        pendingItemRef.current = q;

        if (isRealtime) {
          // В Realtime question-meta — это объявление; аудио уже идёт через
          // tts_chunk параллельно. partialTranscript обнуляем.
          setState((s) => ({
            ...s,
            current: q,
            phase: "speaking",
            partialTranscript: "",
            error: null,
          }));
          return;
        }

        // Legacy: проигрываем TTS, потом переключаемся в listening.
        const key = `${q.itemId}:${q.isFollowUp ? 1 : 0}:${q.text}`;
        const alreadyPlayed = lastPlayedKeyRef.current === key;
        const hasAudio = typeof msg.audio_b64 === "string" && msg.audio_b64.length > 0;
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
          persistPlayedKey(key);
          const serverIntroB64: string | undefined =
            typeof msg.intro_audio_b64 === "string" && msg.intro_audio_b64.length > 0
              ? msg.intro_audio_b64
              : undefined;
          const topicAlreadyIntroduced =
            !!q.topic && introPlayedTopicsRef.current.has(q.topic);
          const introB64 =
            serverIntroB64 && !topicAlreadyIntroduced ? serverIntroB64 : undefined;
          if (introB64 && q.topic) {
            introPlayedTopicsRef.current.add(q.topic);
            persistIntroTopics();
          }
          void (async () => {
            // Глушим запись, чтобы TTS не лёг поверх микрофона.
            const recorder = recorderRef.current;
            if (recorder && recorder.state === "recording") {
              await new Promise<void>((res) => {
                recorder.onstop = () => res();
                recorder.stop();
              });
            }
            if (introB64) {
              await playLegacyAudio(introB64);
              await new Promise<void>((r) => setTimeout(r, 2000));
              if (pendingItemRef.current?.itemId !== q.itemId) return;
            }
            await playLegacyAudio(msg.audio_b64);
            setState((s) =>
              s.current?.itemId === q.itemId ? { ...s, phase: "listening" } : s,
            );
          })();
        }
        return;
      }

      if (t === "transcript") {
        // Realtime: прилетает ТОЛЬКО для засчитанных ответов (submit_answer).
        // Уточнения и реплики-маркеры в лог не попадают.
        // Legacy: прилетает на каждый submitted answer (как было).
        const isFollowUpMsg = !!msg.is_follow_up;
        setState((s) => {
          const matched = s.current && s.current.itemId === msg.item_id ? s.current : null;
          return {
            ...s,
            phase: "thinking",
            partialTranscript: "",
            log: [
              ...s.log,
              {
                itemId: msg.item_id,
                topic: matched?.topic || "",
                question: matched?.text || "",
                answer: msg.text,
                verdict: null,
                rationale: "",
                isFollowUp: matched?.isFollowUp || isFollowUpMsg,
              },
            ],
          };
        });
        return;
      }

      if (t === "speech_completed") {
        // Кандидат закончил говорить, но это была не «ответная» реплика
        // (уточнение, маркер, болтовня). В лог не пишем — просто сбрасываем
        // live-транскрипт, чтобы карточка «вы говорите» не висела.
        setState((s) => ({ ...s, partialTranscript: "" }));
        return;
      }

      if (t === "evaluation") {
        setState((s) => {
          const log = [...s.log];
          for (let i = log.length - 1; i >= 0; i--) {
            if (log[i].itemId === msg.item_id && log[i].verdict === null) {
              log[i] = { ...log[i], verdict: msg.verdict, rationale: msg.rationale };
              break;
            }
          }
          // В Realtime после evaluation модель сама задаёт следующий вопрос —
          // фаза переключится по следующему question. Здесь не трогаем phase.
          return { ...s, log };
        });
        return;
      }

      if (t === "awaiting_next") {
        // Только legacy: фронт показывает кнопку «К следующему».
        setState((s) => ({ ...s, phase: "awaiting_next", recording: false }));
        return;
      }

      if (t === "done") {
        const reason: DoneReason = msg.reason === "time_up" ? "time_up" : "completed";
        intentionalCloseRef.current = true;
        clearVoiceStorage();
        if (isRealtime) {
          stopAllTts();
          stopMicStream();
        }
        setState((s) => ({ ...s, current: null, phase: "done", doneReason: reason, partialTranscript: "" }));
        try { wsRef.current?.close(1000, "done"); } catch { /* ignore */ }
        return;
      }

      if (t === "time_warning") {
        const rem = typeof msg.remaining_sec === "number" ? msg.remaining_sec : null;
        setState((s) => ({ ...s, timeWarningRemainingSec: rem }));
        return;
      }

      if (t === "error") {
        const recoverable = !!msg.recoverable;
        const err: VoiceError = {
          code: msg.code || "error",
          message: msg.message || "Что-то пошло не так",
          recoverable,
        };
        setState((s) => ({
          ...s,
          phase: recoverable ? s.phase : "error",
          error: err,
        }));
        return;
      }

      // ── Realtime-специфичные ───────────────────────────────────────────
      if (t === "tts_chunk") {
        if (typeof msg.audio_b64 === "string" && msg.audio_b64) {
          playRtChunk(msg.audio_b64);
          // Когда играет TTS — фаза speaking. Если в момент tts_chunk фаза
          // была listening/thinking — обновляем. Не сбрасываем `current`.
          setState((s) =>
            s.phase === "speaking" || s.phase === "done"
              ? s
              : { ...s, phase: "speaking" },
          );
        }
        return;
      }

      if (t === "tts_done") {
        // Realtime закончил говорить. Если есть текущий вопрос — переходим в
        // listening (готовы слушать ответ).
        setState((s) =>
          s.phase === "done" ? s : { ...s, phase: "listening" },
        );
        return;
      }

      if (t === "vad") {
        const vadState: VadState = msg.state === "speech" ? "speech" : "idle";
        setState((s) => {
          let phase = s.phase;
          // Barge-in: только если кандидат начал говорить ВО ВРЕМЯ TTS модели.
          // Без этой проверки interrupt улетал на каждый ответ пользователя,
          // а Realtime отвечал `response_cancel_not_active` (нет активной
          // response — модель уже молча слушает).
          const bargeIn = vadState === "speech" && s.phase === "speaking";
          if (bargeIn) {
            stopAllTts();
            try {
              wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
            } catch { /* ignore */ }
          }
          if (vadState === "speech" && (phase === "speaking" || phase === "listening")) {
            phase = "listening";
          }
          if (vadState === "idle" && phase === "listening") {
            phase = "thinking";
          }
          return { ...s, vadState, phase };
        });
        return;
      }

      if (t === "partial_transcript") {
        const text = typeof msg.text === "string" ? msg.text : "";
        setState((s) => ({ ...s, partialTranscript: s.partialTranscript + text }));
        return;
      }
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      if (intentionalCloseRef.current) return;
      if (event.code === 1000 || event.code === 1008) return;
      // Stop микрофон/TTS перед reconnect: новый WS откроется с нуля.
      if (isRealtime) {
        stopAllTts();
        stopMicStream();
      }
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
            if (!isMountedRef.current) return;
            void connect();
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
      /* onclose уже сделает reconnect */
    };
  }, [
    sessionId,
    isRealtime,
    startMicStream,
    stopMicStream,
    stopAllTts,
    playRtChunk,
    playLegacyAudio,
    persistPlayedKey,
    persistIntroTopics,
    clearVoiceStorage,
  ]);

  // ── Публичные методы ─────────────────────────────────────────────────────

  /** Realtime: barge-in вручную (например, кнопка «Прервать»). В text-mode — no-op. */
  const interrupt = useCallback(() => {
    if (!isRealtime) return;
    stopAllTts();
    try { wsRef.current?.send(JSON.stringify({ type: "interrupt" })); } catch { /* ignore */ }
  }, [isRealtime, stopAllTts]);

  // Legacy-методы: в realtime-режиме большинство — no-op, чтобы UI-код,
  // который их зовёт, ничего не ломал. В text-mode они работают по-старому.
  const startRecording = useCallback(async () => {
    if (isRealtime) return; // в RT микрофон уже идёт непрерывно
    if (state.phase !== "listening" || state.recording) return;
    try {
      let stream = mediaStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
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
  }, [isRealtime, state.phase, state.recording]);

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
    if (isRealtime) return;
    if (state.recording) void stopRecording();
    else void startRecording();
  }, [isRealtime, state.recording, startRecording, stopRecording]);

  const submitAnswer = useCallback(async () => {
    if (isRealtime) return; // RT коммитит автоматически по VAD
    if (state.recording) await stopRecording();
    const totalBytes = chunksRef.current.reduce((acc, b) => acc + b.size, 0);
    if (totalBytes < 1500) {
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
    const reader = new FileReader();
    const b64: string = await new Promise((resolve, reject) => {
      reader.onload = () => {
        const r = reader.result as string;
        resolve(r.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (!safeSend({ type: "answer", audio_b64: b64 })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", segments: 0, error: null }));
  }, [isRealtime, state.recording, stopRecording, safeSend]);

  const discardSegments = useCallback(() => {
    if (isRealtime) return;
    if (state.recording) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, segments: 0, error: null }));
  }, [isRealtime, state.recording]);

  const skip = useCallback(() => {
    if (isRealtime) return; // в RT skip отдан Realtime-модели
    if (state.recording) return;
    if (!safeSend({ type: "skip" })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", error: null, segments: 0 }));
  }, [isRealtime, safeSend, state.recording]);

  const next = useCallback(() => {
    if (isRealtime) return;
    if (state.recording) return;
    if (!safeSend({ type: "next" })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", error: null, segments: 0 }));
  }, [isRealtime, safeSend, state.recording]);

  const submitTextAnswer = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_ANSWER_CHARS) {
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
    if (state.recording) await stopRecording();
    if (!safeSend({ type: "answer_text", text: trimmed })) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    setState((s) => ({ ...s, phase: "thinking", segments: 0, error: null }));
  }, [state.recording, stopRecording, safeSend]);

  const finish = useCallback(() => {
    intentionalCloseRef.current = true;
    // Realtime: глушим воспроизведение и микрофон СРАЗУ, не ждём ответ
    // сервера/unmount. Иначе модель ещё успевает доиграть текущий вопрос
    // в браузере, пока пользователь уже на странице отчёта.
    if (isRealtime) {
      stopAllTts();
      stopMicStream();
    }
    safeSend({ type: "finish" });
    // ВАЖНО: НЕ закрываем WS локально сразу — сервер должен успеть
    // обработать finish и ответить `done`. Если закроем здесь,
    // backend получит ConnectionClosed на _send_done и зашумит лог.
    // Серверный finish-handler сам закроет соединение через несколько мс.
    // Если done не придёт — сработает finally в useEffect-cleanup при
    // навигации на отчёт.
    setState((s) => ({ ...s, phase: "done", doneReason: "completed", partialTranscript: "" }));
  }, [isRealtime, safeSend, stopAllTts, stopMicStream]);

  const replay = useCallback(() => {
    if (isRealtime) return;
    if (state.recording) return;
    chunksRef.current = [];
    totalRecordedMsRef.current = 0;
    lastPlayedKeyRef.current = null;
    try { window.sessionStorage.removeItem(playedKeyKey); } catch { /* ignore */ }
    if (!safeSend({ type: "replay" })) return;
    setState((s) => ({ ...s, phase: "speaking", segments: 0, error: null }));
  }, [isRealtime, safeSend, state.recording, playedKeyKey]);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const hydrate = useCallback((items: VoiceLogEntry[]) => {
    setState((s) => {
      if (s.log.length > 0) return s;
      return { ...s, log: items };
    });
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      intentionalCloseRef.current = true;
      try {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch { /* ignore */ }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      // Realtime cleanup
      const node = workletNodeRef.current;
      if (node) {
        try { node.port.onmessage = null; node.disconnect(); } catch { /* ignore */ }
        workletNodeRef.current = null;
      }
      const micCtx = micCtxRef.current;
      if (micCtx) {
        try { void micCtx.close(); } catch { /* ignore */ }
        micCtxRef.current = null;
      }
      const playCtx = playCtxRef.current;
      if (playCtx) {
        try { void playCtx.close(); } catch { /* ignore */ }
        playCtxRef.current = null;
      }
      // Legacy cleanup
      const src = audioSrcRef.current;
      if (src) {
        try { src.onended = null; src.stop(); } catch { /* ignore */ }
        audioSrcRef.current = null;
      }
      const ctx = audioCtxRef.current;
      if (ctx) {
        try { void ctx.close(); } catch { /* ignore */ }
        audioCtxRef.current = null;
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptRef.current = RECONNECT_DELAYS_MS.length;
      wsRef.current?.close();
    };
  }, []);

  return {
    ...state,
    isRealtime,
    connect,
    interrupt,
    startRecording,
    stopRecording,
    toggleRecording,
    submitAnswer,
    submitTextAnswer,
    discardSegments,
    skip,
    next,
    finish,
    replay,
    dismissError,
    hydrate,
  };
}
