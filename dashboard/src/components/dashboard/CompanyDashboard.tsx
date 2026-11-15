"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, CreditCard, FileCheck2, Hash, Landmark, LifeBuoy, RefreshCw } from 'lucide-react';
import type { InvoiceData } from '@/lib/invoice-presentation';
import { useClientDemo, type ClientRecord } from './ClientDemoContext';
import { InvoicePaymentControl } from './InvoicePaymentControl';
import { NextActionCard } from './NextActionCard';
import { PricingSummary } from '../forms/PricingSummary';
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from '../ui/DashboardUI';

const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const money = (value: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
const labels: Record<string, string> = { NO_ORDER: 'No order yet', UNPAID: 'Unpaid', VERIFIED: 'Paid', PENDING: 'Awaiting confirmation', FAILED: 'Payment failed', EXPIRED: 'Checkout expired', CANCELLED: 'Cancelled', REVIEW_REQUIRED: 'Payment review required', DISPUTED: 'Payment disputed', REFUNDED: 'Refunded', PARTIALLY_PAID: 'Partially paid', PARTIALLY_REFUNDED: 'Partially refunded' };

function DashboardCheckout({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/invoices/${encodeURIComponent(invoiceId)}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load payment availability. Refresh to try again.');
      const result = await response.json();
      setInvoice(result.invoice);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [invoiceId]);
  return error ? <p role="alert">{error}</p> : invoice ? <InvoicePaymentControl invoice={invoice} label="Complete Payment" /> : <p role="status">Checking secure payment availability…</p>;
}

type DashboardProps = { application?: ClientRecord; applications: ClientRecord[]; onSelect: (id: string) => void };
export function CompanyDashboard(props: DashboardProps) {
  const data = useClientDemo();
  return <CompanyWorkspace {...props} data={data} />;
}

export function CompanyWorkspace({ application, applications, onSelect, data }: DashboardProps & { data: ReturnType<typeof useClientDemo> }) {
  const app = application;
  const paid = app?.payment.unlocked ?? false;
  const documents = applications.flatMap(item => item.documents).filter(doc => doc.reviewStatus === 'COMPLETED_COMPANY_DOCUMENT').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ein = documents.find(doc => doc.documentType === 'EIN_CONFIRMATION');
  const formation = documents.find(doc => ['CERTIFICATE_OF_FORMATION', 'ARTICLES_OF_ORGANIZATION'].includes(doc.documentType));
  const quote = app?.order?.pricingQuote ?? app?.order?.pricingSnapshot ?? app?.draftQuote ?? null;
  const supportHref = `/client/support${app ? `?company=${encodeURIComponent(app.companyId)}` : ''}`;
  const tickets = data.supportUpdates.filter(ticket => ticket.companyId === app?.companyId);
  const events = applications.flatMap(item => [
    ...item.history.map(event => ({ id: `status-${event.id}`, title: event.status, detail: event.reason, date: event.date, href: `/client/applications/${item.id}` })),
    ...item.paymentEvents.map(event => ({ id: `payment-${event.id}`, title: 'Payment verified', detail: null, date: event.date, href: `/client/orders/${item.order?.id}` })),
  ]).concat(documents.map(doc => ({ id: `document-${doc.id}`, title: 'Company document uploaded', detail: doc.title ?? doc.originalFilename, date: doc.createdAt, href: '/client/documents' })), tickets.map(ticket => ({ id: `support-${ticket.id}`, title: `Support: ${ticket.status.replaceAll('_', ' ')}`, detail: ticket.subject, date: ticket.updatedAt, href: `${supportHref}#ticket-${ticket.id}` }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return <div className="company-workspace" data-payment-experience={paid ? 'verified' : 'prepayment'}>
    <PageHeader eyebrow="CLIENT WORKSPACE" title={`Welcome back${data.user ? `, ${data.user.fullName.split(' ')[0]}` : ''}`} description={app ? paid ? `Manage ${app.company.name} and track your US business formation.` : `Review ${app.company.name} and complete your formation payment.` : 'Start your US company formation when you are ready.'} action={{ label: 'Start New Application', href: '/client/applications/new' }} />
    <div className="workspace-toolbar">
      {applications.length > 1 && <label>Application<select value={app?.id ?? ''} onChange={event => onSelect(event.target.value)}>{applications.map(item => <option key={item.id} value={item.id}>{item.packageName} · {item.id} · {item.status}</option>)}</select></label>}
      <button className="button button-secondary" type="button" onClick={() => void data.refresh()}><RefreshCw size={15} /> Refresh updates</button>
    </div>
    {!app ? <Panel><EmptyState title="Ready to start your business?" description="Create an application to choose your package and receive a server-calculated quote." /><Link className="button button-primary" href="/client/applications/new">Start LLC Formation</Link></Panel> : <>
      {paid && <div className="company-summary-grid">
        <StatCard label="Business name" value={app.company.name} hint={app.company.state} icon={Building2} />
        <StatCard label="Client reference" value={data.user?.clientReference ?? 'Pending'} hint="Your permanent client number" icon={Hash} />
        <StatCard label="EIN" value="Pending" hint={ein ? 'Verified details in your EIN document' : 'Awaiting verified EIN'} icon={Landmark} />
        <StatCard label="Formation status" value={app.status} hint={`${app.milestones.filter(item => item.complete).length} of ${app.milestones.length} milestones recorded`} icon={FileCheck2} />
        <StatCard label="Payment summary" value={labels[app.payment.status]} hint={`${money(app.payment.paidCents, app.order?.pricingQuote?.currency)} verified${app.payment.refundedCents ? ` · ${money(app.payment.refundedCents)} refunded` : ''}`} icon={CreditCard} tone="green" />
      </div>}
      <div className="company-workspace-columns"><div className="company-workspace-main">
        {!paid ? <>
          <Panel title="Complete your formation payment" subtitle={`${app.company.name} · ${app.company.state}`} action={<StatusBadge status={labels[app.payment.status]} />}>
            <div className="detail-list"><div><span>Package</span><strong>{app.packageName}</strong></div><div><span>Client reference</span><strong>{data.user?.clientReference ?? 'Pending'}</strong></div><div><span>Formation status</span><strong>{app.status}</strong></div></div>
            {quote && <PricingSummary quote={quote} />}
            {!!quote?.pendingItems.length && <ul className="workspace-price-issues">{quote.pendingItems.map((item, index) => <li key={index}><strong>{item.description}:</strong> {item.reason}</li>)}</ul>}
            {app.payment.status === 'PENDING' && <p role="status">Your payment is awaiting confirmation. Please do not pay again.</p>}
            {app.payment.status === 'FAILED' && <p role="status">The last payment attempt failed. Review the invoice before retrying.</p>}
            {app.payment.status === 'EXPIRED' && <p role="status">The previous Checkout expired. You can open a new secure session if payment is still due.</p>}
            {app.payment.needsReconciliation && <p role="status">Your payment records need team review. Contact support before sending another payment.</p>}
            {['DISPUTED', 'REFUNDED', 'CANCELLED', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED'].includes(app.payment.status) && <p role="status">{labels[app.payment.status]}. Contact support to review this order before making another payment.</p>}
            {!app.order ? <><p>Your application has no order yet. Submit your details to receive an invoice. No payment has been collected.</p><Link className="button button-primary" href={`/client/applications/new?draft=${encodeURIComponent(app.id)}`}>Continue application</Link></> : <>
              {app.order.invoice ? <><Link className="text-action" href={`/client/invoices/${app.order.invoice.id}`}>View invoice {app.order.invoice.number}</Link><DashboardCheckout key={`${app.order.invoice.id}-${data.revision}`} invoiceId={app.order.invoice.id} /></> : <p role="status">Payment setup pending. Your invoice must be prepared before Checkout becomes available.</p>}
              <Link className="text-action" href={`/client/orders/${app.order.id}`}>View order and payment details</Link>
            </>}
          </Panel>
          <NextActionCard application={app} />
        </> : <>
          <Panel title="Company information" subtitle="Your formation record" action={<StatusBadge status={app.status} />}>
            <dl className="workspace-information">
              <div><dt>Company name</dt><dd>{app.company.name}</dd></div><div><dt>Formation state</dt><dd>{app.company.state}</dd></div><div><dt>Business structure</dt><dd>US LLC</dd></div><div><dt>Business address</dt><dd>Not assigned</dd></div><div><dt>Client reference</dt><dd>{data.user?.clientReference ?? 'Pending'}</dd></div><div><dt>EIN status</dt><dd>{ein ? <a href={`/api/v1/documents/${ein.id}?view=1`} target="_blank" rel="noreferrer">View EIN confirmation</a> : 'Pending'}</dd></div><div><dt>Current formation stage</dt><dd>{app.status}</dd></div><div><dt>Registered company details</dt><dd>{formation ? <a href={`/api/v1/documents/${formation.id}?view=1`} target="_blank" rel="noreferrer">View approved formation document</a> : 'Pending formation'}</dd></div>
            </dl>
          </Panel>
          <NextActionCard application={app} />
        </>}
        <Panel title="Company documents" subtitle="Approved documents shared by Apex Filings">
          {documents.length ? <div className="client-documents-table-wrap"><table className="client-documents-table"><thead><tr><th scope="col">Document</th><th scope="col">Type</th><th scope="col">Uploaded</th><th scope="col">Actions</th></tr></thead><tbody>{documents.map(doc => <tr key={doc.id}><td>{doc.title ?? doc.originalFilename}{doc.description && <small className="document-description">{doc.description}</small>}</td><td>{doc.documentType.replaceAll('_', ' ')}</td><td>{date(doc.createdAt)}</td><td><span className="client-document-actions"><a className="text-action" href={`/api/v1/documents/${doc.id}?view=1`} target="_blank" rel="noreferrer" aria-label={`View ${doc.title ?? doc.originalFilename}`}>View</a><a className="text-action" href={`/api/v1/documents/${doc.id}`} aria-label={`Download ${doc.title ?? doc.originalFilename}`}>Download</a></span></td></tr>)}</tbody></table></div> : <EmptyState title="No company documents yet" description="Approved files will appear here when the team shares them with you." />}
          <Link className="text-action" href="/client/documents">View all documents</Link>
        </Panel>
        {paid && <Panel title="Formation progress" subtitle="Only milestones supported by recorded events are marked complete">
          <ol className="workspace-milestones">{app.milestones.map(item => <li key={item.label} data-complete={item.complete}><span aria-hidden="true">{item.complete ? '✓' : '○'}</span><div><strong>{item.label}</strong><small>{item.date ? date(item.date) : item.complete ? 'Verified in payment records' : 'Pending'}</small></div></li>)}</ol>
          <p className="admin-muted">Approval for filing is an internal review decision, not government approval.</p>
        </Panel>}
        <Panel title="Recent activity" subtitle="Updates for the selected company">
          {events.length ? <ol className="client-timeline">{events.map(event => <li key={event.id}><span className="timeline-dot" /><div><Link href={event.href}><strong>{event.title}</strong></Link>{event.detail && <p>{event.detail}</p>}<small>{date(event.date)}</small></div></li>)}</ol> : <p className="panel-body-copy">No activity has been recorded yet.</p>}
        </Panel>
      </div><aside className="company-workspace-help"><Panel title="Here to help" subtitle="Apex Filings support"><LifeBuoy size={28} className="workspace-support-icon" /><p className="panel-body-copy">Questions about your company, documents, or payment? Send a secure support request.</p>{app.accountManager && <p className="panel-body-copy">Assigned account manager: <strong>{app.accountManager}</strong></p>}<Link className="button button-primary" href={`${supportHref}#new-request`}>Create support ticket</Link><Link className="text-action" href={`${supportHref}#requests`}>View existing tickets ({tickets.length})</Link><Link className="text-action" href={supportHref}>Contact support</Link></Panel></aside></div>
    </>}
  </div>;
}
