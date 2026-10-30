"use client";

import { useState } from "react";

export function AccountSecurity() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>, action: "change-password" | "request-email-change") {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      setMessage(response.ok ? result.message ?? "Updated." : result.error ?? "Could not update your account.");
      if (response.ok) form.reset();
    } catch { setMessage("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="two-grid"><form className="admin-subcard" onSubmit={(event) => void submit(event, "change-password")}><h3>Change password</h3><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label><label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label><button className="button button-primary" disabled={busy}>Update password</button></form><form className="admin-subcard" onSubmit={(event) => void submit(event, "request-email-change")}><h3>Change email</h3><label>New email<input name="newEmail" type="email" autoComplete="email" required /></label><label>Current password<input name="password" type="password" autoComplete="current-password" required /></label><button className="button button-secondary" disabled={busy}>Send confirmation</button><p>Google-only accounts can request a password reset to set an Apex password before changing email.</p></form>{message && <p role="status">{message}</p>}</div>;
}
