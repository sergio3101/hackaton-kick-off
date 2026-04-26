import { jsx as _jsx } from "react/jsx-runtime";
import Icon from "./Icon";
import { useTheme } from "../theme/theme";
export default function ThemeToggle() {
    const [theme, setTheme] = useTheme();
    const isDark = theme === "dark";
    return (_jsx("button", { type: "button", className: "icon-btn", "aria-label": isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему", "aria-pressed": !isDark, title: isDark ? "Светлая тема" : "Тёмная тема", onClick: () => setTheme(isDark ? "light" : "dark"), children: _jsx(Icon, { name: isDark ? "sun" : "moon", size: 14 }) }));
}
