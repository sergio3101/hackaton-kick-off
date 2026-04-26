import { useSyncExternalStore } from "react";
const STORAGE_KEY = "kickoff.theme";
const EVENT_NAME = "kickoff:themechange";
const hasDom = typeof document !== "undefined";
function readDataset() {
    if (!hasDom)
        return "light";
    const v = document.documentElement.dataset.theme;
    return v === "dark" ? "dark" : "light";
}
export function getTheme() {
    return readDataset();
}
export function setTheme(t) {
    if (!hasDom)
        return;
    document.documentElement.dataset.theme = t;
    try {
        localStorage.setItem(STORAGE_KEY, t);
    }
    catch {
        /* ignore storage errors (private mode etc.) */
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
}
function subscribe(cb) {
    if (!hasDom)
        return () => { };
    const handler = () => cb();
    window.addEventListener(EVENT_NAME, handler);
    // Реагируем и на изменения из других вкладок — единый источник правды.
    const storageHandler = (e) => {
        if (e.key === STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
            const next = e.newValue;
            if (document.documentElement.dataset.theme !== next) {
                document.documentElement.dataset.theme = next;
                cb();
            }
        }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
        window.removeEventListener(EVENT_NAME, handler);
        window.removeEventListener("storage", storageHandler);
    };
}
export function useTheme() {
    const t = useSyncExternalStore(subscribe, getTheme, () => "light");
    return [t, setTheme];
}
