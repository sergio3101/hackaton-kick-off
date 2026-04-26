import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import Icon, { ZebraLogo } from "../components/Icon";

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
    <div className="login-page">
      <div className="login-side">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--ink-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ZebraLogo size={36} color="#0e0e0e" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>
              Kick-off Prep
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              v3.0 · enterprise
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
            marginTop: 32,
          }}
        >
          <div>
            <div className="mono upper" style={{ color: "var(--accent)", marginBottom: 16 }}>
              ONBOARDING · 2 МИНУТЫ ДО ПЕРВОГО KICK-OFF
            </div>
            <h1
              style={{
                fontSize: 56,
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "0 0 24px",
                maxWidth: 520,
              }}
            >
              Создайте аккаунт.
              <br />
              Запустите <span style={{ color: "var(--accent)" }}>первое интервью</span>.
            </h1>
            <p
              style={{
                color: "var(--ink-2)",
                fontSize: 16,
                lineHeight: 1.55,
                maxWidth: 460,
                margin: 0,
              }}
            >
              Регистрация → загрузка ТЗ → автоматический банк вопросов → готово к первой
              голосовой сессии.
            </p>
          </div>

          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -80,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.07,
              pointerEvents: "none",
            }}
          >
            <ZebraLogo size={420} color="#fff" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "var(--ink-3)",
            fontSize: 12,
          }}
        >
          <div className="mono">© 2026 KICK-OFF PREP</div>
          <div style={{ display: "flex", gap: 16 }}>
            <span>SOC2</span>
            <span>GDPR</span>
            <span>ISO 27001</span>
          </div>
        </div>
      </div>

      <div className="login-form">
        <form onSubmit={onSubmit} className="login-form__inner">
          <div className="zebra-divider" style={{ marginBottom: 28, width: 80 }} />
          <h2
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            Регистрация
          </h2>
          <div style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 13 }}>
            Создайте корпоративный аккаунт для команды
          </div>

          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input"
            style={{ marginBottom: 14 }}
          />

          <label
            style={{
              display: "block",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Пароль
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 6 символов"
            className="input"
            style={{ marginBottom: 20 }}
          />

          {error && (
            <div
              style={{
                color: "oklch(0.78 0.16 25)",
                fontSize: 12,
                marginBottom: 14,
                padding: "8px 12px",
                background: "var(--danger-soft)",
                borderRadius: "var(--r-2)",
                border: "1px solid oklch(0.40 0.10 25)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn--primary btn--lg"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {busy ? "..." : (
              <>
                Создать аккаунт <Icon name="arrow-right" size={14} />
              </>
            )}
          </button>

          <div
            style={{
              marginTop: 18,
              fontSize: 12,
              color: "var(--ink-3)",
              textAlign: "center",
            }}
          >
            Уже есть аккаунт?{" "}
            <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
