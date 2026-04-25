import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
const STATUS_LABEL = {
    draft: "Черновик",
    active: "В процессе",
    finished: "Завершено",
};
export default function Sessions() {
    const { data, isLoading } = useQuery({
        queryKey: ["sessions"],
        queryFn: async () => (await api.get("/api/sessions")).data,
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\u0421\u0435\u0441\u0441\u0438\u0438" }), isLoading && _jsx("div", { className: "text-slate-500", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), !isLoading && (data?.length ?? 0) === 0 && (_jsxs("div", { className: "bg-white p-10 rounded-xl border text-center text-slate-500", children: ["\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438.", " ", _jsx(Link, { to: "/upload", className: "text-brand hover:underline", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043D\u0430\u0447\u0430\u0442\u044C" })] })), _jsx("div", { className: "grid gap-3", children: data?.map((s) => (_jsx(Link, { to: s.status === "finished" ? `/sessions/${s.id}/report` : `/sessions/${s.id}/interview`, className: "bg-white border rounded-xl p-4 hover:border-brand transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: ["\u0421\u0435\u0441\u0441\u0438\u044F #", s.id, " \u2022 \u0443\u0440\u043E\u0432\u0435\u043D\u044C ", s.selected_level] }), _jsxs("div", { className: "text-xs text-slate-500 mt-1", children: ["\u0422\u0435\u043C\u044B: ", s.selected_topics.join(", ") || "—"] }), _jsx("div", { className: "text-xs text-slate-400 mt-1", children: new Date(s.created_at).toLocaleString("ru-RU") })] }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${s.status === "finished"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : s.status === "active"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"}`, children: STATUS_LABEL[s.status] || s.status })] }) }, s.id))) })] }));
}
