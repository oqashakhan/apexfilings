"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, Pencil } from "lucide-react";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";
import { AdminField, AdminTabs, DemoDialog, DemoOnlyLine } from "@/components/dashboard/AdminUI";
import { displayFee, money } from "@/lib/display";
import { demoRolePermissions } from "@/lib/permissions";
import { DataTable, PageHeader, Panel, PreviewNotice, StatusBadge, type TableColumn } from "@/components/ui/DashboardUI";
import type { AdminContentItem, AdminPackage, AdminService, AdminStateFee } from "@/lib/admin-models";

export function AdminServices() {
  const { services, packages, stateFees, updateServiceDraft, updatePackageDraft } = useAdminDemo();
  const [tab, setTab] = useState("Services");
  const [edit, setEdit] = useState<AdminService | null>(null);
  const [description, setDescription] = useState("");
  const [packageEdit, setPackageEdit] = useState<AdminPackage | null>(null);
  const [packageName, setPackageName] = useState("");
  const [packageFee, setPackageFee] = useState("");
  const [packageInclusions, setPackageInclusions] = useState("");
  const columns: TableColumn<AdminService>[] = [
    { heading: "Service", render: (row) => <strong>{row.name}</strong> }, { heading: "Category", render: (row) => row.category },
    { heading: "Packages", render: (row) => row.packages.join(", ") || "Separate inquiry" }, { heading: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { heading: "Action", render: (row) => <button className="table-link" onClick={() => { setEdit(row); setDescription(row.description); }}><Pencil size={14} /> Draft edit</button> },
  ];
  const feeColumns: TableColumn<AdminStateFee>[] = [
    { heading: "State", render: (row) => <strong>{row.state}</strong> }, { heading: "Code", render: (row) => row.code }, { heading: "Estimated filing fee", render: (row) => displayFee(row.filingFee) },
    { heading: "Additional fees", render: (row) => row.additionalFees ?? "To Be Confirmed" }, { heading: "Last verified", render: (row) => row.lastUpdated ?? "To Be Confirmed" },
  ];
  return <><PageHeader eyebrow="CATALOG MANAGEMENT" title="Services & Pricing" description="Review configured services, approved US LLC package fees, and state filing-fee settings." /><Panel title="Catalog" subtitle="Changes save to the dashboard database"><AdminTabs names={["Services", "Packages", "State Filing Fees"]} value={tab} onChange={setTab} label="Catalog areas" />{tab === "Services" ? <DataTable rows={services} columns={columns} queryPlaceholder="Search services..." /> : tab === "Packages" ? <div className="two-grid">{packages.map((pack) => <div className="admin-subcard" key={pack.id}><h3>{pack.name}</h3><strong className="catalog-price">{money(pack.serviceFee)}</strong><p>+ applicable government filing fee</p><ul>{pack.includedServices.map((service) => <li key={service}>{service}</li>)}</ul><StatusBadge status={pack.available ? "Available" : "On Hold"} /><button className="button button-secondary" onClick={() => { setPackageEdit(pack); setPackageName(pack.name); setPackageFee(String(pack.serviceFee)); setPackageInclusions(pack.includedServices.join("\n")); }}><Pencil size={15} /> Edit package</button></div>)}</div> : <><p className="admin-muted">Government filing fees remain unconfigured until a verified source and date are recorded.</p><DataTable rows={stateFees} columns={feeColumns} queryPlaceholder="Search all 50 states and DC..." /></>}</Panel><PreviewNotice>Dashboard catalog changes are audited. They do not update the separate public website.</PreviewNotice><DemoDialog open={edit != null} onClose={() => setEdit(null)} title="Edit service draft"><div className="admin-dialog-body">{edit && <><AdminField label="Service" value={edit.name} /><label className="admin-form-field">Description draft<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} /></label><div className="admin-inline-actions"><button className="button button-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="button button-primary" disabled={!description.trim()} onClick={() => { updateServiceDraft(edit.id, description); setEdit(null); }}>Save changes</button></div><DemoOnlyLine>Saved service changes persist in the dashboard database; the public website is separate.</DemoOnlyLine></>}</div></DemoDialog><DemoDialog open={packageEdit != null} onClose={() => setPackageEdit(null)} title="Edit package draft"><div className="admin-dialog-body">{packageEdit && <><label className="admin-form-field">Package name<input value={packageName} onChange={(event) => setPackageName(event.target.value)} /></label><label className="admin-form-field">Service fee in USD<input type="number" min="0" value={packageFee} onChange={(event) => setPackageFee(event.target.value)} /></label><label className="admin-form-field">Included services, one per line<textarea rows={5} value={packageInclusions} onChange={(event) => setPackageInclusions(event.target.value)} /></label><p className="admin-muted">Government and third-party fees remain separate and unconfirmed.</p><div className="admin-inline-actions"><button className="button button-secondary" onClick={() => setPackageEdit(null)}>Cancel</button><button className="button button-primary" disabled={!packageName.trim() || !packageFee || Number(packageFee) < 0} onClick={() => { updatePackageDraft(packageEdit.id, { ...packageEdit, name: packageName.trim(), serviceFee: Number(packageFee), includedServices: packageInclusions.split("\n").map((item) => item.trim()).filter(Boolean) }); setPackageEdit(null); }}>Save changes</button></div><DemoOnlyLine>Changes persist in the dashboard database and do not alter public-site pricing.</DemoOnlyLine></>}</div></DemoDialog></>;
}

export function AdminWebsiteContent() {
  const { content, updateContentDraft } = useAdminDemo();
  const [edit, setEdit] = useState<AdminContentItem | null>(null);
  const [draft, setDraft] = useState("");
  return <><PageHeader eyebrow="CONTENT WORKSPACE" title="Website Content" description="Prepare and preview copy drafts without changing the live Apex Filings website." /><div className="two-grid">{content.map((item) => <Panel key={item.id} title={item.title} subtitle={item.summary}><span className="small-pill">{item.area}</span><p className="admin-content-preview">{item.draft}</p><button className="button button-secondary" onClick={() => { setEdit(item); setDraft(item.draft); }}><Pencil size={15} /> Edit draft</button></Panel>)}</div><PreviewNotice>Drafts are stored in the dashboard database. Publishing to the public website is not connected.</PreviewNotice><DemoDialog open={edit != null} onClose={() => setEdit(null)} title="Edit content draft"><div className="admin-dialog-body">{edit && <><AdminField label="Area" value={edit.area} /><label className="admin-form-field">Draft copy<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} /></label><div className="admin-subcard"><strong>Plain-text preview</strong><p>{draft || "Empty draft"}</p></div><div className="admin-inline-actions"><button className="button button-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="button button-primary" disabled={!draft.trim()} onClick={() => { updateContentDraft(edit.id, draft); setEdit(null); }}>Save draft</button><button className="button button-secondary" disabled title="Publishing needs backend review and approval">Publish unavailable</button></div></>}</div></DemoDialog></>;
}

export function AdminNotifications() {
  const { notifications, toggleNotificationRead } = useAdminDemo();
  const [filter, setFilter] = useState("All");
  const rows = notifications.filter((item) => filter === "All" || (filter === "Unread" ? !item.read : item.read));
  return <><PageHeader eyebrow="WORKSPACE INBOX" title="Notifications" description="Track application and payment updates." /><Panel title="Updates" subtitle={`${notifications.filter((item) => !item.read).length} unread notifications`}><div className="admin-filters"><label>Show<select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Unread</option><option>Read</option></select></label></div><div className="admin-stack">{rows.map((item) => <div className={`admin-row admin-subcard ${item.read ? "is-read" : ""}`} key={item.id}><div className="admin-notice-copy"><Bell size={18} /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.date}</small></div></div><div className="admin-inline-actions">{item.applicationId && <Link className="table-link" href={`/admin/applications/${item.applicationId}`}>Open <ArrowRight size={14} /></Link>}<button className="table-link" onClick={() => toggleNotificationRead(item.id)}>{item.read ? "Read" : <><Check size={14} /> Mark read</>}</button></div></div>)}{!rows.length && <p>No notifications match this filter.</p>}</div></Panel><PreviewNotice>In-app notifications are stored. Email, SMS, and push delivery are not configured.</PreviewNotice></>;
}

