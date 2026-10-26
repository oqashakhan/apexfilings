"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Mode = "login" | "register" | "forgot" | "reset";
type AuthFields = { name: string; email: string; phone: string; password: string; confirm: string; remember: boolean };
const titles: Record<Mode, { eyebrow: string; title: string; subtitle: string }> = {
  login: { eyebrow: "WELCOME BACK", title: "Sign in to your account", subtitle: "Manage your business formation in one place." },
  register: { eyebrow: "CREATE AN ACCOUNT", title: "Get started with Apex", subtitle: "Create your secure client account." },
  forgot: { eyebrow: "ACCOUNT RECOVERY", title: "Forgot your password?", subtitle: "Request a password reset link." },
  reset: { eyebrow: "NEW PASSWORD", title: "Reset your password", subtitle: "Choose a new password for your account." },
};
const emailSchema = z.email("Enter a valid email address.");

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<AuthFields>({ defaultValues: { name: "", email: "", phone: "", password: "", confirm: "", remember: false } });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(fields: AuthFields) {
    setError("");
    setMessage("");
    if (mode !== "reset") {
      const checked = emailSchema.safeParse(fields.email);
      if (!checked.success) { setError(checked.error.issues[0].message); return; }
    }
    if (mode === "login" && !fields.password) { setError("Enter your password."); return; }
    if (mode === "register") {
      if (!fields.name.trim() || !fields.phone.trim()) { setError("Enter your name and phone number."); return; }
      if (fields.password.length < 12) { setError("Use at least 12 characters with a letter, number, and symbol."); return; }
      if (fields.password !== fields.confirm) { setError("Passwords do not match."); return; }
    }
    if (mode === "reset" && (fields.password.length < 12 || fields.password !== fields.confirm)) { setError("Use at least 12 characters and matching passwords."); return; }
    const action = { login: "login", register: "register", forgot: "request-reset", reset: "reset-password" }[mode];
    const payload = mode === "login" ? { email: fields.email, password: fields.password } : mode === "register" ? { fullName: fields.name, email: fields.email, phone: fields.phone, password: fields.password, confirm: fields.confirm } : mode === "forgot" ? { email: fields.email } : { token: new URLSearchParams(window.location.search).get("token") ?? "", password: fields.password, confirm: fields.confirm };
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Request failed. Please try again."); return; }
      if (mode === "login" || mode === "register") { router.replace(result.role === "OWNER" ? "/admin/dashboard" : "/client/dashboard"); router.refresh(); return; }
      setMessage(mode === "forgot" ? result.message : "Password updated. Please sign in.");
      reset();
    } catch { setError("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  const info = titles[mode];
  return <div className="auth-page"><div className="auth-layout"><div className="auth-side"><Link className="auth-brand" href="/"><Image src="/apex-icon.png" alt="Apex Filings icon" width={52} height={52} /><span>Apex Filings</span></Link><div className="auth-story"><span className="eyebrow">APEX FILINGS DASHBOARD</span><h1>Everything for your business, in one clear place.</h1><p>A streamlined workspace for company formation, documents, orders, and support.</p><div className="auth-feature"><span><ShieldCheck size={21} /></span><div><strong>Designed for clarity</strong><small>Follow progress and find the next step quickly.</small></div></div></div><span className="auth-side-footer">Secure dashboard</span></div><div className="auth-main"><div className="auth-card"><span className="eyebrow accent">{info.eyebrow}</span><h2>{info.title}</h2><p className="auth-subtitle">{info.subtitle}</p>{mode === "forgot" && <div className="auth-preview-alert"><LockKeyhole size={17} /><span>Email delivery is being configured. For security, requests always receive the same response.</span></div>}<form onSubmit={handleSubmit(submit)} noValidate>
      {mode === "register" && <><label>Full name<input autoComplete="name" {...register("name")} placeholder="Your full name" /></label><label>Phone number<input autoComplete="tel" type="tel" {...register("phone")} placeholder="+1 (555) 000-0000" /></label></>}
      {mode !== "reset" && <label>Email address<span className="input-icon"><Mail size={18} /></span><input autoComplete="email" type="email" {...register("email")} placeholder="you@example.com" /></label>}
      {(mode === "login" || mode === "register" || mode === "reset") && <label>Password<span className="password-wrap"><input autoComplete={mode === "login" ? "current-password" : "new-password"} type={showPassword ? "text" : "password"} {...register("password")} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
      {(mode === "register" || mode === "reset") && <label>Confirm password<span className="password-wrap"><input autoComplete="new-password" type={showConfirm ? "text" : "password"} {...register("confirm")} placeholder="Confirm password" /><button type="button" aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
      {mode === "login" && <div className="auth-options"><span>Sessions expire after seven days.</span><Link href="/forgot-password">Forgot password?</Link></div>}
      {error && <p className="form-error" role="alert">{error}</p>}{message && <div className="auth-message" role="status"><CheckCircle2 size={18} />{message}</div>}
      <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Request reset" : "Reset password"}<ArrowRight size={18} /></button>
    </form>{mode === "login" ? <p className="auth-switch">New to Apex Filings? <Link href="/register">Create an account</Link></p> : <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>}</div></div></div></div>;
}
