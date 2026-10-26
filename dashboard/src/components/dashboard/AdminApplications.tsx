"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";
import { applicationStatuses } from "@/lib/display";
import { DataTable, PageHeader, Panel, PreviewNotice, StatusBadge, type TableColumn } from "@/components/ui/DashboardUI";
import type { AdminApplication } from "@/lib/admin-models";

export function AdminApplications() {
  const { applications, orders, clients, companies } = useAdminDemo();
  const applicationClient = (id: string) => clients.find((item) => item.id === id);
  const applicationCompany = (id: string) => companies.find((item) => item.id === id);
  const [status, setStatus] = useState("all");
  const [state, setState] = useState("all");
  const [service, setService] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const rows = useMemo(() => applications.filter((item) =>
    (status === "all" || item.status === status) &&
    (state === "all" || item.state === state) &&
    (service === "all" || item.packageName === service) &&
    (!from || (item.submittedAt != null && item.submittedAt >= from)) &&
    (!to || (item.submittedAt != null && item.submittedAt <= to))
  ).sort((a, b) => sort === "oldest" ? (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "") : sort === "company" ? a.preferredName.localeCompare(b.preferredName) : (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")), [applications, status, state, service, from, to, sort]);
  const columns: TableColumn<AdminApplication>[] = [
    { heading: "Application ID", render: (item) => <strong>{item.id}</strong> },
    { heading: "Customer", render: (item) => applicationClient(item.clientId)?.name ?? "—" },
    { heading: "Company", render: (item) => applicationCompany(item.companyId)?.name ?? "—" },
    { heading: "State", render: (item) => item.state },
    { heading: "Package", render: (item) => item.packageName },
    { heading: "Payment", render: (item) => <StatusBadge status={orders.find((order) => order.applicationId === item.id)?.paymentStatus ?? "Pending"} /> },
    { heading: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { heading: "Submitted", render: (item) => item.submittedAt ?? "Draft" },
    { heading: "Action", render: (item) => <Link className="table-link" href={`/admin/applications/${item.id}`}>View Details <ArrowRight size={14} /></Link> },
  ];
  return <><PageHeader eyebrow="FORMATION WORKFLOW" title="Applications" description="Search, filter, and review US LLC formation applications." /><Panel title="All applications" subtitle={`${rows.length} matching record${rows.length === 1 ? "" : "s"}`}><div className="admin-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{applicationStatuses.map((item) => <option key={item}>{item}</option>)}</select></label><label>Formation state<select value={state} onChange={(event) => setState(event.target.value)}><option value="all">All states</option>{[...new Set(applications.map((item) => item.state))].sort().map((item) => <option key={item}>{item}</option>)}</select></label><label>Package<select value={service} onChange={(event) => setService(event.target.value)}><option value="all">All packages</option><option>Basic LLC Formation</option><option>Premium All-In</option></select></label><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="company">Company A–Z</option></select></label><button className="button button-secondary" onClick={() => { setStatus("all"); setState("all"); setService("all"); setFrom(""); setTo(""); setSort("newest"); }}><RotateCcw size={15} /> Reset</button></div><DataTable rows={rows} columns={columns} queryPlaceholder="Search ID, company or customer..." searchMatcher={(item, query) => `${item.id} ${item.preferredName} ${applicationClient(item.clientId)?.name ?? ""} ${applicationCompany(item.companyId)?.name ?? ""}`.toLowerCase().includes(query)} /></Panel><PreviewNotice>Search and filters apply to loaded application records.</PreviewNotice></>;
}
