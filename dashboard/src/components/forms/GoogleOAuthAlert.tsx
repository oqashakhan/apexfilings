"use client";

import { getGoogleOAuthFeedback } from "@/lib/google-oauth-feedback";

export function GoogleOAuthAlert({ code, context = "login" }: { code?: string | null; context?: "login" | "settings" }) {
  const feedback = getGoogleOAuthFeedback(code);
  if (!feedback) return null;
  return <div className="google-oauth-alert" role="alert">
    <strong>{feedback.title}</strong>
    <p>{feedback.message}</p>
    {context === "login"
      ? <button type="button" className="button button-primary" onClick={() => document.getElementById("login-password")?.focus()}>Sign In</button>
      : <a className="button button-secondary" href="/api/v1/auth/google?link=1">Try Another Google Account</a>}
  </div>;
}
