"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientReference } from "./ClientReference";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Reply = { id: string; body: string; createdAt: string; author: { role: string } };
type InternalNote = { id: string; body: string; createdAt: string; author: { fullName: string } };
type Ticket = {
  id: string; category: string; subject: string; body: string; status: string; createdAt: string; updatedAt: string;
  company?: { id: string; preferredName: string } | null;
  customer?: { id: string; fullName: string; clientReference: string | null; email: string; notificationPreference?: { supportEmail: boolean } | null };
  assignedTo?: { id: string; fullName: string; role: string } | null;
  replies: Reply[]; internalNotes?: InternalNote[];
};
type Company = { id: string; preferredName: string };
type Assignee = { id: string; fullName: string; role: string };

const categories = ["ACCOUNT", "APPLICATION", "DOCUMENTS", "BILLING", "TECHNICAL", "OTHER"];
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CLIENT", "RESOLVED", "CLOSED"];
const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SupportCenter({ role }: { role: "admin" | "client" }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [category, setCategory] = useState("ACCOUNT");
  const [companyId, setCompanyId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestKey = useRef("");
  const replyKeys = useRef<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const root = `/api/v1/${role}/support`;

  const load = useCallback(async () => {
    const response = await fetch(root, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load support requests.");
    setTickets(result.tickets ?? []);
    setCompanies(result.companies ?? []);
    setAssignees(result.assignees ?? []);
    setLoadError("");
  }, [root]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load().catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : "Could not load support requests."); }).finally(() => { if (active) setLoading(false); }); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") void load().catch(() => setLoadError("Could not refresh support requests.")); };
    const timer = window.setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [load]);

  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target.startsWith("ticket-") && tickets.some((ticket) => `ticket-${ticket.id}` === target)) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [tickets]);

  async function send(path: string, method: "POST" | "PATCH", payload: unknown, success: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request could not be completed.");
      await load();
      setNotice(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request could not be completed.");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    const ok = await send(root, "POST", { category, companyId: companyId || null, subject, message, idempotencyKey: requestKey.current }, "Support request submitted. The team will reply in this dashboard.");
    if (ok) { requestKey.current = crypto.randomUUID(); setCategory("ACCOUNT"); setCompanyId(""); setSubject(""); setMessage(""); }
  }

  async function reply(ticket: Ticket) {
    const text = (replyText[ticket.id] ?? "").trim();
    if (text.length < 2) return;
    const key = replyKeys.current[ticket.id] ?? crypto.randomUUID();
    replyKeys.current[ticket.id] = key;
    const ok = await send(`${root}/${ticket.id}/reply`, "POST", { message: text, idempotencyKey: key }, "Reply sent.");
    if (ok) { delete replyKeys.current[ticket.id]; setReplyText((current) => ({ ...current, [ticket.id]: "" })); }
  }

  async function addInternalNote(ticket: Ticket) {
    const text = (noteText[ticket.id] ?? "").trim();
    if (text.length < 2) return;
    const ok = await send(`${root}/${ticket.id}/note`, "POST", { body: text }, "Internal note saved. It is visible to Admin only.");
    if (ok) setNoteText((current) => ({ ...current, [ticket.id]: "" }));
  }

  async function updateTicket(ticket: Ticket, change: { status?: string; assignedToId?: string | null }) {
    await send(`${root}/${ticket.id}`, "PATCH", change, "Support request updated.");
  }

  return <>
    <PageHeader eyebrow="ACCOUNT SUPPORT" title="Support" description={role === "admin" ? "Review, assign, and respond to customer requests." : "Send a request and follow the conversation with the Apex Filings team."} />
    {loadError && <div className="admin-subcard" role="alert"><p>{loadError}</p><button className="button button-secondary" type="button" onClick={() => { setLoading(true); void load().catch((cause) => setLoadError(cause instanceof Error ? cause.message : "Could not load support requests.")).finally(() => setLoading(false)); }}>Try again</button></div>}
    {notice && <p role="status" className="service-request-notice">{notice}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}

    {role === "client" && <Panel title="New support request" subtitle="Do not include passwords or payment card details.">
      <form className="admin-stack" onSubmit={(event) => void createTicket(event)}>
        <label className="admin-form-field">Category<select value={category} onChange={(event) => setCategory(event.target.value)} required>{categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
        <label className="admin-form-field">Company (optional)<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">General account request</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.preferredName}</option>)}</select></label>
        <label className="admin-form-field">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={5} maxLength={160} required /></label>
        <label className="admin-form-field">Message<textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={4000} required placeholder="Describe how our team can help." /></label>
        <button className="button button-primary client-inline-button" type="submit" disabled={busy || subject.trim().length < 5 || message.trim().length < 10}>{busy ? "Sending…" : "Send request"}</button>
      </form>
    </Panel>}

    <Panel title={role === "admin" ? "Customer requests" : "Your requests"} subtitle={loading ? "Loading requests…" : `${tickets.length} requests`}>
      {loading ? <p className="panel-body-copy">Loading support requests…</p> : !tickets.length ? <p className="panel-body-copy">{role === "admin" ? "No support requests have been submitted." : "You have not submitted any support requests."}</p> : <div className="admin-stack">
        {tickets.map((ticket) => <article id={`ticket-${ticket.id}`} className="admin-subcard support-ticket" key={ticket.id}>
          <div className="admin-row"><div><strong>{ticket.subject}</strong><p>{humanize(ticket.category ?? "GENERAL")} · {ticket.company?.preferredName ? `${ticket.company.preferredName} · ` : ""}{new Date(ticket.createdAt).toLocaleString()}</p>{role === "admin" && <p>{ticket.customer?.fullName} · {ticket.customer?.email} · {ticket.customer?.clientReference ?? "No client reference"}</p>}</div><span className="small-pill">{humanize(ticket.status)}</span></div>
          {role === "admin" && <><ClientReference value={ticket.customer?.clientReference ?? null} /><div className="support-admin-controls">
            <label>Assign to<select value={ticket.assignedTo?.id ?? ""} disabled={busy} onChange={(event) => void updateTicket(ticket, { assignedToId: event.target.value || null })}><option value="">Unassigned</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {humanize(person.role)}</option>)}</select></label>
            <label>Status<select value={ticket.status} disabled={busy} onChange={(event) => void updateTicket(ticket, { status: event.target.value })}>{[...new Set([...statuses, ...(statuses.includes(ticket.status) ? [] : [ticket.status])])].map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
          </div></>}
          <p className="support-ticket-body">{ticket.body}</p>
          <div className="support-conversation">{ticket.replies.map((item) => <div className="support-message" key={item.id}><strong>{item.author.role === "CLIENT" ? (role === "admin" ? "Client" : "You") : role === "admin" ? "Apex Filings team" : "Apex Filings"}</strong><small>{new Date(item.createdAt).toLocaleString()}</small><p>{item.body}</p></div>)}</div>
          {role === "admin" && ticket.internalNotes?.length ? <div className="support-internal-notes"><strong>Internal notes · Admin only</strong>{ticket.internalNotes.map((item) => <div className="support-message" key={item.id}><small>{item.author.fullName} · {new Date(item.createdAt).toLocaleString()}</small><p>{item.body}</p></div>)}</div> : null}
          <label className="admin-form-field">{role === "admin" ? "Reply to client" : "Your reply"}<textarea rows={3} maxLength={4000} value={replyText[ticket.id] ?? ""} onChange={(event) => setReplyText((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Write a reply" /></label>
          <button className="button button-secondary client-inline-button" type="button" disabled={busy || (replyText[ticket.id] ?? "").trim().length < 2} onClick={() => void reply(ticket)}>{busy ? "Sending…" : "Send reply"}</button>
          {role === "admin" && <><label className="admin-form-field">Internal note · Admin only<textarea rows={2} maxLength={4000} value={noteText[ticket.id] ?? ""} onChange={(event) => setNoteText((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Visible only to Admin" /></label><button className="button button-secondary" type="button" disabled={busy || (noteText[ticket.id] ?? "").trim().length < 2} onClick={() => void addInternalNote(ticket)}>Add internal note</button></>}
        </article>)}
      </div>}
    </Panel>
  </>;
}
