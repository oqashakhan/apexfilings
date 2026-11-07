"use client";

import { useState } from "react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";
import type { AdminRefund } from "@/lib/admin-models";

export function StripeAdminActions({ orderId, refunds, stripeCheckoutStatus }: { orderId: string; refunds: AdminRefund[]; stripeCheckoutStatus: string | null }) {
  const { refresh } = useAdminDemo();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function post(path: string, value: object) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Stripe action failed");
      await refresh(); setMessage(path.endsWith("reconcile") ? `Stripe reconciliation complete: ${result.paymentStatus}.` : `Refund submitted to Stripe: ${result.status}. Settlement is pending confirmation.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Stripe action failed"); }
    finally { setBusy(false); }
  }
  if (!stripeCheckoutStatus) return null;
  return <div className="admin-subcard admin-stack"><strong>Stripe payment controls</strong><p>Provider records are the source of truth. Reconciliation checks this order against Stripe.</p><button className="button button-secondary" disabled={busy} onClick={() => void post("/api/v1/payments/reconcile", { orderId })}>Reconcile with Stripe</button>
    {refunds.filter((item) => item.status === "Approved" && (!item.stripeStatus || item.stripeStatus === "initiating")).map((item) => {
      const value = amounts[item.id] ?? (item.stripeStatus === "initiating" && item.amount !== null ? item.amount.toFixed(2) : "");
      const valid = /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;
      return <div className="admin-stack" key={item.id}>
        <label className="admin-form-field">Refund amount for request {item.id} (USD)<input inputMode="decimal" placeholder="0.00" value={value} onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
        <button className="button button-primary" disabled={busy || !valid} onClick={() => void post("/api/v1/payments/refunds", { refundRequestId: item.id, amountCents: Math.round(Number(value) * 100) })}>{item.stripeStatus === "initiating" ? "Retry Stripe refund request" : "Issue approved refund through Stripe"}</button>
      </div>;
    })}
    {message && <p role="status">{message}</p>}
  </div>;
}