export function AdminSettings() {
  const [tab, setTab] = useState("Profile");
  return <><PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Review owner workspace settings and integration boundaries." /><Panel title="Admin settings" subtitle="Account and system details"><AdminTabs names={["Profile", "Notifications", "Theme", "Security", "Contact", "Payment Instructions", "Integrations", "Permissions"]} value={tab} onChange={setTab} label="Settings areas" />{tab === "Profile" && <div className="admin-detail-fields"><AdminField label="Workspace" value="Apex Filings" /><AdminField label="Signed-in role" value="Owner / Admin" /><AdminField label="Data source" value="PostgreSQL" /><a className="button button-secondary" href="/api/v1/auth/google?link=1">Link a Google account</a></div>}{tab === "Notifications" && <p className="admin-muted">Configure email preferences on the Notifications page. Transactional email is queued and sent when Resend is configured.</p>}{tab === "Theme" && <p className="admin-muted">Use the existing dashboard theme control in the top bar. Theme preferences remain a UI setting.</p>}{tab === "Security" && <div className="admin-detail-fields"><AdminField label="Authentication" value="Database-backed sessions" /><AdminField label="Audit log" value="Recorded in PostgreSQL" /><AdminField label="Document access" value="Private document storage" /></div>}{tab === "Contact" && <div className="admin-detail-fields"><AdminField label="Support email" value="info@apexfilings.com" /><AdminField label="US phone" value="+1 (682) 286-4111" /></div>}{tab === "Payment Instructions" && <PaymentInstructionsEditor />}{tab === "Integrations" && <div className="admin-detail-fields"><AdminField label="Payment gateway" value="Provider to be confirmed" /><AdminField label="Email provider" value="Resend, when configured" /><AdminField label="Database" value="PostgreSQL connected" /><AdminField label="Government filing" value="No integration" /></div>}{tab === "Permissions" && <div className="admin-stack">{Object.entries(demoRolePermissions).map(([role, permissions]) => <div className="admin-subcard" key={role}><strong>{role[0].toUpperCase() + role.slice(1)}</strong><p>{permissions.length ? permissions.join(" · ") : "No admin permissions"}</p></div>)}</div>}</Panel><PreviewNotice>Owner and client access is enforced on the server. Staff and partner roles are reserved for a later phase.</PreviewNotice></>;
}

function PaymentInstructionsEditor() {
  const [instructions, setInstructions] = useState("");
  const [status, setStatus] = useState("Loading payment instructions…");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/payment-instructions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load payment instructions.");
        return response.json();
      })
      .then((data) => { if (active) { setInstructions(data.instructions); setStatus(""); } })
      .catch(() => { if (active) setStatus("Could not load payment instructions."); });
    return () => { active = false; };
  }, []);
  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/v1/admin/payment-instructions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: instructions }) });
      if (!response.ok) throw new Error("Could not save payment instructions.");
      setStatus("Payment instructions saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save payment instructions."); }
    finally { setSaving(false); }
  }
  return <div className="admin-stack"><p className="admin-muted">These instructions appear to clients with a confirmed, unpaid order. Add verified payment details before accepting transfers. Leave blank to hide details.</p><label className="admin-form-field">Manual payment instructions<textarea rows={7} maxLength={3000} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Enter verified payment instructions" /></label><div className="admin-inline-actions"><button className="button button-primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save instructions"}</button>{status && <p role="status">{status}</p>}</div></div>;
}
