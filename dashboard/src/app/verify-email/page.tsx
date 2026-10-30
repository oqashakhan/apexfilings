"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email…");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setMessage("Verification link is missing. Open the link from your email."); return; }
    void fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(async (response) => {
      const data = await response.json();
      setMessage(response.ok ? "Your email is verified. You can continue to your dashboard." : data.error ?? "Verification failed.");
    }).catch(() => setMessage("Could not verify your email. Please try again."));
  }, []);
  return <main className="auth-page"><div className="auth-card" style={{ margin: "auto", maxWidth: 540 }}><span className="eyebrow accent">ACCOUNT SECURITY</span><h1>Verify your email</h1><p role="status">{message}</p><Link className="button button-primary" href="/client/dashboard">Open dashboard</Link></div></main>;
}
