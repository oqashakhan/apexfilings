"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Delivery = { id: string; eventKey: string; toEmail: string; subject: string; status: string; attempts: number; createdAt: string; sentAt: string | null; deliveredAt: string | null };

export function EmailDeliveryView() {
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState<Delivery[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/admin/email-delivery${status === "ALL" ? "" : `?status=${status}`}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Email delivery status could not be loaded.");
      const data = await response.json();
      if (active) { setItems(data.items); setCounts(data.counts); setError(""); }
    }).catch(() => { if (active) setError("Email delivery status could not be loaded."); });
    return () => { active = false; };
  }, [status]);
  return <><PageHeader eyebrow="OPERATIONS" title="Email Delivery" description="Server-side transactional email status. Messages are dispatched by the scheduled worker." /><div className="stats-grid"><div className="admin-subcard"><strong>Queued</strong><p>{counts.QUEUED ?? 0}</p></div><div className="admin-subcard"><strong>Sending</strong><p>{counts.SENDING ?? 0}</p></div><div className="admin-subcard"><strong>Sent or delivered</strong><p>{(counts.SENT ?? 0) + (counts.DELIVERED ?? 0)}</p></div><div className="admin-subcard"><strong>Failed</strong><p>{counts.FAILED ?? 0}</p></div></div><Panel title="Recent email events" subtitle="Latest 100 records; message bodies and credentials are never shown"><div className="admin-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{["ALL", "QUEUED", "SENDING", "SENT", "DELIVERED", "FAILED"].map((value) => <option key={value} value={value}>{value === "ALL" ? "All" : value.toLowerCase()}</option>)}</select></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="admin-stack">{items.map((item) => <div className="admin-subcard admin-row" key={item.id}><div><strong>{item.subject}</strong><p>{item.toEmail} · {new Date(item.createdAt).toLocaleString()}</p><small>Event: {item.eventKey}</small></div><div><strong>{item.status}</strong><p>{item.attempts} attempts</p></div></div>)}{!items.length && !error && <p>No email events match this filter.</p>}</div></Panel></>;
}
