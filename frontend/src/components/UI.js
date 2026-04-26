import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Sparkline({ data, color = "var(--accent)", w = 90, h = 28, }) {
    if (!data || !data.length)
        return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1 || 1);
    const points = data
        .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
        .join(" ");
    return (_jsx("svg", { width: w, height: h, className: "kpi__spark", children: _jsx("polyline", { points: points, fill: "none", stroke: color, strokeWidth: "1.3" }) }));
}
export function Kpi({ label, value, delta, deltaType, hint, sparkData, sparkColor, }) {
    return (_jsxs("div", { className: "kpi", children: [_jsxs("div", { className: "kpi__label", children: [_jsx("span", { className: "dot", style: { background: "var(--accent)" } }), label] }), _jsx("div", { className: "kpi__value mono", children: value }), (delta || hint) && (_jsxs("div", { className: "kpi__sub", children: [delta && (_jsx("span", { className: `mono ${deltaType === "up"
                            ? "kpi__delta--up"
                            : deltaType === "down"
                                ? "kpi__delta--down"
                                : ""}`, children: delta })), hint && _jsx("span", { style: { color: "var(--ink-3)" }, children: hint })] })), sparkData && (_jsx(Sparkline, { data: sparkData, color: sparkColor || "var(--accent)" }))] }));
}
export function StatusPill({ status }) {
    if (status === "active" || status === "in_progress")
        return (_jsxs("span", { className: "pill pill--accent", children: [_jsx("span", { className: "dot dot--live" }), " \u0432 \u044D\u0444\u0438\u0440\u0435"] }));
    if (status === "finished")
        return (_jsxs("span", { className: "pill", children: [_jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M5 13l4 4 10-10" }) }), " ", "\u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E"] }));
    if (status === "draft")
        return (_jsx("span", { className: "pill", style: { color: "var(--ink-3)" }, children: "\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A" }));
    return _jsx("span", { className: "pill", children: status });
}
export function Wave({ bars = 28, intense = 1, active = true, }) {
    const arr = Array.from({ length: bars });
    return (_jsx("div", { className: "wave", children: arr.map((_, i) => {
            const h = 40 + Math.abs(Math.sin(i * 0.7)) * 60 * intense;
            return (_jsx("span", { className: "wave__bar", style: {
                    height: `${h}%`,
                    animationDelay: `${(i % 7) * 0.08}s`,
                    animationPlayState: active ? "running" : "paused",
                    background: i % 5 === 0 ? "var(--orb-1)" : "var(--accent)",
                    opacity: active ? 0.5 + (i % 5) * 0.1 : 0.25,
                } }, i));
        }) }));
}
export function Card({ children, className = "", style, }) {
    return (_jsx("div", { className: `card ${className}`, style: style, children: children }));
}
export function Insight({ tag, children, variant = "accent", }) {
    const colorMap = {
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
    return (_jsxs("div", { className: "insight", style: { borderLeftColor: c.border }, children: [_jsx("div", { className: "insight__icon", style: { background: c.bg, color: c.color }, children: tag?.charAt(0) || "i" }), _jsxs("div", { style: { flex: 1 }, children: [tag && (_jsx("div", { className: "mono upper", style: { color: "var(--ink-3)", marginBottom: 4 }, children: tag })), _jsx("div", { children: children })] })] }));
}
export function Orb({ state = "idle", active = false, }) {
    return (_jsxs("div", { className: `orb orb--${state}${active ? " orb--active" : ""}`, children: [_jsx("div", { className: "orb__ring" }), _jsx("div", { className: "orb__ring orb__ring--2" }), _jsx("div", { className: "orb__ring orb__ring--3" }), _jsx("div", { className: "orb__core" })] }));
}
