import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import Icon, { ZebraLogo } from "../components/Icon";

export default function Login() {
  const { user, login } = useAuth();
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
      await login(email, password);
      navigate("/");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  const stats = [
    { k: "≤ 800", v: "мс отклик" },
    { k: "5", v: "языков" },
    { k: "99.9%", v: "uptime голос" },
    { k: "WCAG 2.1", v: "AA" },
  ];

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
            <div
              className="mono upper"
              style={{ color: "var(--accent)", marginBottom: 16 }}
            >
              AI-FIRST · VOICE INTERVIEW PLATFORM
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
              Kick-off за <span style={{ color: "var(--accent)" }}>60 секунд</span>.
              <br />
              Аналитика — за минуту.
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
              Голосовые AI-интервью с задержкой до 800мс, семантический поиск по
              транскриптам, автоматические инсайты по командам и проектам.
            </p>

            <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
              {stats.map((s) => (
                <div key={s.v}>
                  <div
                    className="mono"
                    style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}
                  >
                    {s.k}
                  </div>
                  <div className="mono upper" style={{ color: "var(--ink-3)" }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
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
            alignItems: "center",
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
            Вход
          </h2>
          <div style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 13 }}>
            Используйте корпоративный email
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
            placeholder="••••••••"
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
                Войти в платформу <Icon name="arrow-right" size={14} />
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
            Нет аккаунта?{" "}
            <Link
              to="/register"
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
