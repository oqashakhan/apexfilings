"use client";

import Link from "next/link";
import { Bell, CheckCheck, CreditCard, FileText, MessageCircle, X } from "lucide-react";
import { noticeHref } from "@/components/dashboard/NotificationCenter";

export type HeaderNotice = { id: string; type: string; title: string; message: string; relatedEntity: string | null; readAt: string | null; createdAt: string };

export function noticeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}

export function noticeIcon(type: string) {
  if (type.includes("DOCUMENT")) return FileText;
  if (type.includes("PAYMENT") || type.includes("ORDER")) return CreditCard;
  if (type.includes("SUPPORT") || type.includes("RESPONSE")) return MessageCircle;
  return Bell;
}

export function NotificationDropdown({ role, items, onClose, onRead }: { role: "admin" | "client"; items: HeaderNotice[]; onClose: () => void; onRead: (id: string) => void }) {
  const unread = items.filter((item) => !item.readAt).length;
  return <div className="topbar-popover dashboard-notice-menu" role="region" aria-label="Recent notifications"><div className="dashboard-notice-menu-head"><strong>Notifications <span>{unread} unread</span></strong><button aria-label="Close notifications" onClick={onClose}><X size={16} /></button></div><div className="dashboard-notice-menu-list">{items.length ? items.slice(0, 5).map((item) => { const href = noticeHref(role, item); const Icon = noticeIcon(item.type); return <div key={item.id} className={`dashboard-notice-menu-item ${item.readAt ? "is-read" : "is-unread"}`}><span className="dashboard-notice-icon"><Icon size={17} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{noticeTime(item.createdAt)}</small>{href && <Link href={href} onClick={onClose}>View details</Link>}</div>{!item.readAt && <button title="Mark read" aria-label={`Mark ${item.title} read`} onClick={() => onRead(item.id)}><CheckCheck size={17} /></button>}</div>; }) : <p className="dashboard-notice-empty">No notifications yet.</p>}</div><Link className="dashboard-notice-all" href={`/${role}/notifications`} onClick={onClose}>View All Notifications</Link></div>;
}
