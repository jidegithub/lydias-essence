import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toFriendlyError } from "@lydias-essence/supabase";
import { Field, describe } from "../components/ui";
import { useAuth } from "../lib/auth";

export function Login() {
  const { status, signIn, notice, clearNotice } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "admin") {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== "/login" ? from : "/"} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError("");
    clearNotice();
    try {
      await signIn(email, password);
    } catch (err) {
      setError(toFriendlyError(err, "We couldn’t sign you in.").message);
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card login-card">
        <div className="brand">
          <strong>Lydia’s Essence</strong>
          <span>Shop manager</span>
        </div>
        <h1>Welcome back</h1>
        <p className="lead">Sign in to manage your products, banners and website content.</p>
        {notice && <div className="notice warn" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
        <form onSubmit={submit} noValidate className="stack-gap">
          <Field label="Email" htmlFor="email">
            <input {...describe("email")} className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Password" htmlFor="password">
            <input {...describe("password")} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="notice bad" role="alert">{error}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} type="submit" disabled={busy}>
            {busy && <Loader2 size={16} className="spin" />} {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
