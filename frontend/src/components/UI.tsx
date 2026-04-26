import type { CSSProperties, ReactNode } from "react";

export function Sparkline({
  data,
  color = "var(--accent)",
  w = 90,
  h = 28,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="kpi__spark">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

interface KpiProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down";
  hint?: string;
  sparkData?: number[];
  sparkColor?: string;
}

export function Kpi({
  label,
  value,
  delta,
  deltaType,
  hint,
  sparkData,
  sparkColor,
}: KpiProps) {
  return (
    <div className="kpi">
      <div className="kpi__label">
        <span className="dot" style={{ background: "var(--accent)" }} />
        {label}
      </div>
      <div className="kpi__value mono">{value}</div>
      {(delta || hint) && (
        <div className="kpi__sub">
          {delta && (
            <span
              className={`mono ${
                deltaType === "up"
                  ? "kpi__delta--up"
                  : deltaType === "down"
                    ? "kpi__delta--down"
                    : ""
              }`}
            >
              {delta}
            </span>
          )}
          {hint && <span style={{ color: "var(--ink-3)" }}>{hint}</span>}
        </div>
      )}
      {sparkData && (
        <Sparkline data={sparkData} color={sparkColor || "var(--accent)"} />
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === "active" || status === "in_progress")
    return (
      <span className="pill pill--accent">
        <span className="dot dot--live" /> в эфире
      </span>
    );
  if (status === "finished")
    return (
      <span className="pill">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4 10-10" />
        </svg>{" "}
        завершено
      </span>
    );
  if (status === "draft")
    return (
      <span className="pill" style={{ color: "var(--ink-3)" }}>
        черновик
      </span>
    );
  return <span className="pill">{status}</span>;
}

export function Wave({
  bars = 28,
  intense = 1,
}: {
  bars?: number;
  intense?: number;
}) {
  const arr = Array.from({ length: bars });
  return (
    <div className="wave">
      {arr.map((_, i) => {
        const h = 40 + Math.abs(Math.sin(i * 0.7)) * 60 * intense;
        return (
          <span
            key={i}
            className="wave__bar"
            style={{
              height: `${h}%`,
              animationDelay: `${(i % 7) * 0.08}s`,
              background:
                i % 5 === 0 ? "oklch(0.96 0.18 130)" : "var(--accent)",
              opacity: 0.5 + (i % 5) * 0.1,
            }}
          />
        );
      })}
    </div>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Insight({
  tag,
  children,
  variant = "accent",
}: {
  tag?: string;
  children: ReactNode;
  variant?: "accent" | "warn" | "danger";
}) {
  const colorMap: Record<string, { border: string; bg: string; color: string }> = {
    accent: {
      border: "var(--accent)",
      bg: "var(--accent-soft)",
      color: "var(--accent)",
    },
    warn: { border: "var(--warn)", bg: "var(--warn-soft)", color: "var(--warn)" },
    danger: {
      border: "var(--danger)",
      bg: "var(--danger-soft)",
      color: "var(--danger)",
    },
  };
  const c = colorMap[variant];
  return (
    <div className="insight" style={{ borderLeftColor: c.border }}>
      <div
        className="insight__icon"
        style={{ background: c.bg, color: c.color }}
      >
        {tag?.charAt(0) || "i"}
      </div>
      <div style={{ flex: 1 }}>
        {tag && (
          <div className="mono upper" style={{ color: "var(--ink-3)", marginBottom: 4 }}>
            {tag}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Orb({
  state = "idle",
}: {
  state?: "listening" | "thinking" | "speaking" | "idle";
}) {
  return (
    <div className={`orb orb--${state}`}>
      <div className="orb__ring" />
      <div className="orb__ring orb__ring--2" />
      <div className="orb__ring orb__ring--3" />
      <div className="orb__core" />
    </div>
  );
}
