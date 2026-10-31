"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/ui/DashboardUI";

type Order = { id: string; paymentStatus: string; invoice: { number: string; issuedAt: string | null } | null; refunds: { id: string; status: string; createdAt: string }[] };

export function BillingActions({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/client/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load billing details.");
    setOrder((await response.json()).orders[0] ?? null);
  }, [orderId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load().catch(() => setNotice("Could not load billing details.")); });
    return () => { active = false; };
  }, [load]);
  async function requestRefund() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/v1/client/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not request review.");
      setReason(""); setNotice("Refund review requested. This does not move funds."); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not request review."); }
    finally { setBusy(false); }
  }
  return <Panel title="Invoice & refund review" subtitle="Payment and refund decisions are handled by the Apex Filings team"><div className="admin-stack">{order?.invoice ? <p>Invoice reference: <strong>{order.invoice.number}</strong>{order.invoice.issuedAt ? ` · Issued ${new Date(order.invoice.issuedAt).toLocaleDateString()}` : ""}</p> : <p>Invoice details will appear after the total is confirmed.</p>}{order?.refunds.length ? order.refunds.map((item) => <p key={item.id}>Refund request {item.id}: <strong>{item.status.replaceAll("_", " ")}</strong></p>) : order?.paymentStatus === "VERIFIED" ? <><p>Request a refund review. Submitting a request does not guarantee approval or move funds.</p><label className="admin-form-field">Reason<textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="button button-secondary client-inline-button" disabled={busy || reason.trim().length < 10} onClick={() => void requestRefund()}>Request refund review</button></> : null}{notice && <p role="status">{notice}</p>}</div></Panel>;
}
