import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Icon({ name, size = 16, className = "", style }) {
    const props = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        style,
    };
    switch (name) {
        case "dashboard":
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "9", rx: "1.5" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "5", rx: "1.5" }), _jsx("rect", { x: "14", y: "12", width: "7", height: "9", rx: "1.5" }), _jsx("rect", { x: "3", y: "16", width: "7", height: "5", rx: "1.5" })] }));
        case "play":
            return (_jsx("svg", { ...props, children: _jsx("polygon", { points: "6,4 20,12 6,20", fill: "currentColor", stroke: "none" }) }));
        case "mic":
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "9", y: "3", width: "6", height: "12", rx: "3" }), _jsx("path", { d: "M5 11a7 7 0 0 0 14 0" }), _jsx("path", { d: "M12 18v3" })] }));
        case "chart":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M3 3v18h18" }), _jsx("path", { d: "M7 14l4-4 3 3 5-6" })] }));
        case "history":
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("path", { d: "M12 7v5l3 2" })] }));
        case "search":
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "M20 20l-3.5-3.5" })] }));
        case "users":
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "9", cy: "8", r: "3.5" }), _jsx("path", { d: "M2.5 20a6.5 6.5 0 0 1 13 0" }), _jsx("circle", { cx: "17", cy: "9", r: "3" }), _jsx("path", { d: "M22 19a5 5 0 0 0-7-4.6" })] }));
        case "settings":
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" })] }));
        case "plus":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M12 5v14M5 12h14" }) }));
        case "arrow-right":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M5 12h14M13 5l7 7-7 7" }) }));
        case "sparkle":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z", fill: "currentColor", stroke: "none" }) }));
        case "filter":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M3 5h18M6 12h12M10 19h4" }) }));
        case "check":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M5 13l4 4 10-10" }) }));
        case "pause":
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "6", y: "4", width: "4", height: "16", fill: "currentColor", stroke: "none" }), _jsx("rect", { x: "14", y: "4", width: "4", height: "16", fill: "currentColor", stroke: "none" })] }));
        case "stop":
            return (_jsx("svg", { ...props, children: _jsx("rect", { x: "6", y: "6", width: "12", height: "12", fill: "currentColor", stroke: "none" }) }));
        case "x":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M6 6l12 12M18 6L6 18" }) }));
        case "tag":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M2 12V4a2 2 0 0 1 2-2h8l10 10-10 10z" }), _jsx("circle", { cx: "8", cy: "8", r: "1.5", fill: "currentColor" })] }));
        case "code":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" }) }));
        case "doc":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }), _jsx("path", { d: "M14 3v6h6M9 13h6M9 17h6" })] }));
        case "headphones":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M3 18v-6a9 9 0 0 1 18 0v6" }), _jsx("path", { d: "M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z", fill: "currentColor" })] }));
        case "logout":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" }) }));
        case "kanban":
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("path", { d: "M9 3v18M15 3v18" })] }));
        case "upload":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("path", { d: "M17 8l-5-5-5 5M12 3v12" })] }));
        case "trash":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }) }));
        case "refresh":
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" }) }));
        case "edit":
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" }), _jsx("path", { d: "M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }));
        default:
            return null;
    }
}
export function ZebraLogo({ size = 28, color = "currentColor", bg = "transparent", }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 64 64", "aria-label": "Kick-off Prep", style: { display: "block" }, children: [_jsx("rect", { width: "64", height: "64", rx: "14", fill: bg }), _jsxs("g", { transform: "translate(8 8)", fill: color, children: [_jsx("path", { d: "M24 1.5c7.5 0 14.6 3.6 16.5 11 .9 3.6.9 7.4 0 11-1 4-2.8 7.6-2.8 11.6 0 3.6 1.8 5.6 1.8 7.6s-1.6 3.5-5.5 3.5c-2.7 0-4.5-1.7-5.4-3.5-1-1.9-1.9-3.6-4.6-3.6s-3.6 1.7-4.6 3.6C18.5 44 16.7 45.7 14 45.7c-3.9 0-5.5-1.5-5.5-3.5s1.8-4 1.8-7.6c0-4-1.8-7.6-2.8-11.6-.9-3.6-.9-7.4 0-11C9.4 5.1 16.5 1.5 24 1.5z", fill: color, opacity: "1" }), _jsxs("g", { fill: "#000", children: [_jsx("path", { d: "M11 11l4 -2 1 6 -4 1z" }), _jsx("path", { d: "M16 7l5 -1 0 7 -5 1z" }), _jsx("path", { d: "M22 5.5l5 -0.5 0 7 -5 0.2z" }), _jsx("path", { d: "M28 5.5l5 0.5 -0.4 7 -4.6 -0.5z" }), _jsx("path", { d: "M33 6.5l5 1.5 -2 6.5 -3.4 -1z" }), _jsx("path", { d: "M9 19l4 0 -0.5 6.5 -4.5 -0.5z" }), _jsx("path", { d: "M14 19.5l5 0 -0.5 7.5 -5 -0.5z" }), _jsx("path", { d: "M20 19.7l4 -0.2 0 7.5 -4 0.5z" }), _jsx("path", { d: "M25 19.5l4 0.2 0.5 7.5 -4 0.3z" }), _jsx("path", { d: "M30 19.7l4 0.3 1 7 -4.5 0z" }), _jsx("path", { d: "M35 19.5l4.5 -0.5 -1 6.5 -4 0.5z" }), _jsx("path", { d: "M9 30l4.5 0 0 5.5 -4 0z" }), _jsx("path", { d: "M15 30.5l5 -0.3 -0.5 6 -4.5 0.3z" }), _jsx("path", { d: "M21 30.5l4 0 0 6 -4 0.3z" }), _jsx("path", { d: "M26 30.5l4 0 0.5 6 -4 0.3z" }), _jsx("path", { d: "M31 30.5l4.5 0.3 0 5.5 -4 0z" })] }), _jsx("circle", { cx: "17", cy: "16", r: "1.6", fill: "#000" }), _jsx("circle", { cx: "31", cy: "16", r: "1.6", fill: "#000" }), _jsx("ellipse", { cx: "24", cy: "40", rx: "2.6", ry: "1.4", fill: "#000", opacity: "0.85" })] })] }));
}
