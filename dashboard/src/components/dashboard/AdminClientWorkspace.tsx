"use client";
import {InvoiceCenter} from "./InvoiceCenter";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";
import { PageHeader, Panel, StatusBadge } from "@/components/ui/DashboardUI";
import { ClientReference } from "./ClientReference";
import { AdminApplicationDetail } from "@/components/dashboard/AdminApplicationDetail";

type ClientDetail = { id:string; clientReference:string|null; fullName:string; email:string; phone:string|null; status:string; createdAt:string; companies:{id:string;preferredName:string;formationState:string}[]; applications:{id:string}[]; emailVerifiedAt: string | null; verificationRequired: boolean; supportTickets: { id: string; subject: string; status: string; createdAt: string }[] };
const tabs = ["Overview", "Companies", "Applications", "Documents", "Orders & Payments", "Invoices", "Activity", "Support"] as const;

export function AdminClientWorkspace({ id }: { id: string }) {
  const data = useAdminDemo();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [companyId, setCompanyId] = useState("");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailReady, setDetailReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("COMPANY_DOCUMENT");
  const [share, setShare] = useState(true);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const loadDetail = useCallback(async () => {
    const response = await fetch(`/api/v1/admin/clients/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.ok) setDetail((await response.json()).client);
    setDetailReady(true);
  }, [id]);
  useEffect(() => { queueMicrotask(() => { void loadDetail(); }); }, [loadDetail]);
  const currentDetail = detail?.id === id ? detail : null;
  // Exact reference search can find accounts beyond the snapshot's display limit.
  const client = data.clients.find((item) => item.id === id) ?? (currentDetail ? {id:currentDetail.id,clientReference:currentDetail.clientReference,name:currentDetail.fullName,email:currentDetail.email,phone:currentDetail.phone??'—',registeredAt:currentDetail.createdAt.slice(0,10),status:currentDetail.status==='ACTIVE'?'Active':'On Hold',companyIds:currentDetail.companies.map(c=>c.id)} : null);
  if (data.loading || (!client && !detailReady)) return <Panel title="Loading customer">Loading customer records…</Panel>;
  if (!client) return <PageHeader title="Client not found" description="This customer is not available." />;
  const companies = currentDetail ? currentDetail.companies.map(c=>({id:c.id,name:c.preferredName,state:c.formationState,clientId:id,type:'US LLC' as const})) : data.companies.filter((item) => item.clientId === id);
  const chosen = companies.some((item) => item.id === companyId) ? companyId : (companies[0]?.id ?? "");
  const applications = data.applications.filter((item) => item.clientId === id && (!chosen || item.companyId === chosen));
  const applicationIds = new Set(applications.map((item) => item.id));
  const documents = data.documents.filter((item) => applicationIds.has(item.applicationId));
  const orders = data.orders.filter((item) => applicationIds.has(item.applicationId));
  const orderIds = new Set(orders.map((item) => item.id));
  const payments = data.payments.filter((item) => orderIds.has(item.orderId));
  const events = data.statusEvents.filter((item) => applicationIds.has(item.applicationId));
  const applicationId = applications.some((item) => item.id === selectedAppId) ? selectedAppId : (applications[0]?.id ?? "");
  async function upload() {
    if (!applicationId || !file) return;
    setBusy(true); setNotice("");
    const payload = new FormData();
    payload.set("applicationId", applicationId);
    payload.set("documentType", documentType);
    payload.set("finalDocument", "true");
    payload.set("shareWithClient", String(share));
    payload.set("file", file);
    try {
      const response = await fetch("/api/v1/documents/upload", { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      await data.refresh(); setFile(null);
      setNotice(share ? "Document shared and customer notification queued." : "Document saved for internal use only.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function toggleVisibility(documentId: string, clientVisible: boolean) {
    setNotice("");
    const response = await fetch(`/api/v1/admin/documents/${encodeURIComponent(documentId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientVisible: !clientVisible }) });
    if (response.ok) { await data.refresh(); setNotice(clientVisible ? "Document is now internal only." : "Document shared and customer notification queued."); }
    else { const result = await response.json(); setNotice(result.error ?? "Could not change document visibility."); }
  }
  return <>
    <div className="backline"><Link href="/admin/clients">← Clients</Link><span>/</span><span>{client.name}</span></div>
    <PageHeader eyebrow="CUSTOMER WORKSPACE" title={client.name} description={`${client.email} · ${client.status}`} /><ClientReference value={client.clientReference} />
    <div className="two-grid"><Panel title="Customer details"><div className="detail-list"><div><span>Email</span><strong>{client.email}</strong></div><div><span>Phone</span><strong>{client.phone}</strong></div><div><span>Registered</span><strong>{client.registeredAt}</strong></div><div><span>Verification</span><strong>{detail ? (detail.emailVerifiedAt ? "Verified" : detail.verificationRequired ? "Pending" : "Existing account") : "Loading…"}</strong></div><div><span>Companies</span><strong>{companies.length}</strong></div><div><span>Applications</span><strong>{data.applications.filter((item) => item.clientId === id).length}</strong></div></div></Panel><Panel title="Selected company"><label className="admin-form-field">Company<select value={chosen} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{companies.find((item) => item.id === chosen) && <p>{companies.find((item) => item.id === chosen)!.state} · US LLC</p>}{applications[0] && <><StatusBadge status={applications[0].status} /><p><Link className="text-action" href={`/admin/applications/${applicationId}`}>Manage application <ArrowRight size={15} /></Link></p></>}</Panel></div>
    <div className="admin-filters" role="tablist" aria-label="Customer workspace tabs">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={`button ${tab === item ? "button-primary" : "button-secondary"}`} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Invoices" && <InvoiceCenter role="admin" customerId={id}/>}
    {tab === "Overview" && <div className="two-grid"><Panel title="Current applications">{applications.map((item) => <div className="admin-row admin-subcard" key={item.id}><div><strong>{item.preferredName}</strong><p>{item.packageName} · {item.state}</p></div><StatusBadge status={item.status} /></div>)}{!applications.length && <p>No applications for this company.</p>}</Panel><Panel title="Recent status events">{events.slice(-5).reverse().map((item) => <div className="admin-subcard" key={item.id}><strong>{item.status}</strong><p>{item.reason}</p><small>{item.date}</small></div>)}{!events.length && <p>No status events yet.</p>}</Panel></div>}
    {tab === "Companies" && <Panel title="Customer companies">{companies.map((item) => <div className="admin-row admin-subcard" key={item.id}><div><strong>{item.name}</strong><p>{item.state} · {item.type}</p></div><button className="table-link" onClick={() => { setCompanyId(item.id); setTab("Applications"); }}>Select</button></div>)}{!companies.length && <p>No company records.</p>}</Panel>}
    {tab === "Applications" && <><Panel title="Applications"><div className="admin-stack">{applications.map((item) => <div className="admin-row admin-subcard" key={item.id}><div><strong>{item.preferredName}</strong><p>{item.id} · {item.packageName} · {item.state}</p><StatusBadge status={item.status} /></div><button className="table-link" onClick={() => setSelectedAppId(item.id)}>{applicationId === item.id ? "Selected" : "Manage here"}</button></div>)}{!applications.length && <p>No applications for this company.</p>}</div></Panel>{applicationId && <AdminApplicationDetail id={applicationId} />}</>}
    {tab === "Documents" && <><Panel title="Company documents"><div className="admin-stack">{documents.map((item) => <div className="admin-row admin-subcard" key={item.id}><FileText size={18} /><div><strong>{item.name}</strong><p>{item.type.replaceAll("_", " ")} · {item.uploadedBy} · {item.uploadedAt}</p><small>{item.clientVisible ? "Shared with client" : "Internal only"} · {item.status}</small></div><a className="table-link" href={`/api/v1/documents/${item.id}`}>Download</a>{item.uploadedBy === "Admin" && item.status === "Completed Company Document" && <button className="table-link" onClick={() => void toggleVisibility(item.id, item.clientVisible)}>{item.clientVisible ? "Make internal" : "Share with client"}</button>}</div>)}{!documents.length && <p>No documents for this company.</p>}</div></Panel><Panel title="Upload a company document" subtitle="Private storage; sharing queues a customer notification and email"><div className="form-grid"><label>Application<select value={applicationId} onChange={(event) => setSelectedAppId(event.target.value)}>{applications.map((item) => <option key={item.id} value={item.id}>{item.preferredName} · {item.id}</option>)}</select></label><label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="COMPANY_DOCUMENT">Company document</option><option value="CERTIFICATE_OF_FORMATION">Certificate of Formation</option><option value="ARTICLES_OF_ORGANIZATION">Articles of Organization</option><option value="OPERATING_AGREEMENT">Operating Agreement</option><option value="EIN_CONFIRMATION">EIN confirmation</option><option value="FILING_RECEIPT">Filing receipt</option></select></label><label>PDF, JPEG or PNG<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label></div><label className="admin-form-field"><input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} /> Share with client and notify</label><button className="button button-primary" disabled={!applicationId || !file || busy} onClick={() => void upload()}>{busy ? "Uploading…" : "Upload document"}</button>{notice && <p role="status">{notice}</p>}</Panel></>}
    {tab === "Orders & Payments" && <Panel title="Orders and payments">{orders.map((item) => <div className="admin-row admin-subcard" key={item.id}><div><strong>{item.id}</strong><p>{item.paymentStatus} · {item.date}</p><small>{payments.filter((payment) => payment.orderId === item.id).length} payment record(s)</small></div><Link className="table-link" href={`/admin/orders/${item.id}`}>Open</Link></div>)}{!orders.length && <p>No orders for this company.</p>}</Panel>}
    {tab === "Activity" && <Panel title="Status and review history">{events.slice().reverse().map((item) => <div className="admin-subcard" key={item.id}><strong>{item.status}</strong><p>{item.reason}</p><small>{item.date} · {item.applicationId}</small></div>)}{!events.length && <p>No recorded status changes.</p>}</Panel>}
    {tab === "Support" && <Panel title="Customer support requests">{detail?.supportTickets.map((item) => <div className="admin-row admin-subcard" key={item.id}><div><strong>{item.subject}</strong><p>{item.status} · {new Date(item.createdAt).toLocaleDateString()}</p></div><Link className="table-link" href={`/admin/support#ticket-${encodeURIComponent(item.id)}`}>Open</Link></div>)}{!detail?.supportTickets.length && <p>No support requests.</p>}</Panel>}
  </>;
}
