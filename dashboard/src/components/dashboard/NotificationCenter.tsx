"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Notice = { id: string; type: string; title: string; message: string; relatedEntity: string | null; readAt: string | null; createdAt: string };
type Preferences = { everyLoginEmail: boolean; applicationEmail: boolean; paymentEmail: boolean; documentEmail: boolean; supportEmail: boolean };
const defaults: Preferences = { everyLoginEmail: false, applicationEmail: true, paymentEmail: true, documentEmail: true, supportEmail: true };
export function noticeHref(role: "admin" | "client", item: Pick<Notice, "type" | "relatedEntity">) {
  if (!item.relatedEntity) return null;
  if (item.type === "NEW_REGISTRATION" && role === "admin") return `/admin/clients/${encodeURIComponent(item.relatedEntity)}`;
  if (item.type === "REFUND_REQUEST" && role === "admin") return "/admin/payments";
  if (item.type.startsWith("SUPPORT_")) return `/${role}/support`;
  if (["NEW_APPLICATION", "APPLICATION_SUBMITTED", "STATUS_UPDATED", "DOCUMENT_REVIEW", "DOCUMENT_UPLOADED", "FINAL_DOCUMENT", "PAYMENT_UPDATE", "PAYMENT_REVIEW", "CUSTOMER_RESPONSE", "ORDER_CREATED"].includes(item.type)) return `/${role}/applications/${encodeURIComponent(item.relatedEntity)}`;
  return null;
}

export function NotificationCenter({ role }: { role: "admin" | "client" }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [preferences, setPreferences] = useState(defaults);
  const [message, setMessage] = useState("");
  const root = `/api/v1/${role}`;
  const load = useCallback(async () => {
    const [notices, settings] = await Promise.all([fetch(`${root}/notifications?filter=${filter}`, { cache: "no-store" }), fetch(`${root}/notification-preferences`, { cache: "no-store" })]);
    if (notices.ok) { const data = await notices.json(); setItems(data.notifications); setUnread(data.unreadCount); }
    if (settings.ok) { const data = await settings.json(); setPreferences({ ...defaults, ...data.preferences }); }
  }, [root, filter]);
  useEffect(() => { void load(); }, [load]);
  async function mark(path: string, read = true) {
    const response = await fetch(`${root}/notifications/${path}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read }) });
    if (response.ok) await load(); else setMessage("Could not update notifications.");
  }
  async function save(next: Preferences) {
    setPreferences(next);
    const response = await fetch(`${root}/notification-preferences`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    setMessage(response.ok ? "Preferences saved." : "Could not save preferences.");
  }
  return <><PageHeader eyebrow="WORKSPACE INBOX" title="Notifications" description="Account, application, document, and payment updates." /><Panel title="Updates" subtitle={`${unread} unread`}><div className="admin-filters"><label>Show<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select></label><button className="button button-secondary" disabled={!unread} onClick={() => void mark("read-all")}>Mark all as read</button></div><div className="admin-stack">{items.map((item) => <div className={`admin-row admin-subcard ${item.readAt ? "is-read" : ""}`} key={item.id}><div className="admin-notice-copy"><Bell size={18} /><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div><div className="admin-inline-actions">{noticeHref(role, item) && <Link className="table-link" href={noticeHref(role, item)!}>Open</Link>}<button className="table-link" onClick={() => void mark(item.id, !Boolean(item.readAt))}>{item.readAt ? "Mark unread" : <><Check size={14} /> Mark read</>}</button></div></div>)}{!items.length && <p>No notifications match this filter.</p>}</div></Panel><Panel title="Email preferences" subtitle="Security messages remain enabled for your protection"><div className="admin-stack">{([['everyLoginEmail','Email me after every login'],['applicationEmail','Application updates'],['paymentEmail','Order and payment updates'],['documentEmail','Document updates'],['supportEmail','Support updates']] as const).map(([key, label]) => <label key={key} className="admin-subcard" style={{ display: "flex", gap: 12, alignItems: "center" }}><input type="checkbox" checked={preferences[key]} onChange={(event) => void save({ ...preferences, [key]: event.target.checked })} />{label}</label>)}</div>{message && <p role="status">{message}</p>}</Panel></>;
}
