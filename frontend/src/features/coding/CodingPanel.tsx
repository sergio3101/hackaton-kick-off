import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import type { SessionDetailOut, SessionItem } from "../../api/types";

interface Props {
  session: SessionDetailOut;
  onSubmitted?: (item: SessionItem) => void;
}

const STARTER: Record<string, string> = {
  python: "# напиши решение здесь\n\n",
  javascript: "// напиши решение здесь\n\n",
  typescript: "// напиши решение здесь\n\n",
  go: "package main\n\nfunc main() {\n}\n",
  java: "public class Solution {\n  public static void main(String[] args) {\n  }\n}\n",
};

interface TaskResult {
  verdict: string;
  rationale: string;
  pasteChars?: number;
  codeLen?: number;
}

interface RunOutput {
  language: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  truncated: boolean;
}

export default function CodingPanel({ session, onSubmitted }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const lang = (session.coding_task_language || "python").toLowerCase();
  const codingItems = useMemo(
    () =>
      session.items
        .filter((i) => i.type === "coding")
        .sort((a, b) => a.idx - b.idx),
    [session.items],
  );

  const [activeId, setActiveId] = useState<number | null>(codingItems[0]?.id ?? null);
  const [codeById, setCodeById] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const it of codingItems) {
      init[it.id] = it.answer_text || STARTER[lang] || "";
    }
    return init;
  });
  const [resultById, setResultById] = useState<Record<number, TaskResult>>(() => {
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
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runOutputById, setRunOutputById] = useState<Record<number, RunOutput>>({});
  const [pasteCharsById, setPasteCharsById] = useState<Record<number, number>>({});
  const [errorById, setErrorById] = useState<Record<number, string>>({});
  const activeIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Сбрасываем счётчик вставленных символов при смене сессии (другая интервью-сессия = чистый счёт).
  useEffect(() => {
    setPasteCharsById({});
    setRunOutputById({});
  }, [session.id]);

  useEffect(() => {
    if (activeId === null && codingItems.length > 0) {
      setActiveId(codingItems[0].id);
    }
  }, [codingItems, activeId]);

  useEffect(() => {
    setCodeById((prev) => {
      const next = { ...prev };
      for (const it of codingItems) {
        if (next[it.id] === undefined) {
          next[it.id] = it.answer_text || STARTER[lang] || "";
        }
      }
      return next;
    });
  }, [codingItems, lang]);

  const active = codingItems.find((i) => i.id === activeId) ?? null;

  async function onSubmit() {
    if (!active) return;
    setBusyId(active.id);
    setErrorById((e) => ({ ...e, [active.id]: "" }));
    try {
      const r = await api.post<SessionItem>(
        `/api/sessions/${session.id}/coding/review/${active.id}`,
        {
          code: codeById[active.id] ?? "",
          paste_chars: pasteCharsById[active.id] ?? 0,
        },
      );
      setResultById((prev) => ({
        ...prev,
        [active.id]: {
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
        [active.id]: e?.response?.data?.detail || "Не удалось получить ревью",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function onRun() {
    if (!active) return;
    setRunningId(active.id);
    setErrorById((e) => ({ ...e, [active.id]: "" }));
    try {
      const r = await api.post<RunOutput>(
        `/api/sessions/${session.id}/coding/run/${active.id}`,
        { code: codeById[active.id] ?? "" },
      );
      setRunOutputById((prev) => ({ ...prev, [active.id]: r.data }));
    } catch (e: any) {
      setErrorById((prev) => ({
        ...prev,
        [active.id]: e?.response?.data?.detail || "Не удалось запустить код",
      }));
    } finally {
      setRunningId(null);
    }
  }

  if (codingItems.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white border rounded-lg p-4 text-sm text-slate-500">
        Кодинг-задачи отсутствуют в сессии.
      </div>
    );
  }

  const activeResult = active ? resultById[active.id] : null;
  const activeError = active ? errorById[active.id] : "";
  const activeRunOutput = active ? runOutputById[active.id] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border rounded-t-lg">
        <div className="flex items-center gap-2 border-b px-3 pt-3">
          {codingItems.map((it, idx) => {
            const result = resultById[it.id];
            const isActive = it.id === activeId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setActiveId(it.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-lg border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-brand text-slate-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="text-xs text-slate-400">#{idx + 1}</span>
                <span className="font-medium">{it.topic}</span>
                {result && (
                  <span
                    className={`ml-1 inline-block w-2 h-2 rounded-full ${
                      result.verdict === "correct"
                        ? "bg-emerald-500"
                        : result.verdict === "partial"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    title={result.verdict}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              Лайв-кодинг ({lang})
              {active && <span className="text-slate-400 font-normal"> — тема: {active.topic}</span>}
            </h3>
          </div>
          {active && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{active.prompt_text}</p>
          )}
        </div>
      </div>

      <div className="border-x flex-1 min-h-0">
        <Editor
          height="100%"
          language={lang}
          value={active ? codeById[active.id] ?? "" : ""}
          onChange={(v) => {
            if (!active) return;
            setCodeById((prev) => ({ ...prev, [active.id]: v ?? "" }));
          }}
          onMount={(editor) => {
            // C2: ловим paste-события Monaco и копим суммарное число вставленных символов.
            editor.onDidPaste((e) => {
              const id = activeIdRef.current;
              if (id === null) return;
              const model = editor.getModel();
              if (!model) return;
              const inserted = model.getValueInRange(e.range);
              const len = inserted.length;
              if (len <= 0) return;
              setPasteCharsById((prev) => ({
                ...prev,
                [id]: (prev[id] ?? 0) + len,
              }));
            });
          }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>

      <div className="bg-white border rounded-b-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!active || busyId !== null}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {busyId === active?.id ? "Анализ..." : "Отправить решение"}
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!active || runningId !== null}
            title="Запустить код в sandbox и увидеть stdout/stderr"
            className="border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {runningId === active?.id ? "Запуск..." : "Запустить"}
          </button>
          {activeResult && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                activeResult.verdict === "correct"
                  ? "bg-emerald-100 text-emerald-800"
                  : activeResult.verdict === "partial"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {activeResult.verdict}
            </span>
          )}
          {isAdmin && activeResult && (activeResult.pasteChars ?? 0) > 0 && (
            <PasteBadge
              pasteChars={activeResult.pasteChars ?? 0}
              codeLen={activeResult.codeLen ?? 0}
            />
          )}
        </div>
        {activeError && <div className="text-rose-600 text-sm">{activeError}</div>}
        {activeRunOutput && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">
              Запуск: exit={activeRunOutput.exit_code}, {activeRunOutput.duration_ms} мс
              {activeRunOutput.timed_out && " · TIMEOUT"}
              {activeRunOutput.truncated && " · вывод обрезан"}
            </div>
            {activeRunOutput.stdout && (
              <pre className="bg-slate-900 text-emerald-100 text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {activeRunOutput.stdout}
              </pre>
            )}
            {activeRunOutput.stderr && (
              <pre className="bg-rose-950 text-rose-100 text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {activeRunOutput.stderr}
              </pre>
            )}
          </div>
        )}
        {activeResult?.rationale && (
          <div className="text-sm text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap">
            {activeResult.rationale}
          </div>
        )}
      </div>
    </div>
  );
}

export function PasteBadge({
  pasteChars,
  codeLen,
}: {
  pasteChars: number;
  codeLen: number;
}) {
  const ratio = codeLen > 0 ? pasteChars / codeLen : 0;
  const percent = Math.round(ratio * 100);
  const heavy = ratio >= 0.7;
  return (
    <span
      title={`Из буфера обмена вставлено ${pasteChars} символов из ${codeLen} (~${percent}%)`}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${
        heavy
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <span aria-hidden>📋</span>
      Буфер обмена: {pasteChars} симв · {percent}%
    </span>
  );
}
