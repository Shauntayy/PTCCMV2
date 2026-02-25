import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");

  async function handleSignUp() {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setMsg(error.message);
    setMsg("Sign up success. Check your email if confirmation is enabled.");
  }

  async function handleSignIn() {
    setMsg("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("SESSION:", sessionData.session);
    console.log("ACCESS TOKEN:", sessionData.session?.access_token);    
    if (error) return setMsg(error.message);
    setMsg(`Signed in as ${data.user.email}`);
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h2>Login</h2>

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleSignIn} style={{ width: "100%", padding: 10 }}>
        Sign In
      </button>

      <button onClick={handleSignUp} style={{ width: "100%", padding: 10, marginTop: 10 }}>
        Sign Up
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}