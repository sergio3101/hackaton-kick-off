import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../api/client";
import type { SessionDetailOut, SessionItem } from "../../api/types";

export interface TaskResult {
  verdict: string;
  rationale: string;
  pasteChars?: number;
  codeLen?: number;
}

export interface RunOutput {
  language: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  truncated: boolean;
}

// Определяет язык подсветки Monaco по теме задачи (topic).
// Если в теме нет известного маркера — fallback на язык сессии.
export function detectLanguage(topic: string, sessionDefault: string): string {
  const t = (topic || "").toLowerCase();
  if (/(^|[^a-z])docker([^a-z]|$)|dockerfile/.test(t)) return "dockerfile";
  if (/kubernetes|k8s|helm|nginx|yaml|yml/.test(t)) return "yaml";
  if (/grpc|protobuf|proto\b/.test(t)) return "proto";
  if (/postgres|postgresql|mysql|mssql|sql|sqlite|redis/.test(t)) return "sql";
  if (/typescript|\btsx?\b/.test(t)) return "typescript";
  if (/javascript|node\.?js|react|vue|svelte|express|\bjs(x)?\b/.test(t))
    return "javascript";
  if (/\bgo\b|golang|gin|echo/.test(t)) return "go";
  if (/python|fastapi|django|flask|asyncio|pydantic|sqlalchemy/.test(t))
    return "python";
  if (/\bjava\b|spring|kotlin/.test(t)) return "java";
  if (/rust|cargo/.test(t)) return "rust";
  if (/c\+\+|cpp/.test(t)) return "cpp";
  if (/c#|csharp|dotnet|\.net/.test(t)) return "csharp";
  if (/php|laravel|symfony/.test(t)) return "php";
  if (/ruby|rails/.test(t)) return "ruby";
  return sessionDefault || "plaintext";
}

export interface CodingState {
  // данные сессии
  codingItems: SessionItem[];
  lang: string;
  langFor: (item: SessionItem) => string;
  // активная задача
  activeId: number | null;
  setActiveId: (id: number) => void;
  // тексты
  codeById: Record<number, string>;
  setCode: (id: number, code: string) => void;
  // результаты
  resultById: Record<number, TaskResult>;
  runOutputById: Record<number, RunOutput>;
  pasteCharsById: Record<number, number>;
  errorById: Record<number, string>;
  // флаги загрузки
  busyId: number | null;
  runningId: number | null;
  // ref для активного id (используется в paste handler Monaco)
  activeIdRef: React.MutableRefObject<number | null>;
  addPasteChars: (id: number, chars: number) => void;
  // действия
  submit: (onSubmitted?: (item: SessionItem) => void) => Promise<void>;
  run: () => Promise<void>;
}

export function useCodingState(
  session: SessionDetailOut | null | undefined,
): CodingState {
  const lang = (session?.coding_task_language || "python").toLowerCase();

  const codingItems = useMemo(
    () =>
      (session?.items ?? [])
        .filter((i) => i.type === "coding")
        .sort((a, b) => a.idx - b.idx),
    [session?.items],
  );

  const [activeId, setActiveId] = useState<number | null>(
    codingItems[0]?.id ?? null,
  );
  const [codeById, setCodeById] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const it of codingItems) {
      init[it.id] = it.answer_text || "";
    }
    return init;
  });
  const [resultById, setResultById] = useState<Record<number, TaskResult>>(
    () => {
      const init: Record<number, TaskResult> = {};
      for (const it of codingItems) {
        if (it.verdict) {
          init[it.id] = {
            verdict: it.verdict,
            rationale: it.rationale,
            pasteChars: it.paste_chars,
            codeLen: it.answer_text?.length,
          };
        }
      }
      return init;
    },
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runOutputById, setRunOutputById] = useState<Record<number, RunOutput>>(
    {},
  );
  const [pasteCharsById, setPasteCharsById] = useState<Record<number, number>>(
    {},
  );
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const activeIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Сбрасываем счётчики/ран-аутпуты при смене сессии.
  useEffect(() => {
    setPasteCharsById({});
    setRunOutputById({});
  }, [session?.id]);

  // Проставляем активную задачу, когда список появился.
  useEffect(() => {
    if (activeId === null && codingItems.length > 0) {
      setActiveId(codingItems[0].id);
    }
  }, [codingItems, activeId]);

  // Подкачиваем стартовый код для новых задач.
  useEffect(() => {
    setCodeById((prev) => {
      const next = { ...prev };
      for (const it of codingItems) {
        if (next[it.id] === undefined) {
          next[it.id] = it.answer_text || "";
        }
      }
      return next;
    });
  }, [codingItems, lang]);

  function setCode(id: number, code: string) {
    setCodeById((prev) => ({ ...prev, [id]: code }));
  }

  function addPasteChars(id: number, chars: number) {
    if (chars <= 0) return;
    setPasteCharsById((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + chars,
    }));
  }

  async function submit(onSubmitted?: (item: SessionItem) => void) {
    if (!session) return;
    const id = activeId;
    if (id === null) return;
    setBusyId(id);
    setErrorById((e) => ({ ...e, [id]: "" }));
    try {
      const r = await api.post<SessionItem>(
        `/api/sessions/${session.id}/coding/review/${id}`,
        {
          code: codeById[id] ?? "",
          paste_chars: pasteCharsById[id] ?? 0,
        },
      );
      setResultById((prev) => ({
        ...prev,
        [id]: {
          verdict: r.data.verdict || "incorrect",
          rationale: r.data.rationale,
          pasteChars: r.data.paste_chars,
          codeLen: r.data.answer_text?.length,
        },
      }));
      onSubmitted?.(r.data);
    } catch (e: any) {
      setErrorById((prev) => ({
        ...prev,
        [id]: e?.response?.data?.detail || "Не удалось получить ревью",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function run() {
    if (!session) return;
    const id = activeId;
    if (id === null) return;
    setRunningId(id);
    setErrorById((e) => ({ ...e, [id]: "" }));
    try {
      const r = await api.post<RunOutput>(
        `/api/sessions/${session.id}/coding/run/${id}`,
        { code: codeById[id] ?? "" },
      );
      setRunOutputById((prev) => ({ ...prev, [id]: r.data }));
    } catch (e: any) {
      setErrorById((prev) => ({
        ...prev,
        [id]: e?.response?.data?.detail || "Не удалось запустить код",
      }));
    } finally {
      setRunningId(null);
    }
  }

  return {
    codingItems,
    lang,
    langFor: (item: SessionItem) =>
      item.coding_language || detectLanguage(item.topic, lang),
    activeId,
    setActiveId,
    codeById,
    setCode,
    resultById,
    runOutputById,
    pasteCharsById,
    errorById,
    busyId,
    runningId,
    activeIdRef,
    addPasteChars,
    submit,
    run,
  };
}
