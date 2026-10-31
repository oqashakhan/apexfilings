"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function EmailVerificationEnrollment() {
  const router = useRouter();
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/current", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => { if (active) setEligible(data.user?.canEnrollVerification === true); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!eligible) return null;
  return <div className="client-verification-enrollment">
    <p>Verify your existing email address to add mailbox verification to this account. Your client pages will require the code until verification is complete.</p>
    {error && <p role="alert">{error}</p>}
    <button className="button button-secondary" disabled={busy} onClick={async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/v1/auth/enroll-verification", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Verification could not start. Please try again.");
        router.push("/verify-email");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification could not start."); setBusy(false); }
    }}>Verify my email</button>
  </div>;
}
