export const VERDICT_LABEL_RU = {
    correct: "Верно",
    partial: "Частично",
    incorrect: "Неверно",
    skipped: "Пропущено",
};
export function verdictLabel(v) {
    if (!v)
        return "";
    return VERDICT_LABEL_RU[v] ?? v;
}
