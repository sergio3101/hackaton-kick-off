import { jsxs as _jsxs } from "react/jsx-runtime";
export function PasteBadge({ pasteChars, codeLen, }) {
    const ratio = codeLen > 0 ? pasteChars / codeLen : 0;
    const percent = Math.round(ratio * 100);
    const heavy = ratio >= 0.7;
    return (_jsxs("span", { title: `Вставлено ${pasteChars} символов из ${codeLen} (~${percent}%)`, className: `pill ${heavy ? "pill--danger" : "pill--warn"}`, children: ["\uD83D\uDCCB \u0431\u0443\u0444\u0435\u0440: ", pasteChars, " \u0441\u0438\u043C\u0432 \u00B7 ", percent, "%"] }));
}
