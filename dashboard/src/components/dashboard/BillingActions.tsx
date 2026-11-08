"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { InvoicePaymentControl } from './InvoicePaymentControl';
import type { InvoiceData } from '@/lib/invoice-presentation';
import { Panel } from "@/components/ui/DashboardUI";

type Order = {
  paymentStatus: string; totalCents: number | null; currency: string;
  invoice: { id:string; number: string; issuedAt: string | null; hostedInvoiceUrl: string | null; invoicePdfUrl: string | null } | null;
  payments: { id: string; method: string; amountCents: number | null; status: string; stripeReceiptUrl: string | null }[];
  refunds: { id: string; amountCents: number | null; status: string; stripeStatus: string | null }[];
};
const money = (amount: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);

export function BillingActions({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice,setInvoice]=useState<InvoiceData|null>(null);
  const [returned, setReturned] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/client/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load billing details.");
    const current=(await response.json()).orders[0]??null;setOrder(current);
    if(current?.invoice){const detail=await fetch(`/api/v1/invoices/${current.invoice.id}`,{cache:'no-store'});if(detail.ok)setInvoice((await detail.json()).invoice);}
  }, [orderId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setReturned(new URLSearchParams(window.location.search).get("checkout"));
      void load().catch(() => setNotice("Could not load billing details."));
    });
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (returned !== "success" || ["VERIFIED", "REFUNDED", "DISPUTED"].includes(order?.paymentStatus ?? "")) return;
    const timer = setInterval(() => { void load().catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [returned, order?.paymentStatus, load]);
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
  const paid = order?.paymentStatus === "VERIFIED" || order?.paymentStatus === "REFUNDED" || order?.paymentStatus === "DISPUTED";
  const canRequestRefund = order?.paymentStatus === "VERIFIED" && !order.refunds.some((item) => !["COMPLETED", "DECLINED"].includes(item.status));
  return <div className="admin-stack">
    {returned === "success" && <Panel title={paid ? "Payment Received" : "Payment Processing"}><p>{paid ? "Your payment has been verified. Track the next application step in your dashboard." : "We are waiting for Stripe to confirm your payment. Your order will update automatically."}</p><Link className="text-action" href="/client/dashboard">Return to dashboard</Link></Panel>}
    {returned === "cancel" && !paid && <Panel title="Payment Not Completed"><p>Your order remains unpaid. You can retry securely below.</p></Panel>}
    {order?.paymentStatus === "DISPUTED" && <Panel title="Payment Under Review"><p>This payment has an open dispute. Contact support if you need help; do not pay again.</p></Panel>}
    {invoice&&<Panel title="Payment"><InvoicePaymentControl invoice={invoice}/></Panel>}
    {!invoice&&order?.totalCents===null&&<p>Your final amount is being confirmed. Payment will be enabled once your invoice is finalized.</p>}
    <Panel title="Invoice, receipts & refunds" subtitle="Financial records for this order"><div className="admin-stack">
      {order?.invoice ? <p>Invoice reference: <strong>{order.invoice.number}</strong> <Link href={`/client/invoices/${order.invoice.id}`}>View Invoice</Link>{order.invoice.issuedAt ? ` · Issued ${new Date(order.invoice.issuedAt).toLocaleDateString()}` : ""} {order.invoice.hostedInvoiceUrl && <a href={order.invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">View paid invoice</a>} {order.invoice.invoicePdfUrl && <a href={order.invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a>}</p> : <p>Invoice details will appear after the total is confirmed.</p>}
      {order?.payments.filter((payment) => ["VERIFIED", "DISPUTED"].includes(payment.status)).map((payment) => <p key={payment.id}>{payment.method === "STRIPE" ? "Stripe payment" : "Verified manual payment"}: {payment.amountCents === null ? "Amount pending" : money(payment.amountCents, order.currency)}{payment.status === "DISPUTED" ? " · Under review" : ""} {payment.stripeReceiptUrl && <a href={payment.stripeReceiptUrl} target="_blank" rel="noopener noreferrer">View receipt</a>}</p>)}
      {order?.refunds.map((item) => <p key={item.id}>Refund request {item.id}: <strong>{item.stripeStatus ?? item.status.replaceAll("_", " ")}</strong>{item.amountCents !== null ? ` · ${money(item.amountCents, order.currency)}` : ""}</p>)}
      {canRequestRefund && <><p>Request a refund review. A request does not guarantee approval or move funds.</p><label className="admin-form-field">Reason<textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="button button-secondary client-inline-button" disabled={busy || reason.trim().length < 10} onClick={() => void requestRefund()}>Request refund review</button></>}
      {notice && <p role="status">{notice}</p>}
    </div></Panel>
  </div>;
}
