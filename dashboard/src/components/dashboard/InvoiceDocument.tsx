"use client";
import Image from 'next/image';
import { InvoicePaymentControl } from './InvoicePaymentControl';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, Check } from 'lucide-react';
import { invoiceAmount, invoiceBalanceNote, invoiceCanPrint, invoiceDate, invoiceDownloadHref, invoiceStatusLabel, invoiceStatusTone, type InvoiceData } from '@/lib/invoice-presentation';

export function InvoiceStatus({ status }: { status: string }) {
  return <span className={`invoice-status invoice-status--${invoiceStatusTone(status)}`}><span aria-hidden="true" />{invoiceStatusLabel(status)}</span>;
}

export function InvoiceDownload({ invoice, compact = false }: { invoice: InvoiceData; compact?: boolean }) {
  const href = invoiceDownloadHref(invoice);
  const content = <><Download size={16} /><span>{compact ? 'Download' : 'Download Invoice'}</span></>;
  const label = `Download Invoice ${invoice.number}`;
  return href ? <a className="invoice-button invoice-button--secondary" aria-label={label} href={href}>{content}</a> : <button className="invoice-button invoice-button--secondary" type="button" disabled aria-label={label} title="Available once this invoice is issued">{content}</button>;
}

export function InvoiceDocument({ invoice, role, onPrint }: { invoice: InvoiceData; role: 'client' | 'admin'; onPrint?: () => void }) {
  const snapshot = invoice.snapshot;
  const seller = snapshot?.seller;
  const received = invoice.payments.filter(payment => payment.verifiedAt && ['VERIFIED', 'REFUNDED', 'DISPUTED'].includes(payment.status));
  const showPay = role === 'client' && invoice.status !== 'VOIDED' && (invoice.balanceCents !== 0 || invoice.lifecycle !== 'ISSUED');
  const pricing=invoice.pricing;
  const pending=invoice.lifecycle!=='ISSUED'&&invoice.lifecycle!=='VOIDED';
  const items=snapshot?.items??pricing?.items??[];
  const subtotal=snapshot?.subtotalCents??pricing?.knownSubtotalCents;
  const discount=snapshot?.discountCents??pricing?.discountCents??0;
  const tax=snapshot?.taxCents??pricing?.taxCents??0;
  const summary: { label: string; value: number | null; strong?: boolean }[] = [
    ...(subtotal!==undefined?[{label:'Subtotal',value:subtotal},{label:'Discounts',value:discount?-discount:0},...(tax>0?[{label:'Taxes',value:tax}]:[])]:[]),
    { label: pending?'Total after confirmation':'Total', value: pending?null:invoice.totalCents, strong: true },
    { label: 'Amount paid', value: invoice.paidCents },
    ...(invoice.refundedCents > 0 ? [{ label: 'Amount refunded', value: invoice.refundedCents }] : []),
    { label: 'Amount due', value: pending?null:invoice.balanceCents, strong: true },
  ];
  return <div className="invoice-document-view">
    <div className="invoice-document-toolbar invoice-no-print"><Link href={`/${role}/invoices`} className="invoice-back"><ArrowLeft size={16} />Invoices</Link><div className="invoice-toolbar-actions"><Link className="invoice-order-link" href={`/${role}/orders/${invoice.orderId}`}>View related order</Link><button type="button" className="invoice-button invoice-button--secondary" disabled={!invoiceCanPrint(invoice)} onClick={onPrint}><Printer size={16} />Print Invoice</button><InvoiceDownload invoice={invoice} /></div></div>
    <article className="invoice-document" aria-label={`Invoice ${invoice.number}`}>
      <header className="invoice-document-header"><div className="invoice-brand"><Image unoptimized src="/apex-icon.png" alt="" width={40} height={40} /><div><strong>APEX FILINGS</strong><span>US Business Formation Services</span></div></div><div className="invoice-identity"><h1>Invoice</h1><p>{invoice.number}</p><InvoiceStatus status={invoice.presentationStatus??invoice.status} /></div></header>
      <dl className="invoice-dates"><div><dt>Issue date</dt><dd>{invoice.issuedAt ? invoiceDate(invoice.issuedAt) : 'Not issued'}</dd></div><div><dt>Due date</dt><dd>{invoice.dueAt ? invoiceDate(invoice.dueAt) : 'No due date'}</dd></div></dl>
      <section className="invoice-amount-band" aria-label="Invoice amounts"><div className="invoice-amount-primary"><span>{pending?'Known subtotal':'Amount due'}</span><strong>{invoiceAmount(pending?pricing?.knownSubtotalCents??invoice.totalCents:invoice.balanceCents, invoice.currency)}</strong><p>{pending?'Awaiting approval before payment':invoiceBalanceNote(invoice)}</p></div><dl><div><dt>Total invoice</dt><dd>{invoice.totalCents===null?'Pending confirmation':invoiceAmount(invoice.totalCents, invoice.currency)}</dd></div><div><dt>Amount paid</dt><dd>{invoiceAmount(invoice.paidCents, invoice.currency)}</dd></div></dl></section>
      <section className="invoice-parties"><div><h2>Bill to</h2><strong>{invoice.customer.name}</strong><p>{invoice.customer.email}</p><p className="invoice-reference">Client Reference Number <b>{invoice.customer.clientReference ?? 'Not assigned'}</b></p>{invoice.company.name && <p className="invoice-company">{invoice.company.name}{invoice.company.state && <span>{invoice.company.state}</span>}</p>}{snapshot?.customer.billingAddress && <p className="invoice-multiline">{snapshot.customer.billingAddress}</p>}</div>{seller && <div><h2>From</h2><strong>{seller?.legalName || seller?.displayName || 'Apex Filings'}</strong>{seller?.email && <p>{seller.email}</p>}{seller?.address && <p className="invoice-multiline">{seller.address}</p>}{seller?.taxDetails && <p className="invoice-registration">{seller.taxDetails}</p>}</div>}</section>
      <section className="invoice-line-items" aria-label="Invoice line items">{items.length ? <div className="invoice-items-scroll"><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{invoiceAmount(item.unitCents, invoice.currency)}</td><td>{invoiceAmount(item.amountCents, invoice.currency)}</td></tr>)}</tbody></table></div> : <p className="invoice-empty-lines">Itemized charges will be available when this invoice is issued.</p>}</section>
      {pricing?.pending.length ? <section className="invoice-pending-charges"><h2>Pending charges</h2>{pricing.pending.map((item,index)=><p key={index}><strong>{item.description}</strong> — {item.reason}. Awaiting approval.</p>)}</section> : null}<div className="invoice-bottom"><div className="invoice-notes">{seller?.footer && <><h2>Notes</h2><p className="invoice-multiline">{seller.footer}</p></>}{received.length > 0 && <div className="invoice-received"><h2><Check size={15} />Payment received</h2>{received.map(payment => <p key={payment.id}>{invoiceAmount(payment.amountCents, invoice.currency)} · {invoiceDate(payment.verifiedAt)}{payment.receiptUrl?.startsWith('https://') && <a className="invoice-no-print" href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">View receipt</a>}</p>)}</div>}{invoice.payments.some(payment => payment.status === 'DISPUTED') && <p>Your payment is under review. Please contact the team if you need help.</p>}{invoice.creditNotes.length > 0 && <div className="invoice-credit-links invoice-no-print">{invoice.creditNotes.map(note => <a key={note.id} href={`/api/v1/invoices/${invoice.id}/pdf?creditNoteId=${encodeURIComponent(note.id)}`}>Download credit note {note.number}</a>)}</div>}</div><dl className="invoice-totals">{summary.map(row => <div className={row.strong ? 'invoice-total-strong' : ''} key={row.label}><dt>{row.label}</dt><dd>{row.value===null?'Pending confirmation':invoiceAmount(row.value, invoice.currency)}</dd></div>)}</dl></div>
      <footer className="invoice-document-footer"><p>Thank you for choosing Apex Filings.</p>{showPay && <div className="invoice-no-print" id="payment"><InvoicePaymentControl invoice={invoice} /></div>}</footer>
    {invoice.paymentAttempts?.length>0&&<section className="invoice-no-print invoice-notes"><h2>Payment attempts</h2>{invoice.paymentAttempts.map(attempt=><p key={attempt.id}>{invoiceDate(attempt.createdAt)} · {invoiceAmount(attempt.amountCents,invoice.currency)} · {attempt.status.toLowerCase().replaceAll('_',' ')}</p>)}</section>}</article>
  </div>;
}
