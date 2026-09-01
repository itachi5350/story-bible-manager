import { useState } from "react";
import api from "../api";

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignIn = mode === "signin";

  const switchMode = () => {
    setMode(isSignIn ? "signup" : "signin");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!email.trim() || !password) {
      setError("Enter both email and password.");
      return;
    }
    if (!isSignIn && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isSignIn ? "/auth/login" : "/auth/signup";
      const res = await api.post(endpoint, { email: email.trim(), password });
      localStorage.setItem("sbm_token", res.data.access_token);
      localStorage.setItem("sbm_email", res.data.email);
      onAuthenticated(res.data.access_token, res.data.email);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 429) {
        setError("Too many attempts. Wait a moment and try again.");
      } else if (detail) {
        setError(detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-candle">
        <div className="flame-wrapper">
          <div className="flame">
            <div className="flame-inner"></div>
            <div className="flame-core"></div>
          </div>
          <div className="flame-glow"></div>
        </div>
        <div className="candle-body">
          <div className="candle-shine"></div>
          <div className="candle-drip drip-1"></div>
          <div className="candle-drip drip-2"></div>
          <div className="candle-drip drip-3"></div>
        </div>
        <div className="candle-base"></div>
      </div>

      <div className="auth-panel">
        <div className="auth-mini-candle">
          <div className="flame-wrapper">
            <div className="flame">
              <div className="flame-inner"></div>
              <div className="flame-core"></div>
            </div>
            <div className="flame-glow"></div>
          </div>
          <div className="auth-mini-candle-body"></div>
          <div className="auth-mini-candle-base"></div>
        </div>

        <div className="auth-star">✦</div>
        <div className="auth-title">Enter the Grimoire</div>
        <div className="auth-subtitle">Your tales await, kept safe by candlelight</div>

        <div className="auth-tabs">
          <div
            className={`auth-tab ${isSignIn ? "active" : ""}`}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign in
          </div>
          <div
            className={`auth-tab ${!isSignIn ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Sign up
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignIn ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? "One moment..." : isSignIn ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-star auth-star-2">✦</div>
        <div className="auth-switch" onClick={switchMode}>
          {isSignIn ? (
            <>New to the grimoire? <span>Create an account</span></>
          ) : (
            <>Already keep a grimoire? <span>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
}