"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Reply = { id: string; body: string; createdAt: string; author: { role: string } };
type Ticket = { id: string; subject: string; body: string; status: string; createdAt: string; customer?: { fullName: string; email: string }; replies: Reply[] };

export function SupportCenter({ role }: { role: "admin" | "client" }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const root = `/api/v1/${role}/support`;
  const load = useCallback(async () => {
    const response = await fetch(root, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load support requests.");
    setTickets((await response.json()).tickets);
  }, [root]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load().catch(() => setNotice("Could not load support requests.")); });
    return () => { active = false; };
  }, [load]);
  async function submit(path: string, payload: unknown, success: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      await load(); setNotice(success); setMessage(""); setSubject(""); setReplyText({});
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return <><PageHeader eyebrow="ACCOUNT SUPPORT" title="Support" description={role === "admin" ? "Review and respond to customer requests in the secure dashboard." : "Send a request and see replies from the Apex Filings team."} />
    {role === "client" && <Panel title="New support request" subtitle="Do not include passwords or payment card details"><div className="admin-stack"><label className="admin-form-field">Subject<input maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="admin-form-field">Message<textarea rows={5} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} /></label><button className="button button-primary client-inline-button" disabled={busy || subject.trim().length < 5 || message.trim().length < 10} onClick={() => void submit(root, { subject, message }, "Support request submitted.")}>Send request</button></div></Panel>}
    {notice && <p role="status" className="admin-subcard">{notice}</p>}
    <Panel title={role === "admin" ? "Customer requests" : "Your requests"} subtitle={`${tickets.length} recent requests`}><div className="admin-stack">{tickets.map((ticket) => <article className="admin-subcard" key={ticket.id}><div className="admin-row"><div><strong>{ticket.subject}</strong><p>{role === "admin" ? `${ticket.customer?.fullName ?? "Client"} · ${ticket.customer?.email ?? ""} · ` : ""}{new Date(ticket.createdAt).toLocaleString()}</p></div><span>{ticket.status}</span></div><p style={{ whiteSpace: "pre-wrap" }}>{ticket.body}</p>{ticket.replies.map((reply) => <div className="admin-subcard" key={reply.id}><strong>{reply.author.role === "CLIENT" ? "Client" : "Apex Filings"}</strong><small> · {new Date(reply.createdAt).toLocaleString()}</small><p style={{ whiteSpace: "pre-wrap" }}>{reply.body}</p></div>)}<label className="admin-form-field">Reply<textarea rows={3} maxLength={4000} value={replyText[ticket.id] ?? ""} onChange={(event) => setReplyText((current) => ({ ...current, [ticket.id]: event.target.value }))} /></label><button className="button button-secondary client-inline-button" disabled={busy || (replyText[ticket.id] ?? "").trim().length < 2} onClick={() => void submit(`${root}/${ticket.id}/reply`, { message: replyText[ticket.id] }, "Reply sent.")}>Send reply</button></article>)}{!tickets.length && <p>No support requests yet.</p>}</div></Panel>
  </>;
}
