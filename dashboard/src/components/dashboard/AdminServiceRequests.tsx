"use client";
import { AdminClientIdentity } from "./AdminClientIdentity";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Item = {
  id: string; details: string; status: string; statusNote: string | null; createdAt: string;
  customer: { id: string; fullName: string; email: string; clientReference: string | null };
  company: { id: string; preferredName: string; formationState: string };
  service: { id: string; name: string; priceCents: number | null; currency: string; priceApproved: boolean };
};
const statuses = ["REQUESTED", "UNDER_REVIEW", "INFORMATION_REQUIRED", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const label = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminServiceRequests() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [status, setStatus] = useState("REQUESTED");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const response = await fetch(`/api/v1/admin/service-requests?search=${encodeURIComponent(query)}`, { cache: "no-store" });
    const result = await response.json();
    if (sequence !== loadSequence.current) return;
    if (!response.ok) throw new Error(result.error ?? "Could not load service requests.");
    const rows = result.requests;
    const target = window.location.hash.slice(1);
    if (!query && /^request-[a-zA-Z0-9_-]{1,100}$/.test(target) && !rows.some((item: Item) => `request-${item.id}` === target)) {
      const detail = await fetch(`/api/v1/admin/service-requests?id=${encodeURIComponent(target.slice(8))}`, { cache: "no-store" });
      if (detail.ok) rows.push(...(await detail.json()).requests);
    }
    if (sequence !== loadSequence.current) return;
    setItems(rows);
  }, [query]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load service requests."); }).finally(() => { if (active) setLoading(false); }); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") void load().catch(() => setError("Could not refresh service requests.")); };
    const timer = window.setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [load]);

  useEffect(() => { const target = window.location.hash.slice(1); if (target.startsWith("request-") && items.some(item => `request-${item.id}` === target)) document.getElementById(target)?.scrollIntoView({ block: "start" }); }, [items]);

  function review(item: Item) {
    setSelected(item);
    setStatus(item.status);
    setNote(item.statusNote ?? "");
    setError("");
  }

  async function save() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/service-requests/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update request.");
      await load();
      setSelected(null);
      setNotice("Service request updated. The client was notified if its status changed.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update request."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="CLIENT SERVICE REQUESTS" title="Additional Service Requests" description="Review client requests, ask for information, and manage their status." />
    {notice && <p className="service-request-notice" role="status">{notice}</p>}
    {error && !selected && <p className="form-error" role="alert">{error}</p>}
    <Panel title="Requests" subtitle={`${items.length} requests`}>
      <label className="admin-list-search">Search requests<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Client name, reference or company" maxLength={120} /></label>
      {loading ? <p className="panel-body-copy">Loading requests…</p> : !items.length ? <p className="panel-body-copy">No additional service requests yet.</p> : <div className="admin-stack">{items.map((item) => <article id={`request-${item.id}`} className="admin-subcard" key={item.id}>
        <div className="admin-row"><div><strong>{item.service.name} · {item.company.preferredName}</strong><AdminClientIdentity client={item.customer} /><p>{item.customer.email} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="small-pill">{label(item.status)}</span></div>
        <div className="admin-inline-actions"><button className="button button-secondary" type="button" onClick={() => review(item)}>Review request</button></div>
      </article>)}</div>}
    </Panel>
    {selected && <div className="client-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelected(null); }}>
      <section className="client-service-review" role="dialog" aria-modal="true" aria-labelledby="admin-service-request-title">
        <div className="client-service-dialog-head"><div><span className="eyebrow accent">ADMIN REVIEW</span><h2 id="admin-service-request-title">{selected.service.name}</h2></div><button className="icon-button" type="button" aria-label="Close request" disabled={busy} onClick={() => setSelected(null)}>×</button></div>
        <div className="service-request-admin-details"><div><span>Client</span><AdminClientIdentity client={selected.customer} /></div><div><span>Company</span><strong>{selected.company.preferredName} · {selected.company.formationState}</strong></div><div><span>Submitted</span><strong>{new Date(selected.createdAt).toLocaleString()}</strong></div><div><span>Request details</span><p>{selected.details}</p></div></div>
        <label className="admin-form-field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label className="admin-form-field">Message to client{status === "INFORMATION_REQUIRED" && <span> (required)</span>}<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} placeholder="Add an update or explain what information is needed." /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="client-service-form-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button className="button button-primary" type="button" disabled={busy || (status === "INFORMATION_REQUIRED" && note.trim().length < 3)} onClick={() => void save()}>{busy ? "Saving…" : "Save and notify client"}</button></div>
      </section>
    </div>}
  </>;
}
