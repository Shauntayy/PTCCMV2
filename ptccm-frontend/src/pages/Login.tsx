import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSignUp() {
    setMsg("");
    setLoading(true);
    setIsSignUp(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setIsSignUp(false);
    if (error) return setMsg(error.message);
    setMsg("Sign up success. Check your email if confirmation is enabled.");
    setEmail("");
    setPassword("");
  }

  async function handleSignIn() {
    setMsg("");
    setLoading(true);
    setIsSignUp(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("SESSION:", sessionData.session);
    console.log("ACCESS TOKEN:", sessionData.session?.access_token);    
    if (error) return setMsg(error.message);
    setMsg(`Signed in as ${data.user.email}`);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-title">PTCCM</h1>
          <p className="app-subtitle">Trading Collector</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (isSignUp ? handleSignUp() : handleSignIn())}
            />
          </div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (isSignUp ? handleSignUp() : handleSignIn())}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading && !isSignUp ? "Signing in..." : "Sign In"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading && isSignUp ? "Creating account..." : "Create Account"}
          </button>
        </div>

        {msg && (
          <div className={`message ${msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed") ? "error" : "success"}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}