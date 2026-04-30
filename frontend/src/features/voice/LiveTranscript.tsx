interface Props {
  /** Накопленный частичный транскрипт; пустая строка — не рендерим карточку. */
  text: string;
  /** Подсветка границы при активной речи (server-VAD speech). */
  active: boolean;
}

/** Карточка с растущим транскриптом ответа кандидата прямо во время речи.
 *  Закрывает первую болевую точку — «нет обратной связи во время речи». */
export default function LiveTranscript({ text, active }: Props) {
  if (!text) return null;
  return (
    <div
      style={{
        margin: "8px 18px 0",
        padding: "8px 12px",
        border: `1px solid ${active ? "var(--accent)" : "var(--bg-line)"}`,
        background: "var(--bg-1)",
        borderRadius: "var(--r-2)",
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.5,
        fontStyle: "italic",
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span
        className="mono upper"
        style={{
          color: "var(--ink-3)",
          fontStyle: "normal",
          flexShrink: 0,
          fontSize: 10,
          paddingTop: 2,
        }}
      >
        ВЫ ГОВОРИТЕ
      </span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}
