"use client";
import { useEffect, useState } from 'react';
import type { PricingCatalog } from '@/lib/pricing';
import { Panel } from '@/components/ui/DashboardUI';
export function PricingManager() {
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [kind, setKind] = useState('state'); const [id, setId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({}); const [message, setMessage] = useState('');
  const load = () => fetch('/api/v1/admin/pricing', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Could not load pricing'); return r.json(); }).then(setCatalog);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  const rows = kind === 'state' ? catalog?.states : kind === 'service' ? catalog?.services : catalog?.packages;
  function select(value: string) {
    setId(value); const row = rows?.find(r => ('code' in r ? r.code : r.id) === value);
    if (!row) return;
    const fields = kind === 'state' ? ['filingFeeCents','recurringFeeDescription','recurringFeePeriod','processingTime','sourceReference','verifiedAt','active'] : kind === 'service' ? ['name','description','priceCents','currency','priceApproved','available'] : ['name','serviceFeeCents','includedServices','includedServiceSlugs','available'];
    setForm(Object.fromEntries(fields.map(field => { const value = (row as unknown as Record<string, unknown>)[field]; return [field, Array.isArray(value) ? value.join('\n') : value == null ? '' : String(value)]; })));
  }
  async function save() {
    try {
      const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['active','available','priceApproved'].includes(key) ? value === 'true' : key.endsWith('Cents') ? value.trim() ? Number(value) : null : key.startsWith('included') ? value.split('\n').map(s => s.trim()).filter(Boolean) : key === 'verifiedAt' ? value ? new Date(value).toISOString() : null : value || null]));
      const r = await fetch('/api/v1/admin/pricing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, data }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error ?? 'Pricing update failed');
      await load(); setMessage('Published pricing for future quotes. Existing orders retain their snapshots.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Pricing update failed'); }
  }
  const state = catalog?.states.find(s => s.code === id);
  return <Panel title="Publish pricing" subtitle="USD amounts use integer cents. State fees require an official source and verification date.">
    <div className="form-grid"><label>Pricing type<select value={kind} onChange={e => { setKind(e.target.value); setId(''); setForm({}); }}><option value="state">State fees</option><option value="service">Optional services</option><option value="package">Packages and inclusions</option></select></label>
    <label>Record<select value={id} onChange={e => select(e.target.value)}><option value="">Select record</option>{rows?.map(row => <option key={'code' in row ? row.code : row.id} value={'code' in row ? row.code : row.id}>{'state' in row ? row.state : row.name}</option>)}</select></label>
    {kind === 'state' && state && <p>Client reference filing fee: {('referenceFilingFeeCents' in state && typeof state.referenceFilingFeeCents === 'number') ? `$${(state.referenceFilingFeeCents / 100).toFixed(2)}` : 'Not supplied'}. Compare with the official source before publishing. Estimates are not guarantees.</p>}
    {Object.entries(form).map(([field, value]) => <label key={field}>{field.replace(/([A-Z])/g, ' $1')}{['active','available','priceApproved'].includes(field) ? <select value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}><option value="false">No</option><option value="true">Yes</option></select> : <textarea rows={field.startsWith('included') ? 6 : 2} value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />}</label>)}</div>
    <button className="button button-primary" disabled={!id} onClick={() => void save()}>Publish approved pricing</button>{message && <p role="status">{message}</p>}
  </Panel>;
}
