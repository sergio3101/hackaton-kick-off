import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { RequirementsDetailOut } from "../api/types";
import Icon from "../components/Icon";

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
    const list = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".md"),
    );
    setFiles(list);
  }

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div>
          <div className="mono upper" style={{ color: "var(--accent)", marginBottom: 8 }}>
            UPLOAD · АРТЕФАКТЫ ПРОЕКТА
          </div>
          <h1 className="page-title">Загрузка ТЗ</h1>
          <div className="page-sub">
            ИИ извлечёт темы и сгенерирует банк вопросов на матрицу тема × уровень.
          </div>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Название проекта
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: FleetOps Q3"
            className="input"
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Markdown файлы (.md)
          </label>
          <div
            style={{
              padding: 16,
              border: "1px dashed var(--bg-line)",
              borderRadius: "var(--r-2)",
              background: "var(--bg-2)",
            }}
          >
            <input
              type="file"
              multiple
              accept=".md,text/markdown"
              onChange={onPickFiles}
              style={{
                display: "block",
                width: "100%",
                fontSize: 12,
                color: "var(--ink-2)",
              }}
            />
            {files.length > 0 && (
              <ul
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 10,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {files.map((f) => (
                  <li key={f.name} className="mono">
                    • {f.name} ({Math.round(f.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            …или вставьте текст напрямую
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Описание проекта в формате Markdown..."
            className="input textarea mono"
            style={{ resize: "vertical", fontSize: 12 }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Вопросов на пару тема × уровень
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="number"
              min={1}
              max={10}
              value={questionsPerPair}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n))
                  setQuestionsPerPair(Math.max(1, Math.min(10, n)));
              }}
              className="input"
              style={{ width: 80, textAlign: "center" }}
            />
            <span style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
              По умолчанию 5. На каждую тему сгенерируется{" "}
              <strong className="mono" style={{ color: "var(--accent)" }}>
                {questionsPerPair * 3}
              </strong>{" "}
              вопросов (junior + middle + senior).
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--danger-soft)",
              border: "1px solid oklch(0.40 0.10 25)",
              borderRadius: "var(--r-2)",
              color: "oklch(0.78 0.16 25)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
            На генерацию уходит до 30 секунд
          </span>
          <button
            type="submit"
            disabled={busy}
            className="btn btn--primary btn--lg"
          >
            {busy
              ? "Генерируем банк вопросов..."
              : (
                <>
                  <Icon name="sparkle" size={14} /> Загрузить и сгенерировать
                </>
              )}
          </button>
        </div>
      </form>
    </div>
  );
}
