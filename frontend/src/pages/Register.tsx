import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password);
      navigate("/");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не удалось зарегистрироваться");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Регистрация</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2 border rounded-lg"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль (минимум 6 символов)"
          className="w-full px-3 py-2 border rounded-lg"
        />
        {error && <div className="text-rose-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-brand hover:bg-brand-dark text-white py-2 rounded-lg disabled:opacity-50"
        >
          {busy ? "..." : "Зарегистрироваться"}
        </button>
        <div className="text-sm text-slate-500 text-center">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-brand hover:underline">
            Войти
          </Link>
        </div>
      </form>
    </div>
  );
}
