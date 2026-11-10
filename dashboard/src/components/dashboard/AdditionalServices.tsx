"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ClientService } from "@/components/dashboard/ClientDemoContext";
import { PageHeader, Panel } from "@/components/ui/DashboardUI";

type Company = { id: string; preferredName: string; formationState: string };
type ServiceRequest = {
  id: string; details: string; status: string; statusNote: string | null; createdAt: string;
  company: { id: string; preferredName: string };
  service: { id: string; name: string; priceCents: number | null; currency: string; priceApproved: boolean };
};
type Props = { services: ClientService[]; packages: { slug: string; name: string; includedServiceSlugs: string[]; includedServices: string[] }[]; applications: { companyId: string; packageSlug: string }[]; currentCompanyId: string; user: { fullName: string; email: string } | null };

const statusLabel = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const priceLabel = (service: ClientService) => service.priceApproved && service.priceCents != null
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: service.currency ?? "USD" }).format(service.priceCents / 100)
  : "Quote required";

export function AdditionalServices({ services, packages, applications, currentCompanyId, user }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selected, setSelected] = useState<ClientService | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestKey = useRef("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  function includedPackageFor(service: ClientService, selectedCompanyId: string) {
    const app = applications.find((application) => application.companyId === selectedCompanyId);
    const pack = packages.find((item) => item.slug === app?.packageSlug);
    return pack && (pack.includedServiceSlugs.includes(service.slug) || pack.includedServices.some((name) => name.toLowerCase() === service.name.toLowerCase())) ? pack : null;
  }

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/client/service-requests", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load service requests.");
    setCompanies(result.companies);
    setRequests(result.requests);
  }, []);

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  function open(service: ClientService) {
    setSelected(service);
    setCompanyId(companies.some((company) => company.id === currentCompanyId) ? currentCompanyId : (companies[0]?.id ?? ""));
    setDetails("");
    setError("");
    setNotice("");
    requestKey.current = crypto.randomUUID();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busyRef.current) return;
    if (!companyId || details.trim().length < 10) {
      setError("Choose a company and enter at least 10 characters of request details.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/client/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId: selected.id, companyId, details, idempotencyKey: requestKey.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Your request could not be submitted.");
      await load();
      setSelected(null);
      setNotice(`${selected.name} request submitted. The team will review it and contact you with next steps.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your request could not be submitted.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="ADDITIONAL SERVICES" title="Explore services" description="Choose a service and send a request to the Apex Filings team." />
    {notice && <p className="service-request-notice" role="status">{notice}</p>}
    {error && !selected && <p className="form-error" role="alert">{error}</p>}
    <div className="three-grid">
      {services.map((service) => {
        const includedPackage = includedPackageFor(service, currentCompanyId);
        return <Panel key={service.id} className="client-service-card">
          <span className="concept-icon"><ShieldCheck size={20} /></span>
          <div className="service-card-heading"><h3>{service.name}</h3><span>{includedPackage ? `Included in ${includedPackage.name}` : priceLabel(service)}</span></div>
          <p>{service.description}</p>
          <button className="text-action service-request-action" type="button" onClick={() => open(service)}>Contact team <ArrowRight size={15} /></button>
        </Panel>;
      })}
      {!services.length && <Panel title="No additional services available"><p className="panel-body-copy">The team will add available services here.</p></Panel>}
    </div>

    <Panel title="My Service Requests" subtitle="Requests and status updates from the Apex Filings team">
      {loading ? <p className="panel-body-copy">Loading your requests…</p> : !requests.length ? <p className="panel-body-copy">You have not submitted any service requests.</p> : <div className="admin-stack">{requests.map((request) => <article className="admin-subcard service-request-history" key={request.id}>
        <div className="admin-row"><div><strong>{request.service.name}</strong><p>{request.company.preferredName} · {new Date(request.createdAt).toLocaleDateString()}</p></div><span className="small-pill">{statusLabel(request.status)}</span></div>
        {request.statusNote && <p className="service-request-status-note">{request.statusNote}</p>}
      </article>)}</div>}
    </Panel>

    <dialog ref={dialogRef} className="client-service-dialog" aria-labelledby="service-request-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>
      {selected && <>
        <div className="client-service-dialog-head"><div><span className="eyebrow accent">SERVICE REQUEST</span><h2 id="service-request-title">Request {selected.name}</h2></div><button className="icon-button" type="button" aria-label="Close request form" onClick={() => setSelected(null)}>×</button></div>
        <form className="client-service-form" onSubmit={(event) => void submit(event)}>
          <label>Service name<input value={selected.name} readOnly /></label>
          <label>Company<select value={companyId} onChange={(event) => setCompanyId(event.target.value)} required><option value="">Choose a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.preferredName} · {company.formationState}</option>)}</select></label>
          {!companies.length && <p className="form-error" role="status">Create a company application before requesting an additional service.</p>}
          <label>Customer name<input value={user?.fullName ?? ""} readOnly /></label>
          <label>Customer email<input value={user?.email ?? ""} readOnly /></label>
          <label>Request details<textarea value={details} onChange={(event) => setDetails(event.target.value)} minLength={10} maxLength={4000} rows={5} required placeholder="Tell us what you need and any relevant timing." /></label>
          <p className="service-request-price">{includedPackageFor(selected, companyId) ? `Included in ${includedPackageFor(selected, companyId)!.name}` : priceLabel(selected)} · No order or payment is created by this request.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="client-service-form-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={busy || !companies.length}>{busy ? "Submitting…" : "Submit request"}</button></div>
        </form>
      </>}
    </dialog>
  </>;
}
