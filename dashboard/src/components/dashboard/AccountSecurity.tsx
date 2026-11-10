"use client";

import { useEffect, useState } from "react";

type SecurityAccount = { email: string; hasPassword: boolean; googleLinked: boolean };

export function AccountSecurity() {
  const [account, setAccount] = useState<SecurityAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch("/api/v1/auth/current", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load account security settings.");
    setAccount(result.user);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh().catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : "Could not load account security settings."); }).finally(() => { if (active) setLoading(false); }); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>, action: "change-password" | "request-email-change") {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update your account.");
      setMessage(result.message ?? (action === "change-password" ? "Password changed. Other sessions were signed out." : "Check your new email for a confirmation link. Your email will not change until you confirm it."));
      form.reset();
      if (action === "change-password") await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function requestSetPassword() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/request-set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send a password setup link.");
      setMessage(result.message ?? `A secure password setup link was sent to ${account?.email}.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  if (loading) return <div role="status" className="admin-subcard">Loading account security…</div>;
  if (loadError || !account) return <div className="admin-subcard"><p role="alert">{loadError || "Could not load account security settings."}</p><button className="button button-secondary" type="button" onClick={() => { setLoading(true); setLoadError(""); void refresh().catch((cause) => setLoadError(cause instanceof Error ? cause.message : "Could not load account security settings.")).finally(() => setLoading(false)); }}>Try again</button></div>;

  return <div className="account-security-grid">
    {account.hasPassword ? <form className="admin-subcard" onSubmit={(event) => void submit(event, "change-password")}>
      <h3>Change password</h3>
      <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><small>At least 12 characters with a letter, number, and symbol.</small></label>
      <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
    </form> : account.googleLinked ? <section className="admin-subcard">
      <h3>Set a password</h3>
      <p>This account uses Google sign-in. We’ll send a one-time setup link to your verified account email. Your password is only set after you open the link and choose one.</p>
      <button className="button button-primary" type="button" disabled={busy} onClick={() => void requestSetPassword()}>{busy ? "Sending…" : "Email password setup link"}</button>
    </section> : <section className="admin-subcard">
      <h3>Password sign-in unavailable</h3>
      <p>This account has no password or verified Google sign-in. Contact support to secure the account before setting one.</p>
    </section>}

    <form className="admin-subcard" onSubmit={(event) => void submit(event, "request-email-change")}>
      <h3>Change email</h3>
      <p>Current email: <strong>{account.email}</strong></p>
      <label>New email<input name="newEmail" type="email" autoComplete="email" maxLength={254} required /></label>
      {account.hasPassword && <label>Current password<input name="password" type="password" autoComplete="current-password" required /></label>}
      <button className="button button-secondary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send confirmation link"}</button>
      <small>Your account email changes only after you confirm the link sent to the new address.</small>
    </form>
    {message && <p role="status" className="account-security-message">{message}</p>}
  </div>;
}
