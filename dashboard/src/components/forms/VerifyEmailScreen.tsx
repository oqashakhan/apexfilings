"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";

export function VerifyEmailScreen({ next, legacyToken }: { next: string | null; legacyToken: string | null }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const destination = next ?? "/client/dashboard";

  useEffect(() => {
    if (legacyToken) return;
    let active = true;
    void fetch("/api/v1/auth/current", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { router.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`); return; }
      if (!response.ok) throw new Error("Could not load account");
      const data = await response.json();
      if (!active) return;
      if (data.user?.role === "OWNER") { router.replace("/admin/dashboard"); return; }
      if (data.user?.emailVerified) { router.replace(destination); return; }
      setEmail(data.user?.email ?? "");
      setCooldown(data.verificationRetryAfterSeconds ?? 0);
    }).catch(() => { if (active) setError("Could not load your account. Please refresh or sign in again."); });
    return () => { active = false; };
  }, [destination, legacyToken, next, router]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(Math.max(0, cooldown - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!legacyToken) return;
    // Previously sent verification links remain valid during the migration.
    window.history.replaceState(null, "", `/verify-email${next ? `?next=${encodeURIComponent(next)}` : ""}`);
    let active = true;
    void fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: legacyToken }) }).then(async (response) => {
      if (!active) return;
      if (!response.ok) { setError("This verification link is invalid or expired. Request a new code below."); return; }
      router.replace(destination);
      router.refresh();
    }).catch(() => { if (active) setError("Could not verify your email. Please try again."); });
    return () => { active = false; };
  }, [legacyToken, destination, next, router]);

  function fill(value: string, start = 0) {
    const clean = value.replace(/\D/g, "").slice(0, 6 - start);
    if (!clean) return;
    setDigits((previous) => {
      const nextDigits = [...previous];
      for (let i = 0; i < clean.length; i++) nextDigits[start + i] = clean[i];
      return nextDigits;
    });
    inputs.current[Math.min(5, start + clean.length)]?.focus();
    setError("");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const code = digits.join("");
    if (!/^\d{6}$/.test(code)) { setError("Enter all six digits from your email."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Could not verify this code."); setDigits(Array(6).fill("")); inputs.current[0]?.focus(); return; }
      router.replace(destination);
      router.refresh();
    } catch { setError("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (cooldown || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Could not send another code."); if (response.status === 429) setCooldown(60); return; }
      setDigits(Array(6).fill("")); setCooldown(60); setMessage("A new code has been sent. Check your inbox and spam folder."); inputs.current[0]?.focus();
    } catch { setError("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page otp-page"><section className="otp-panel" aria-labelledby="otp-title">
    <Link href="/" className="otp-brand"><Image src="/apex-icon.png" width={42} height={42} alt="" />Apex Filings</Link>
    <div className="otp-symbol"><MailCheck size={29} aria-hidden="true" /></div>
    <span className="eyebrow accent">ACCOUNT SECURITY</span>
    <h1 id="otp-title">Verify Your Email</h1>
    <p className="otp-description">Enter the six-digit code we sent to {email ? <strong>{email}</strong> : "your email address"}. It expires in 10 minutes.</p>
    <form onSubmit={verify}>
      <div className="otp-inputs" aria-label="Six-digit verification code" onPaste={(event) => { const text = event.clipboardData.getData("text"); if (/^\s*\d{6}\s*$/.test(text)) { event.preventDefault(); fill(text.trim()); } }}>
        {digits.map((digit, index) => <input key={index} ref={(node) => { inputs.current[index] = node; }} aria-label={`Digit ${index + 1}`} autoComplete={index === 0 ? "one-time-code" : "off"} inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={(event) => { const value = event.target.value.replace(/\D/g, ""); if (value.length > 1) fill(value, index); else { setDigits((current) => current.map((item, i) => i === index ? value : item)); if (value && index < 5) inputs.current[index + 1]?.focus(); setError(""); } }} onKeyDown={(event) => { if (event.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus(); }} />)}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="otp-success" role="status">{message}</p>}
      <button className="button button-primary otp-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : "Verify Email"}<ArrowRight size={17} /></button>
    </form>
    <p className="otp-resend">Didn’t get the code? <button type="button" onClick={resend} disabled={busy || cooldown > 0}>Resend Code{cooldown > 0 ? ` (${cooldown}s)` : ""}</button></p>
    <p className="otp-help"><ShieldCheck size={15} /> Your business details remain saved while you verify.</p>
    <Link className="otp-signin" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in with another account</Link>
  </section></main>;
}
