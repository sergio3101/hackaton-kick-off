import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export default function Breadcrumbs({ items }) {
    return (_jsx("nav", { "aria-label": "breadcrumbs", className: "text-sm text-slate-500 mb-3", children: items.map((it, idx) => {
            const isLast = idx === items.length - 1;
            return (_jsxs("span", { children: [it.to && !isLast ? (_jsx(Link, { to: it.to, className: "hover:text-brand hover:underline", children: it.label })) : (_jsx("span", { className: isLast ? "text-slate-700" : "", children: it.label })), !isLast && _jsx("span", { className: "mx-2 text-slate-400", children: "/" })] }, idx));
        }) }));
}
