"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClientReference } from "./ClientReference";
import { useAdminDemo, reviewChecks } from "@/components/dashboard/AdminDemoContext";
import { AdminField, AdminTabs, DemoDialog, DemoOnlyLine } from "@/components/dashboard/AdminUI";
import { applicationStatuses, displayFee, money } from "@/lib/display";
import { PageHeader, Panel, PreviewNotice, StatusBadge } from "@/components/ui/DashboardUI";
import type { ApplicationStatus } from "@/lib/client-models";
import { AdminDocumentRequestForm } from "@/components/dashboard/AdminDocumentRequestForm";

export function AdminApplicationDetail({ id }: { id: string }) {
  const { applications, documents, orders, clients, companies, statusEvents, notes, customerResponses, checks, canApprove, changeStatus, addNote, toggleCheck, reviewDocument } = useAdminDemo();
  const item = applications.find((row) => row.id === id);
  const [tab, setTab] = useState("Company");
  const [dialog, setDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>("Under Review");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [note, setNote] = useState("");
  if (!item) return <><PageHeader title="Application not found" description="This application does not exist." /><Link className="button button-secondary" href="/admin/applications">Back to applications</Link></>;
  const client = clients.find((row) => row.id === item.clientId);
  const company = companies.find((row) => row.id === item.companyId);
  const order = orders.find((row) => row.applicationId === id);
  const files = documents.filter((row) => row.applicationId === id);
  const events = statusEvents.filter((row) => row.applicationId === id).slice().reverse();
  function openStatusDialog(status: ApplicationStatus) {
    setNextStatus(status); setReason(""); setError(""); setDialog(true);
  }
  async function saveStatus() {
    if (savingStatus) return;
    if (reason.trim().length < 3) { setError("Enter a reason of at least 3 characters."); return; }
    setSavingStatus(true); setError("");
    try {
      await changeStatus(id, nextStatus, reason.trim());
      setReason(""); setDialog(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status could not be updated. Check the allowed transition and its requirements.");
    } finally { setSavingStatus(false); }
  }
  return <>
    <div className="backline"><Link href="/admin/applications">← Applications</Link><span>/</span><span>{id}</span></div>
    <PageHeader eyebrow="APPLICATION REVIEW" title={company?.name ?? item.preferredName} description={`${id} · ${client?.name ?? "Unknown client"} · ${item.submittedAt ?? "Draft"}`} />
    <ClientReference value={client?.clientReference} /><div className="detail-banner"><div><span className="eyebrow">CURRENT STATUS</span><StatusBadge status={item.status} /></div><div><span className="eyebrow">FORMATION STATE</span><strong>{item.state}</strong></div><div><span className="eyebrow">PACKAGE</span><strong>{item.packageName}</strong></div><div><span className="eyebrow">PAYMENT</span><StatusBadge status={order?.paymentStatus ?? "Pending"} /></div></div>
    <div className="two-grid application-review-grid">
      <Panel><AdminTabs names={["Company", "Owners", "Documents", "Order & Payment", "Customer Responses", "Internal Notes", "History"]} value={tab} onChange={setTab} label="Application details" />
        {tab === "Company" && <div className="admin-detail-fields"><AdminField label="Preferred name" value={item.preferredName} /><AdminField label="Alternative names" value={item.alternatives.join(", ") || "None"} /><AdminField label="State" value={item.state} /><AdminField label="Business activity" value={item.businessActivity} /><AdminField label="Description" value={item.description} /><AdminField label="Address requirement" value={item.addressRequirement} /><AdminField label="Number of owners" value={item.owners.length} /><AdminField label="Management" value={item.management} /><AdminField label="Additional services" value={item.additionalServices.join(", ") || "None"} /><AdminField label="Customer confirmation" value={item.customerConfirmed ? "Received" : "Awaiting customer"} /></div>}
        {tab === "Owners" && <div className="admin-stack">{item.owners.map((owner) => <div className="admin-subcard" key={owner.id}><h3>{owner.name}</h3><div className="admin-detail-fields"><AdminField label="Email" value={owner.email} /><AdminField label="Phone" value={owner.phone} /><AdminField label="Nationality" value={owner.nationality} /><AdminField label="Residence" value={owner.residence} /><AdminField label="Residential address" value={owner.address} /><AdminField label="Ownership" value={`${owner.ownership}%`} /></div></div>)}</div>}
        {tab === "Documents" && <div className="admin-stack"><AdminDocumentRequestForm applicationId={id} owners={item.owners} />{files.length ? files.map((file) => <div className="admin-subcard" key={file.id}><div className="admin-row"><div><strong>{file.name}</strong><p>{file.type} · {file.relatedOwner ?? "Company"}</p></div><StatusBadge status={file.status} /></div><p>Added: {file.uploadedAt ?? "Not provided"} · Reviewed by: {file.reviewedBy ?? "—"}</p><div className="admin-inline-actions"><a className="button button-secondary" href={`/api/v1/documents/${file.id}`}>Download privately</a><button className="button button-secondary" disabled={!file.uploadedAt || file.status !== "Under Review"} onClick={() => reviewDocument(file.id, "Accepted")}>Accept</button>{file.status === "Under Review" && <Link className="button button-secondary" href="/admin/documents">Request replacement in document queue</Link>}<button className="button button-secondary" disabled={file.status !== "Required" && file.status !== "Not Provided"} onClick={() => openStatusDialog("Information Required")}>Request missing document</button></div></div>) : <p>No documents for this application.</p>}<DemoOnlyLine>Files are private. Authorized owners can download a submitted document for review.</DemoOnlyLine></div>}
        {tab === "Order & Payment" && <div className="admin-detail-fields"><AdminField label="Order" value={order ? <Link href={`/admin/orders/${order.id}`}>{order.id} <ArrowRight size={13} /></Link> : "No order"} /><AdminField label="Service fee" value={order ? money(order.serviceFee) : "—"} /><AdminField label="Government filing fee" value={order ? displayFee(order.governmentFee) : "—"} /><AdminField label="Additional fee" value={order ? displayFee(order.additionalFee) : "—"} /><AdminField label="Third-party fee" value={order ? displayFee(order.thirdPartyFee) : "—"} /><AdminField label="Discount" value={order ? displayFee(order.discount) : "—"} /><AdminField label="Payment status" value={<StatusBadge status={order?.paymentStatus ?? "Pending"} />} /></div>}
        {tab === "Customer Responses" && <div className="admin-stack">{(customerResponses[id] ?? []).map((response) => <div className="admin-subcard" key={response.id}><strong>{new Date(response.createdAt).toLocaleString()}</strong><p style={{ whiteSpace: "pre-wrap" }}>{response.body}</p></div>)}{!(customerResponses[id] ?? []).length && <p>No customer responses yet.</p>}</div>}{tab === "Internal Notes" && <div className="admin-stack"><label className="admin-form-field">Add an internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Internal note" /></label><button className="button button-secondary" disabled={!note.trim()} onClick={() => { addNote(id, note); setNote(""); }}>Save note</button>{(notes[id] ?? []).map((text, index) => <div className="admin-subcard" key={`${index}-${text}`}>{text}<small></small></div>)}<DemoOnlyLine>Notes and actions are stored in the audit history.</DemoOnlyLine></div>}
        {tab === "History" && <div className="timeline">{events.map((event) => <div key={event.id}><span /><strong>{event.status}</strong><p>{event.reason}</p><small>{event.date}</small></div>)}</div>}
      </Panel>
      <Panel title="Review workflow" subtitle="Owner review actions"><p className="admin-muted">Approve for Filing is an internal decision, separate from submission or approval by a government authority.</p><div className="admin-checklist">{reviewChecks.map((check) => <label key={check}><input type="checkbox" checked={checks[id]?.includes(check) ?? false} onChange={() => toggleCheck(id, check)} />{check}</label>)}</div><div className="admin-review-state"><StatusBadge status={canApprove(id) ? "Ready for internal approval" : "Approval checks incomplete"} /></div><div className="review-actions"><button className="button button-secondary" onClick={() => openStatusDialog("Information Required")}>Request information</button><button className="button button-secondary" onClick={() => openStatusDialog(item.status)}>Change status</button><button className="button button-primary" disabled={!canApprove(id)} onClick={() => openStatusDialog("Approved for Filing")}>Approve for filing</button></div><DemoOnlyLine>Status changes create in-app notifications. Government filing remains a separate action.</DemoOnlyLine></Panel>
    </div>
    <PreviewNotice>Owner actions are recorded in the dashboard database and audit history.</PreviewNotice>
    <DemoDialog className="application-status-dialog" open={dialog} onClose={() => { setDialog(false); setError(""); }} title="Update application status"><div className="admin-dialog-body"><AdminField label="Current status" value={<StatusBadge status={item.status} />} /><fieldset className="status-choice-fieldset"><legend>New status</legend><div className="status-choice-list">{applicationStatuses.map((status) => <label key={status}><input type="radio" name="application-status" value={status} checked={nextStatus === status} onChange={() => { setNextStatus(status); setError(""); }} /><span>{status}</span></label>)}</div></fieldset><label className="admin-form-field">Reason for change<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} placeholder="Required reason for this change" /></label><div className="admin-subcard"><strong>Workflow note</strong><p>{nextStatus === "Payment Received" ? "Requires a payment already verified in the Payments workflow. This status form never records or verifies a payment." : nextStatus === "Refund Requested" ? "Requires an existing refund request. Create or review the request in Payments; this status form does not create one." : nextStatus === "Refunded" ? "Requires a completed, confirmed full refund from the Payments workflow. This status form never issues a refund." : nextStatus === "Approved for Filing" ? "Approval requires the completed review checklist, client confirmation, accepted documents, and verified payment." : `The client will be notified if ${nextStatus} is saved.`}</p></div>{error && <p className="admin-error" role="alert">{error}</p>}<div className="admin-inline-actions status-dialog-actions"><button className="button button-secondary" type="button" disabled={savingStatus} onClick={() => setDialog(false)}>Cancel</button><button className="button button-primary" type="button" disabled={savingStatus || nextStatus === item.status} onClick={() => void saveStatus()}>{savingStatus ? "Saving…" : "Confirm change"}</button></div></div></DemoDialog>
  </>;
}
