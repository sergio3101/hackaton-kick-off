import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { RequirementsDetailOut } from "../api/types";

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [questionsPerPair, setQuestionsPerPair] = useState<number>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 && !text.trim()) {
      setError("Загрузите хотя бы один .md файл или вставьте текст");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      if (title.trim()) fd.append("title", title.trim());
      if (text.trim()) fd.append("text", text);
      fd.append("questions_per_pair", String(questionsPerPair));
      files.forEach((f) => fd.append("files", f));
      const r = await api.post<RequirementsDetailOut>("/api/requirements", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/requirements/${r.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не удалось обработать требования");
    } finally {
      setBusy(false);
    }
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".md"));
    setFiles(list);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Загрузка артефактов проекта</h1>
      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Название проекта</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Mobile Banking Q3"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Markdown файлы (.md)</label>
          <input
            type="file"
            multiple
            accept=".md,text/markdown"
            onChange={onPickFiles}
            className="block w-full text-sm"
          />
          {files.length > 0 && (
            <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
              {files.map((f) => (
                <li key={f.name}>• {f.name} ({Math.round(f.size / 1024)} KB)</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">…или вставьте текст напрямую</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Описание проекта в формате Markdown..."
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">
            Вопросов на пару тема × уровень
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={10}
              value={questionsPerPair}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setQuestionsPerPair(Math.max(1, Math.min(10, n)));
              }}
              className="w-20 px-3 py-2 border rounded-lg text-center"
            />
            <span className="text-xs text-slate-500">
              По умолчанию 5. Диапазон 1–10. На каждую тему сгенерируется
              {" "}
              <strong>{questionsPerPair * 3}</strong> вопросов (junior + middle + senior).
              Больше вопросов = дольше генерация и больше токенов.
            </span>
          </div>
        </div>

        {error && <div className="text-rose-600 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {busy ? "Анализ требований и генерация банка вопросов..." : "Загрузить и сгенерировать"}
          </button>
        </div>
        <div className="text-xs text-slate-400">
          На генерацию вопросов уходит до 30 секунд.
        </div>
      </form>
    </div>
  );
}
