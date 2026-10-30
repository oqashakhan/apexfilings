"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ConfirmEmailChangePage() {
  const [message, setMessage] = useState("Confirming your email change…");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setMessage("Confirmation link is missing."); return; }
    void fetch("/api/v1/auth/confirm-email-change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(async (response) => {
      const data = await response.json();
      setMessage(response.ok ? "Email changed. Please sign in again." : data.error ?? "Could not change email.");
    }).catch(() => setMessage("Could not change email. Please try again."));
  }, []);
  return <main className="auth-page"><div className="auth-card" style={{ margin: "auto", maxWidth: 540 }}><span className="eyebrow accent">ACCOUNT SECURITY</span><h1>Confirm email change</h1><p role="status">{message}</p><Link className="button button-primary" href="/login">Sign in</Link></div></main>;
}
