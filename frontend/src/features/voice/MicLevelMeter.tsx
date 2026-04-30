interface Props {
  /** RMS-уровень 0..1 (приходит с AudioWorklet, уже сглаженный). */
  level: number;
  /** true — server-VAD считает, что кандидат говорит. Подсвечиваем зелёным. */
  active: boolean;
}

const BARS = 9;

/** Тонкий горизонтальный bar-meter уровня микрофона. RMS на речи обычно
 *  0.02–0.2; нормируем по 0.3 чтобы тишина была пустой, а нормальный голос
 *  заполнял ~70% полосы. */
export default function MicLevelMeter({ level, active }: Props) {
  const norm = Math.min(1, level / 0.3);
  const filled = Math.round(norm * BARS);
  const accent = active ? "var(--accent)" : "var(--ink-3)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 18,
      }}
      aria-hidden
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const lit = i < filled;
        // Высота баров повышается к центру для симметричной «шкалы».
        const k = i < BARS / 2 ? i : BARS - 1 - i;
        const h = 6 + (k / (BARS / 2)) * 12;
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1.5,
              background: lit ? accent : "var(--bg-3)",
              transition: "background 60ms linear",
            }}
          />
        );
      })}
    </div>
  );
}
