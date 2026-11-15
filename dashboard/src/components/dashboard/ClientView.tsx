"use client";
import {InvoiceCenter} from "./InvoiceCenter";
/* eslint-disable @next/next/no-html-link-for-pages -- Google OAuth requires a full browser redirect. */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { MarketingPreference } from "./MarketingPreference";
import { AccountSecurity } from "@/components/dashboard/AccountSecurity";
import { GoogleOAuthAlert } from "@/components/forms/GoogleOAuthAlert";
import { EmailVerificationEnrollment } from "@/components/dashboard/EmailVerificationEnrollment";
import { SupportCenter } from "@/components/dashboard/SupportCenter";
import { AdditionalServices } from "@/components/dashboard/AdditionalServices";
import { BillingActions } from "@/components/dashboard/BillingActions";
import { PricingSummary } from "@/components/forms/PricingSummary";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";
import { ClientDocumentCenter } from "@/components/dashboard/ClientDocumentCenter";
import { DocumentRequests } from "@/components/dashboard/DocumentRequests";
import { ClientReference } from "@/components/dashboard/ClientReference";
import { useClientDemo, type ClientRecord } from "@/components/dashboard/ClientDemoContext";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge, type TableColumn } from "@/components/ui/DashboardUI";

const titles: Record<string, string> = { invoices:"Invoices", dashboard: "Dashboard", companies: "My Companies", applications: "My Applications", orders: "Orders", documents: "Documents", payments: "Payments", services: "Additional Services", support: "Support", profile: "Profile", settings: "Settings", notifications: "Notifications" };
const date = (value: string) => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const usd = (cents: number | null) => cents === null ? "To Be Confirmed" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const paymentLabel = (status: string) => ({ UNPAID: "Pending", AWAITING_VERIFICATION: "Awaiting Verification", VERIFIED: "Paid", REJECTED: "Failed", REFUNDED: "Refunded", DISPUTED: "Disputed" })[status as "UNPAID"] ?? status;

