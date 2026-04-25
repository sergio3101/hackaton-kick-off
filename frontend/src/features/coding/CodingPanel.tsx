import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";

import { api } from "../../api/client";
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
}

export default function CodingPanel({ session, onSubmitted }: Props) {
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
      if (it.verdict) init[it.id] = { verdict: it.verdict, rationale: it.rationale };
    }
    return init;
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorById, setErrorById] = useState<Record<number, string>>({});

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
        { code: codeById[active.id] ?? "" },
      );
      setResultById((prev) => ({
        ...prev,
        [active.id]: { verdict: r.data.verdict || "incorrect", rationale: r.data.rationale },
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

  if (codingItems.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white border rounded-lg p-4 text-sm text-slate-500">
        Кодинг-задачи отсутствуют в сессии.
      </div>
    );
  }

  const activeResult = active ? resultById[active.id] : null;
  const activeError = active ? errorById[active.id] : "";

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
        </div>
        {activeError && <div className="text-rose-600 text-sm">{activeError}</div>}
        {activeResult?.rationale && (
          <div className="text-sm text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap">
            {activeResult.rationale}
          </div>
        )}
      </div>
    </div>
  );
}
