"use client";
import { useEffect, useState } from 'react';
import type { PricingCatalog } from '@/lib/pricing';
import { Panel } from '@/components/ui/DashboardUI';
import { useAdminDemo } from './AdminDemoContext';
export function PricingManager() {
  const { refresh } = useAdminDemo();
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [kind, setKind] = useState('state'); const [id, setId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({}); const [message, setMessage] = useState('');
  const load = () => fetch('/api/v1/admin/pricing', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Could not load pricing'); return r.json(); }).then(setCatalog);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  const rows = kind === 'state' ? catalog?.states : kind === 'service' ? catalog?.services.filter(s => !s.automaticCharge) : kind === 'charge' ? catalog?.services.filter(s => s.automaticCharge) : catalog?.packages;
  function select(value: string) {
    setId(value); const row = rows?.find(r => ('code' in r ? r.code : r.id) === value);
    if (!row) return;
    const fields = kind === 'state' ? ['filingFeeCents','recurringFeeDescription','recurringFeePeriod','processingTime','sourceReference','verifiedAt','active'] : ['service','charge'].includes(kind) ? ['name','description','priceCents','currency','priceApproved','available','category','availableStateCodes','displayOrder', ...(kind === 'charge' ? ['requiredCharge'] : [])] : ['name','serviceFeeCents','includedServices','includedServiceSlugs','available'];
    setForm(Object.fromEntries(fields.map(field => { const value = (row as unknown as Record<string, unknown>)[field]; return [field, Array.isArray(value) ? value.join('\n') : value == null ? '' : field.endsWith('Cents') ? (Number(value)/100).toFixed(2) : String(value)]; })));
  }
  async function save() {
    try {
      for (const [key,value] of Object.entries(form)) if (key.endsWith('Cents') && value && !/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter USD amounts with up to two decimal places.');
      const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['active','available','priceApproved','requiredCharge'].includes(key) ? value === 'true' : key.endsWith('Cents') ? value.trim() ? Math.round(Number(value)*100) : null : key === 'displayOrder' ? Number(value) : key.startsWith('included') || key === 'availableStateCodes' ? value.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : key === 'verifiedAt' ? value ? new Date(value).toISOString() : null : key === 'description' ? value : value || null]));
      const r = await fetch('/api/v1/admin/pricing', { method: id === 'new' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id === 'new' ? data : { kind: kind === 'charge' ? 'service' : kind, id, data }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error ?? 'Pricing update failed');
      await load(); await refresh(); if (id === 'new') { setId(''); setForm({}); } setMessage('Published pricing for current pending quotes. Finalized orders retain their snapshots.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Pricing update failed'); }
  }
  const state = catalog?.states.find(s => s.code === id);
  return <Panel title="Services & Pricing" subtitle="Enter prices in USD. An empty state list means all states. State fees require an official source and verification date.">
    <div className="form-grid"><label>Pricing type<select value={kind} onChange={e => { setKind(e.target.value); setId(''); setForm({}); }}><option value="state">State fees</option><option value="service">Optional services</option><option value="package">Packages and inclusions</option><option value="charge">Third-party fees</option></select></label>
    <label>Record<select value={id} onChange={e => select(e.target.value)}><option value="">Select record</option>{rows?.map(row => <option key={'code' in row ? row.code : row.id} value={'code' in row ? row.code : row.id}>{'state' in row ? row.state : row.name}</option>)}</select></label>
    {kind === 'state' && state && <p>Client reference filing fee: {('referenceFilingFeeCents' in state && typeof state.referenceFilingFeeCents === 'number') ? `$${(state.referenceFilingFeeCents / 100).toFixed(2)}` : 'Not supplied'}. Compare with the official source before publishing. Estimates are not guarantees.</p>}
    {Object.entries(form).map(([field, value]) => <label key={field}>{field.endsWith('Cents') ? field.replace('Cents','').replace(/([A-Z])/g, ' $1') + ' (USD)' : field.replace(/([A-Z])/g, ' $1')}{field === 'includedServiceSlugs' ? <div>{catalog?.services.map(service => <span key={service.id}><input aria-label={service.name} type="checkbox" checked={value.split('\n').includes(service.slug)} onChange={e => setForm(f => ({ ...f, [field]: (e.target.checked ? [...value.split('\n').filter(Boolean), service.slug] : value.split('\n').filter(v => v !== service.slug)).join('\n') }))} />{service.name}</span>)}</div> : ['active','available','priceApproved','requiredCharge'].includes(field) ? <select value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}><option value="false">No</option><option value="true">Yes</option></select> : <textarea rows={field.startsWith('included') ? 6 : 2} value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />}</label>)}</div>
    {kind === 'charge' && <><p>Active approved fees apply automatically in their configured states. Required fees with missing or unapproved prices block payment.</p><button className="button button-secondary" onClick={() => { setId('new'); setForm({name:'',description:'',priceCents:'',currency:'USD',priceApproved:'false',available:'false',requiredCharge:'true',category:'Third-party fees',availableStateCodes:'',displayOrder:'0'}); }}>Add third-party fee</button></>}
    {kind === 'state' && state && <p>Verification status: {state.active && state.verifiedAt ? 'Approved' : 'Pending official verification'}. Confirm the current official fee, HTTPS source, and verification date before activating.</p>}
    <button className="button button-primary" disabled={!id} onClick={() => void save()}>Publish approved pricing</button>{message && <p role="status">{message}</p>}
  </Panel>;
}