function Content({ section, detailId }: { section: string; detailId?: string }) {
  const data = useClientDemo();
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseError, setResponseError] = useState("");
  const [responseSaving, setResponseSaving] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  async function submitResponse(applicationId: string) {
    setResponseSaving(true);
    setResponseError("");
    try {
      const response = await fetch(`/api/v1/client/applications/${applicationId}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: responseText }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send your response.");
      setResponseText("");
      await data.refresh();
    } catch (error) { setResponseError(error instanceof Error ? error.message : "Could not send your response."); }
    finally { setResponseSaving(false); }
  }
  const companies = [...new Map(data.applications.map((item) => [item.companyId, item.company])).values()];
  const selected = data.applications.filter((item) => item.companyId === data.companyId);
  const application = selected.find((item) => item.id === selectedApplicationId) ?? selected[0];
  const allOrders = data.applications.flatMap((item) => item.order ? [{ ...item.order, application: item }] : []);
  const orders = allOrders.filter((item) => item.application.companyId === data.companyId);
  if (data.loading) return <Panel title="Loading your workspace"><p>Loading account data…</p></Panel>;
  if (data.error) return <Panel title="Could not load your workspace"><p role="alert">{data.error}</p><button className="button button-secondary" onClick={() => void data.refresh()}>Try again</button></Panel>;

  if (section === "invoices") return <InvoiceCenter role="client" id={detailId}/>;
  if (section === "dashboard") return <CompanyDashboard application={application} applications={selected} onSelect={setSelectedApplicationId} />;

  if (section === "companies") return <><PageHeader eyebrow="COMPANY WORKSPACE" title="My Companies" description="Companies linked to your formation applications." action={{ label: "Start New Application", href: "/client/applications/new" }} /><div className="two-grid">{companies.map((company) => <Panel key={company.id} title={company.name} subtitle={company.state}><div className="detail-list"><div><span>Applications</span><strong>{data.applications.filter((item) => item.companyId === company.id).length}</strong></div></div><button className="button button-secondary client-inline-button" onClick={() => data.setCompanyId(company.id)} disabled={data.companyId === company.id}>{data.companyId === company.id ? "Selected" : "Select company"}</button></Panel>)}</div>{!companies.length && <EmptyState title="No companies yet" description="Start an application to create your first company record." />}</>;

  if (section === "applications" && detailId) {
    const item = data.applications.find((entry) => entry.id === detailId);
    if (!item) return <PageHeader title="Application not found" description="This application is not available in your account." />;
    const needsResponse = ["INFORMATION_REQUIRED", "AWAITING_CUSTOMER_CONFIRMATION", "ADDITIONAL_ACTION_REQUIRED"].includes(item.statusCode);
    const requestEvent = needsResponse ? [...item.history].reverse().find((event) => event.status === item.status) : null;
    const alreadyResponded = requestEvent ? item.responses.some((response) => response.requestEventId === requestEvent.id) : false;
    return <><div className="backline"><Link href="/client/applications">← My Applications</Link><span>/</span><span>{item.id}</span></div><PageHeader eyebrow="APPLICATION" title={item.company.name} description={`${item.company.state} · ${item.packageName} · Updated ${date(item.updatedAt)}`} /><div className="two-grid client-primary-grid"><Panel title="Current stage" action={<StatusBadge status={item.status} />}><ClientReference value={data.user?.clientReference} /><div className="detail-list"><div><span>Application ID</span><strong>{item.id}</strong></div><div><span>Internal status</span><strong>{item.status}</strong></div></div>{item.statusCode === "DRAFT" && <Link className="button button-primary client-inline-button" href={`/client/applications/new?draft=${encodeURIComponent(item.id)}`}>Continue draft <ArrowRight size={16} /></Link>}</Panel><Panel title="Status history"><ol className="client-timeline">{[...item.history].reverse().map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.status}</strong><p>{event.reason}</p><small>{date(event.date)}</small></div></li>)}</ol></Panel></div><DocumentRequests application={item} refresh={data.refresh} />{needsResponse && <Panel title="Information request" subtitle={requestEvent?.reason ?? "Apex Filings requested a response"}>{alreadyResponded ? <p className="panel-body-copy">Your response was sent. The team will review it.</p> : <div className="admin-stack"><p className="panel-body-copy">{requestEvent?.reason}</p><label className="admin-form-field">Your response<textarea rows={4} maxLength={2000} value={responseText} onChange={(event) => setResponseText(event.target.value)} placeholder="Provide the requested information" /></label>{responseError && <p role="alert">{responseError}</p>}<button className="button button-primary client-inline-button" disabled={responseSaving || responseText.trim().length < 10} onClick={() => void submitResponse(item.id)}>{responseSaving ? "Sending…" : "Send response"}</button></div>}</Panel>}{item.responses.length > 0 && <Panel title="Responses sent"><ol className="client-timeline">{item.responses.map((response) => <li key={response.id}><div><strong>{date(response.createdAt)}</strong><p style={{ whiteSpace: "pre-wrap" }}>{response.body}</p></div></li>)}</ol></Panel>}<Panel title="Documents"><div className="client-document-list">{item.documents.map((document) => <div key={document.id}><span className="concept-icon"><FileText size={18} /></span><div className="document-copy"><strong>{document.documentType.replaceAll("_", " ")}</strong><small>{document.originalFilename} · {date(document.createdAt)}</small></div><StatusBadge status={document.reviewStatus.replaceAll("_", " ")} />{document.reviewStatus === "ACCEPTED" && <a className="text-action" href={`/api/v1/documents/${document.id}`}>Download</a>}</div>)}</div>{!item.documents.length && <EmptyState title="No documents uploaded" />}</Panel></>;
  }
  if (section === "applications") {
    const columns: TableColumn<ClientRecord>[] = [{ heading: "Application", render: (item) => <strong>{item.id}</strong> }, { heading: "Company", render: (item) => item.company.name }, { heading: "Package", render: (item) => item.packageName }, { heading: "Status", render: (item) => <StatusBadge status={item.status} /> }, { heading: "Updated", render: (item) => date(item.updatedAt) }, { heading: "Action", render: (item) => <Link className="table-link" href={`/client/applications/${item.id}`}>View <ArrowRight size={14} /></Link> }];
    return <><PageHeader eyebrow="FORMATION TRACKER" title="My Applications" description="Follow your application and review status updates." action={{ label: "Start New Application", href: "/client/applications/new" }} /><Panel title="Application list"><DataTable rows={selected} columns={columns} queryPlaceholder="Search applications..." /></Panel><p className="panel-body-copy">“Approved for Filing” is an internal review decision, not government approval.</p></>;
  }
  if (section === "orders" && detailId) {
    const item = allOrders.find((order) => order.id === detailId);
    if (!item) return <PageHeader title="Order not found" description="This order is not available in your account." />;
    return <><div className="backline"><Link href="/client/orders">← Orders</Link></div><PageHeader eyebrow="ORDER DETAIL" title={item.id} description={`${item.application.company.name} · ${item.application.packageName}`} /><PricingSummary quote={item.pricingQuote ?? item.pricingSnapshot} />{item.paymentStatus === "UNPAID" && !item.stripeCheckoutStatus && <Panel title="Manual payment" subtitle="Payment details are supplied by Apex Filings after the total is confirmed"><p className="panel-body-copy" style={{ whiteSpace: "pre-wrap" }}>{item.totalCents === null ? item.pricingQuote?.pricingComplete ? "Your quoted total is ready. Order confirmation is pending." : "The final amount is being confirmed. Please wait for payment instructions." : data.paymentInstructions || "Payment instructions are not available yet. Please contact support before sending funds."}</p></Panel>}{item.invoice && <Panel title="Invoice reference" subtitle="Confirmed order record"><div className="detail-list"><div><span>Invoice</span><strong>{item.invoice.number}</strong></div><div><span>Issued</span><strong>{item.invoice.issuedAt ? date(item.invoice.issuedAt) : "Pending issue"}</strong></div></div><p className="panel-body-copy">This reference is not a payment receipt.</p></Panel>}<BillingActions orderId={item.id} /></>;
  }
  if (section === "payments") return <InvoiceCenter role="client" payments />;
  if (section === "orders") return <><PageHeader eyebrow="BILLING" title={section === "orders" ? "Orders" : "Payments"} description="View recorded orders and their verified payment status." /><div className="two-grid">{orders.map((item) => <Panel key={item.id} title={item.id} subtitle={item.application.packageName} action={<StatusBadge status={paymentLabel(item.paymentStatus)} />}><div className="detail-list"><div><span>Service fee</span><strong>{usd(item.pricingQuote?.serviceFeeCents ?? item.serviceFeeCents)}</strong></div><div><span>{item.pricingQuote?.totalCents === null ? "Known subtotal" : "Order total"}</span><strong>{usd(item.pricingQuote?.totalCents ?? item.pricingQuote?.knownSubtotalCents ?? item.totalCents)}</strong></div></div><Link className="text-action client-inline-link" href={`/client/orders/${item.id}`}>View breakdown <ArrowRight size={16} /></Link></Panel>)}</div>{!orders.length && <EmptyState title="No orders yet" description="An order is created after an application is submitted." />}</>;
  if (section === "documents") return <ClientDocumentCenter applications={selected} />;
  if (section === "services") return <AdditionalServices services={data.services} packages={data.packages} applications={data.applications} currentCompanyId={data.companyId} user={data.user} />;
  if (section === "notifications") return <NotificationCenter role="client" />;
  if (section === "profile") return <><PageHeader title="Profile" description="Your account information." /><Panel title="Personal information"><ClientReference value={data.user?.clientReference} /><div className="detail-list"><div><span>Full name</span><strong>{data.user?.fullName}</strong></div><div><span>Email</span><strong>{data.user?.email}</strong></div><div><span>Phone</span><strong>{data.user?.phone ?? "Not provided"}</strong></div><div><span>Country</span><strong>{data.user?.country ?? "Not provided"}</strong></div></div><a className="button button-secondary client-inline-button" href="/api/v1/auth/google?link=1">Link a Google account</a></Panel></>;
  if (section === "support") return <><ClientReference value={data.user?.clientReference} /><SupportCenter key={data.companyId} role="client" selectedCompanyId={data.companyId} /></>;
  if (section === "settings") return <><PageHeader title="Settings" description="Manage your account and dashboard preferences." /><Panel title="Appearance"><div className="client-choice-row">{(["light", "dark"] as const).map((option) => <button key={option} className={`button ${theme === option ? "button-primary" : "button-secondary"}`} onClick={() => { document.documentElement.dataset.dashboardTheme = option; localStorage.setItem("apex-dashboard-theme", option); setTheme(option); }}>{option === "light" ? "Light" : "Dark"}</button>)}</div></Panel><Panel title="Connected accounts"><a className="button button-secondary client-inline-button" href="/api/v1/auth/google?link=1">Link a Google account</a></Panel><Panel title="Account security"><EmailVerificationEnrollment /><AccountSecurity /></Panel><MarketingPreference/></>;
  return <PageHeader title="Page not found" description="Choose a page from the navigation." />;
}

export function ClientView({ section, detailId, oauthError }: { section: string; detailId?: string; oauthError?: string }) {
  return <DashboardShell role="client" title={titles[section] ?? "Not Found"}>{section === "profile" && <GoogleOAuthAlert code={oauthError} context="settings" />}<Content section={section} detailId={detailId} /></DashboardShell>;
}
