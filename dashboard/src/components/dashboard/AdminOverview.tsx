"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Bell, ClipboardCheck, Clock3, FileCheck2, FileText, ReceiptText } from "lucide-react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";
import { money } from "@/lib/display";
import { DataTable, EmptyState, Panel, PreviewNotice, StatCard, StatusBadge, type TableColumn } from "@/components/ui/DashboardUI";
import type { AdminApplication } from "@/lib/admin-models";

const ApplicationsChart = dynamic(() => import("@/components/charts/ApplicationsChart"), { ssr: false, loading: () => <div className="chart-skeleton" aria-label="Loading applications chart" /> });
export function AdminOverview() {
  const { applications, documents, payments, clients, companies, statusEvents, activity, loading } = useAdminDemo();
  const companyName = (id: string) => companies.find((item) => item.id === id)?.name ?? "Unknown company";
  const customerName = (id: string) => clients.find((item) => item.id === id)?.name ?? "Unknown client";
  const [month, setMonth] = useState("all");
  const reviewCount = applications.filter((item) => item.status === "Under Review").length;
  const actionCount = applications.filter((item) => ["Information Required", "Additional Action Required", "Awaiting Payment"].includes(item.status)).length;
  const paidServiceFees = payments.filter((item) => item.status === "Paid").reduce((total, item) => total + (item.amount ?? 0), 0);
  const attention = [
    { label: "Applications awaiting review", value: reviewCount, href: "/admin/applications", icon: ClipboardCheck },
    { label: "Documents requiring verification", value: documents.filter((item) => item.status === "Under Review").length, href: "/admin/documents", icon: FileCheck2 },
    { label: "Customers with missing information", value: applications.filter((item) => item.status === "Information Required").length, href: "/admin/applications", icon: FileText },
    { label: "Manual payments awaiting verification", value: payments.filter((item) => item.status === "Awaiting Verification").length, href: "/admin/payments", icon: ReceiptText },
  ];
  const recent = [...applications].filter((item) => item.submittedAt).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")).slice(0, 5);
  const columns: TableColumn<AdminApplication>[] = [
    { heading: "Application ID", render: (item) => <strong>{item.id}</strong> },
    { heading: "Customer", render: (item) => customerName(item.clientId) },
    { heading: "Company", render: (item) => companyName(item.companyId) },
    { heading: "State", render: (item) => item.state },
    { heading: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { heading: "Submitted", render: (item) => item.submittedAt ?? "Draft" },
    { heading: "Action", render: (item) => <Link className="table-link" href={`/admin/applications/${item.id}`}>View <ArrowRight size={14} /></Link> },
  ];
  return <>
    <div className="admin-welcome"><div><span className="eyebrow accent">OVERVIEW</span><h1>Dashboard Overview</h1><p>Manage your applications, clients, and business operations.</p></div><div className="admin-welcome-actions"><Link className="button button-primary" href="/admin/applications">View Applications <ArrowRight size={16} /></Link></div></div>
    <div className="stats-grid admin-summary-grid">
      <StatCard label="Total Applications" value={loading ? "…" : String(applications.length)} hint="Applications" icon={FileText} />
      <StatCard label="Pending Review" value={String(reviewCount)} hint="Under Review" icon={ClipboardCheck} tone="amber" />
      <StatCard label="Applications Requiring Action" value={String(actionCount)} hint="Information or payment needed" icon={Bell} tone="navy" />
      <StatCard label="Revenue" value={money(paidServiceFees)} hint="Verified payments" icon={ReceiptText} tone="green" />
    </div>
    <div className="overview-grid admin-overview-grid"><Panel title="Applications overview" subtitle="New and completed applications by month" action={<label className="admin-chart-filter">Period<select aria-label="Chart period" value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">Past six months</option>{Array.from({ length: 6 }, (_, index) => { const value = new Date(); value.setDate(1); value.setMonth(value.getMonth() - 5 + index); return <option key={index} value={value.toISOString().slice(0, 7)}>{value.toLocaleString("en-US", { month: "short", year: "numeric" })}</option>; })}</select></label>} className="chart-panel"><ApplicationsChart month={month} applications={applications} statusEvents={statusEvents} /></Panel><Panel title="Attention required" subtitle="Open the related queue"><div className="admin-attention-list">{attention.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.label}><span className="concept-icon"><Icon size={18} /></span><span>{item.label}</span><strong>{item.value}</strong><ArrowRight size={15} /></Link>; })}</div></Panel></div>
    <Panel title="Recent applications" subtitle="Latest submissions" action={<Link className="text-action" href="/admin/applications">View all <ArrowRight size={16} /></Link>}><DataTable rows={recent} columns={columns} queryPlaceholder="Search recent applications..." /></Panel>
    <Panel title="Recent activity" subtitle="Latest audited actions">{activity.length ? <div className="admin-activity-list">{activity.slice(-6).reverse().map((item) => <div key={item.id}><span className="activity-icon"><Clock3 size={16} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time dateTime={item.date}>{item.date}</time>{item.applicationId && <Link href={`/admin/applications/${item.applicationId}`} aria-label={`Open ${item.applicationId}`}><ArrowRight size={16} /></Link>}</div>)}</div> : <EmptyState title="No recent activity" description="Recorded actions will appear here." icon={Clock3} />}</Panel>
    <PreviewNotice>Metrics reflect recorded database activity. Revenue includes verified manual payments only.</PreviewNotice>
  </>;
}

