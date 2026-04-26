import axios from "axios";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});
const TOKEN_KEY = "kickoff.token";
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(value) {
    if (value)
        localStorage.setItem(TOKEN_KEY, value);
    else
        localStorage.removeItem(TOKEN_KEY);
}
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use((r) => r, (error) => {
    if (error?.response?.status === 401) {
        setToken(null);
        // Жёсткий редирект, чтобы любая защищённая страница успела размонтироваться,
        // и не было «мёртвой» вкладки с прежним state. На /login и /register не
        // редиректим — иначе у формы логина пропадёт ошибка «неверный пароль».
        if (typeof window !== "undefined") {
            const path = window.location.pathname;
            if (!path.startsWith("/login") && !path.startsWith("/register")) {
                window.location.assign("/login");
            }
        }
    }
    return Promise.reject(error);
});
