import { useEffect, useState } from "react";
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

export default function CodingPanel({ session, onSubmitted }: Props) {
  const codingItem = session.items.find((i) => i.type === "coding");
  const lang = (session.coding_task_language || "python").toLowerCase();
  const [code, setCode] = useState<string>(codingItem?.answer_text || STARTER[lang] || "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ verdict: string; rationale: string } | null>(
    codingItem && codingItem.verdict
      ? { verdict: codingItem.verdict, rationale: codingItem.rationale }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codingItem?.answer_text) setCode(codingItem.answer_text);
  }, [codingItem?.answer_text]);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<SessionItem>(`/api/sessions/${session.id}/coding/review`, { code });
      setResult({ verdict: r.data.verdict || "incorrect", rationale: r.data.rationale });
      onSubmitted?.(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не удалось получить ревью");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border rounded-t-lg p-4">
        <h3 className="font-semibold mb-2">Лайв-кодинг ({lang})</h3>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{session.coding_task_prompt}</p>
      </div>
      <div className="border-x flex-1 min-h-0">
        <Editor
          height="100%"
          language={lang}
          value={code}
          onChange={(v) => setCode(v ?? "")}
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
            disabled={busy}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {busy ? "Анализ..." : "Отправить решение"}
          </button>
          {result && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                result.verdict === "correct"
                  ? "bg-emerald-100 text-emerald-800"
                  : result.verdict === "partial"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {result.verdict}
            </span>
          )}
        </div>
        {error && <div className="text-rose-600 text-sm">{error}</div>}
        {result?.rationale && (
          <div className="text-sm text-slate-700 bg-slate-50 border rounded p-3 whitespace-pre-wrap">
            {result.rationale}
          </div>
        )}
      </div>
    </div>
  );
}
