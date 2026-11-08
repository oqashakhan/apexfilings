"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvoiceData, InvoiceTotals } from '@/lib/invoice-presentation';
import { InvoiceDirectory } from './InvoiceDirectory';
import { InvoiceDocument } from './InvoiceDocument';
import { InvoiceAdminControls } from './InvoiceAdminControls';
import './invoice-experience.css';

export function InvoiceCenter({ role, id, customerId, payments=false }: { role: 'admin' | 'client'; id?: string; customerId?: string; payments?: boolean }) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [totals, setTotals] = useState<InvoiceTotals[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const key = useRef<string | null>(null);
  const requestSequence = useRef(0);
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++requestSequence.current;
    const params = new URLSearchParams({ page: String(page), search: query, ...(status !== 'ALL' ? { status } : {}), ...(customerId ? { customerId } : {}) });
    const response = await fetch(id ? `/api/v1/invoices/${encodeURIComponent(id)}` : `/api/v1/invoices?${params}`, { cache: 'no-store', signal });
    const data = await response.json();
    if (signal?.aborted || sequence !== requestSequence.current) return;
    if (!response.ok) throw new Error(data.error ?? 'We could not load your invoices. Please try again.');
    if (id) setInvoice(data.invoice);
    else { setInvoices(data.items); setTotal(data.total); setTotals(data.totals); }
    setError(''); setLoading(false);
  }, [id, page, query, status, customerId]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void load(controller.signal).catch(value => { if (!controller.signal.aborted) { setError(value.message); setLoading(false); } }); };
    queueMicrotask(refresh);
    const timer = setInterval(refresh, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load]);
  async function action(name: 'issue' | 'send' | 'void') {
    if (!invoice || role !== 'admin') return;
    setBusy(true); setNotice(''); setError('');
    try {
      if (!key.current) key.current = crypto.randomUUID();
      const response = await fetch(`/api/v1/invoices/${invoice.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(name === 'send' ? { key: key.current } : name === 'void' ? { reason } : { reviewedHistoricalDetails: reviewed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'We could not update this invoice. Please try again.');
      key.current = null;
      await load();
      setNotice(name === 'send' ? 'Invoice email queued for delivery.' : name === 'void' ? 'Invoice cancelled.' : 'Invoice issued.');
    } catch (value) { setError(value instanceof Error ? value.message : 'We could not update this invoice.'); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="invoice-experience invoice-loading" role="status">Loading invoices…</div>;
  if (!id) return <div className="invoice-experience">{payments&&<><h1>Payments</h1><p>Review your latest invoice and pay securely once pricing is finalized.</p>{invoices[0]&&<InvoiceDocument invoice={invoices[0]} role="client" onPrint={()=>window.print()} />}</>}<InvoiceDirectory role={role} invoices={invoices} totals={totals} total={total} page={page} query={search} status={status} onQuery={value => { setSearch(value); setPage(1); }} onStatus={value => { setStatus(value); setPage(1); }} onPage={setPage} customerId={customerId} notice={error} /></div>;
  if (!invoice || invoice.id !== id) return <div className="invoice-experience invoice-loading" role={error ? 'alert' : 'status'}>{error || 'Loading invoice…'}</div>;
  return <div className="invoice-experience">{error && <p className="invoice-message invoice-no-print" role="alert">{error}</p>}{notice && <p className="invoice-message invoice-no-print" role="status">{notice}</p>}<InvoiceDocument invoice={invoice} role={role} onPrint={() => window.print()} />{role === 'admin' && <InvoiceAdminControls invoice={invoice} busy={busy} reviewed={reviewed} reason={reason} onReviewed={setReviewed} onReason={setReason} onAction={name => void action(name)} />}</div>;
}
