import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(!!getToken());
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        api
            .get("/api/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => setToken(null))
            .finally(() => setLoading(false));
    }, []);
    const login = useCallback(async (email, password) => {
        const r = await api.post("/api/auth/login", { email, password });
        setToken(r.data.access_token);
        setUser(r.data.user);
    }, []);
    const register = useCallback(async (email, password) => {
        const r = await api.post("/api/auth/register", { email, password });
        setToken(r.data.access_token);
        setUser(r.data.user);
    }, []);
    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
    }, []);
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, register, logout }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
