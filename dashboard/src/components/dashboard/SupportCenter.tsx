"use client";
import { AdminClientIdentity } from "./AdminClientIdentity";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function SupportCenter({ role, selectedCompanyId = "" }: { role: "admin" | "client"; selectedCompanyId?: string }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [category, setCategory] = useState("ACCOUNT");
  const [companyId, setCompanyId] = useState(selectedCompanyId);
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
  const visibleTickets = role === "client" && selectedCompanyId ? tickets.filter(ticket => !ticket.company || ticket.company.id === selectedCompanyId) : tickets;
  const root = `/api/v1/${role}/support`;

  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const params = new URLSearchParams({ search: query, page: String(page), ...(statusFilter ? { status: statusFilter } : {}), ...(fromDate ? { from: fromDate } : {}), ...(toDate ? { to: toDate } : {}) });
    const response = await fetch(root + (role === "admin" ? `?${params}` : ""), { cache: "no-store" });
    const result = await response.json();
    if (sequence !== loadSequence.current) return;
    if (!response.ok) throw new Error(result.error ?? "Could not load support requests.");
    const rows = result.tickets ?? [];
    const target = window.location.hash.slice(1);
    if (!query && /^ticket-[a-zA-Z0-9_-]{1,100}$/.test(target) && !rows.some((ticket: Ticket) => `ticket-${ticket.id}` === target)) {
      const detail = await fetch(`${root}/${encodeURIComponent(target.slice(7))}`, { cache: "no-store" });
      if (detail.ok) rows.push(...(await detail.json()).tickets);
    }
    if (sequence !== loadSequence.current) return;
    setTickets(rows);
    setCompanies(result.companies ?? []);
    setAssignees(result.assignees ?? []);
    setTotal(result.total ?? rows.length);
    setPageSize(result.pageSize ?? 20);
    setLoadError("");
  }, [root, role, query, page, statusFilter, fromDate, toDate]);

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
    if (ok) { requestKey.current = crypto.randomUUID(); setCategory("ACCOUNT"); setCompanyId(selectedCompanyId); setSubject(""); setMessage(""); }
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
      <form id="new-request" className="admin-stack" onSubmit={(event) => void createTicket(event)}>
        <label className="admin-form-field">Category<select value={category} onChange={(event) => setCategory(event.target.value)} required>{categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
        <label className="admin-form-field">Company (optional)<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">General account request</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.preferredName}</option>)}</select></label>
        <label className="admin-form-field">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={5} maxLength={160} required /></label>
        <label className="admin-form-field">Message<textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={4000} required placeholder="Describe how our team can help." /></label>
        <button className="button button-primary client-inline-button" type="submit" disabled={busy || subject.trim().length < 5 || message.trim().length < 10}>{busy ? "Sending…" : "Send request"}</button>
      </form>
    </Panel>}

    <Panel title={role === "admin" ? "Customer requests" : "Your requests"} subtitle={loading ? "Loading requests…" : `${role === "admin" ? total : visibleTickets.length} requests`}>
      {role === "admin" && <label className="admin-list-search">Search requests<input value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} placeholder="Client name, reference, company or subject" maxLength={120} /></label>}
      {role === "admin" && <div className="admin-filters"><label>Status<select value={statusFilter} onChange={event => { setPage(1); setStatusFilter(event.target.value); }}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{humanize(status)}</option>)}</select></label><label>From date (UTC)<input type="date" value={fromDate} onChange={event => { setPage(1); setFromDate(event.target.value); }} /></label><label>To date (UTC)<input type="date" value={toDate} onChange={event => { setPage(1); setToDate(event.target.value); }} /></label></div>}
      {loading ? <p className="panel-body-copy">Loading support requests…</p> : !visibleTickets.length ? <p className="panel-body-copy">{role === "admin" ? "No support requests have been submitted." : "You have not submitted any support requests."}</p> : <div id="requests" className="admin-stack">
        {visibleTickets.map((ticket) => <article id={`ticket-${ticket.id}`} className="admin-subcard support-ticket" key={ticket.id}>
          <div className="admin-row"><div><strong>{ticket.subject}</strong><p>{humanize(ticket.category ?? "GENERAL")} · {ticket.company?.preferredName ? `${ticket.company.preferredName} · ` : ""}{new Date(ticket.createdAt).toLocaleString()}</p>{role === "admin" && <p>{ticket.customer?.email}</p>}</div><span className="small-pill">{humanize(ticket.status)}</span></div>
          {role === "admin" && <><AdminClientIdentity client={ticket.customer} /><div className="support-admin-controls">
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
      {role === "admin" && total > pageSize && <div className="admin-inline-actions"><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(total / pageSize)}</span><button type="button" className="button button-secondary" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next</button></div>}
    </Panel>
  </>;
}
