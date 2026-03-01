import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setMsg("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Sign up success. Check your email if confirmation is enabled.");
  }

  async function handleSignIn() {
    setMsg("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg(`Signed in as ${data.user.email}`);
  }

  return (
    <div className="login-container">
      <div className="login-card" role="main" aria-labelledby="login-title">
        <header className="login-header">
          <div className="brand">
            <svg className="brand-logo" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="6" fill="#667eea" />
              <path d="M7 15l3-6 3 6 3-8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 id="login-title" className="app-title">PTCCM</h1>
              <div className="app-subtitle">Trading Collector</div>
            </div>
          </div>
        </header>

        <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
          <label className="visually-hidden" htmlFor="email">Email address</label>
          <div className="form-group">
            <input
              id="email"
              className="form-input"
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <label className="visually-hidden" htmlFor="password">Password</label>
          <div className="form-group">
            <input
              id="password"
              className="form-input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={loading} aria-disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button type="button" className="btn btn-ghost" onClick={handleSignUp} disabled={loading} aria-disabled={loading}>
              Create Account
            </button>
          </div>
        </form>

        {msg && (
          <div className={`message ${msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed") ? "error" : "success"}`} role="status">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}