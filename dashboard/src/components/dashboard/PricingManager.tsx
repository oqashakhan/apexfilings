"use client";
import { useEffect, useState } from 'react';
import type { PricingCatalog } from '@/lib/pricing';
import { StateFeeApproval } from './StateFeeApproval';
import { Panel } from '@/components/ui/DashboardUI';
import { useAdminDemo } from './AdminDemoContext';
type Draft = {kind:string;recordId:string;version:string;data:Record<string,unknown>};
type Catalog = PricingCatalog & {drafts:Draft[]; published:{resourceType:string;resourceId:string;createdAt:string;actor:{fullName:string}|null}[]};
export function PricingManager() {
  const { refresh } = useAdminDemo();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [kind, setKind] = useState('state'); const [id, setId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({}); const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => fetch('/api/v1/admin/pricing', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Could not load pricing'); return r.json(); }).then(setCatalog);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  const rows = kind === 'state' ? catalog?.states : kind === 'service' ? catalog?.services.filter(s => !s.automaticCharge) : kind === 'charge' ? catalog?.services.filter(s => s.automaticCharge) : catalog?.packages;
  const recordKind = kind === 'charge' ? 'service' : kind;
  const draft = catalog?.drafts.find(d => d.kind === recordKind && d.recordId === id);
  const publication = catalog?.published.find(p => p.resourceType === recordKind && p.resourceId === id);
  const newCharges = catalog?.drafts.filter(d => d.kind === 'service' && d.data.automaticCharge && !catalog.services.some(s => s.id === d.recordId)) ?? [];
  function select(value: string) {
    setId(value); const existing = rows?.find(r => ('code' in r ? r.code : r.id) === value);
    const saved = catalog?.drafts.find(d => d.kind === recordKind && d.recordId === value);
    const row = {...existing,...saved?.data};
    if (!value) {setForm({}); return;}
    const fields = kind === 'state' ? ['filingFeeCents','recurringFeeDescription','recurringFeePeriod','processingTime','sourceReference','verifiedAt','active'] : ['service','charge'].includes(kind) ? ['name','description','priceCents','currency','priceApproved','available','category','availableStateCodes','displayOrder', ...(kind === 'charge' ? ['requiredCharge'] : [])] : ['name','description','serviceFeeCents','includedServices','includedServiceSlugs','available'];
    setForm(Object.fromEntries(fields.map(field => { const value = (row as unknown as Record<string, unknown>)[field]; return [field, Array.isArray(value) ? value.join('\n') : value == null ? '' : field.endsWith('Cents') ? (Number(value)/100).toFixed(2) : String(value)]; })));
  }
  async function command(mode:'draft'|'publish'|'discard',data?:Record<string,unknown>) {
    const response = await fetch('/api/v1/admin/pricing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:recordKind,id,mode,data,version:draft?.version ?? null})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Could not update pricing.');
    await load();
    if(mode !== 'draft'){setId('');setForm({});await refresh();}
    setMessage(mode === 'draft' ? 'Draft saved. Review it before publishing.' : mode === 'discard' ? 'Draft discarded.' : 'Pricing published.');
  }
  async function review(mode:'publish'|'discard') {
    if (!window.confirm(mode === 'publish' ? 'Publish the saved draft for new quotes?' : 'Discard this unpublished draft?')) return;
    setSaving(true);
    try {await command(mode);} catch(e) {setMessage(e instanceof Error ? e.message : 'Could not update draft.');} finally {setSaving(false);}
  }
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      for (const [key,value] of Object.entries(form)) if (key.endsWith('Cents') && value && !/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter USD amounts with up to two decimal places.');
      const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['active','available','priceApproved','requiredCharge'].includes(key) ? value === 'true' : key.endsWith('Cents') ? value.trim() ? Math.round(Number(value)*100) : null : key === 'displayOrder' ? Number(value) : key.startsWith('included') || key === 'availableStateCodes' ? value.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : key === 'verifiedAt' ? value ? new Date(value).toISOString() : null : key === 'description' ? value : value || null]));
      await command('draft',{...data,...(kind === 'charge' ? {automaticCharge:true} : {})});
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Pricing update failed'); } finally { setSaving(false); }
  }
  const state = catalog?.states.find(s => s.code === id);
  return <Panel title="Services & Pricing" subtitle="Save a draft, review the saved values, then publish. Enter prices in USD. State fees require an official source and verification date.">
    <div className="form-grid"><label>Pricing type<select value={kind} onChange={e => { setKind(e.target.value); setId(''); setForm({}); }}><option value="state">State fees</option><option value="service">Optional services</option><option value="package">Packages and inclusions</option><option value="charge">Third-party fees</option></select></label>
    <label>Record<select aria-label="Pricing record" value={id} onChange={e => select(e.target.value)}><option value="">Select record</option>{kind === "charge" && newCharges.map(d => <option key={d.recordId} value={d.recordId}>{String(d.data.name)} (draft)</option>)}{rows?.map(row => <option key={'code' in row ? row.code : row.id} value={'code' in row ? row.code : row.id}>{'state' in row ? row.state : row.name}</option>)}</select></label>
    {kind === 'state' && state && <StateFeeApproval key={state.code+(draft?.version ?? '')} state={state} draft={draft?.data} onSaved={async(data)=>{await command('draft',data);}}/>}
    {kind !== 'state' && Object.entries(form).map(([field, value]) => <label key={field}>{field.endsWith('Cents') ? field.replace('Cents','').replace(/([A-Z])/g, ' $1') + ' (USD)' : field.replace(/([A-Z])/g, ' $1')}{field === 'includedServiceSlugs' ? <div>{catalog?.services.map(service => <span key={service.id}><input aria-label={service.name} type="checkbox" checked={value.split('\n').includes(service.slug)} onChange={e => setForm(f => ({ ...f, [field]: (e.target.checked ? [...value.split('\n').filter(Boolean), service.slug] : value.split('\n').filter(v => v !== service.slug)).join('\n') }))} />{service.name}</span>)}</div> : ['active','available','priceApproved','requiredCharge'].includes(field) ? <select value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}><option value="false">No</option><option value="true">Yes</option></select> : <textarea rows={field.startsWith('included') ? 6 : 2} value={value} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />}</label>)}</div>
    {kind === 'charge' && <><p>Active approved fees apply automatically in their configured states. Required fees with missing or unapproved prices block payment.</p><button className="button button-secondary" onClick={() => { setId('charge-'+crypto.randomUUID()); setForm({name:'',description:'',priceCents:'',currency:'USD',priceApproved:'false',available:'false',requiredCharge:'true',category:'Third-party fees',availableStateCodes:'',displayOrder:'0'}); }}>Add third-party fee</button></>}

    {kind !== 'state' && <button className="button button-primary" disabled={!id || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save pricing draft'}</button>}{publication && <p>Last published {new Date(publication.createdAt).toLocaleString()} by {publication.actor?.fullName || 'former administrator'}.</p>}
    {draft && <section className="admin-subcard"><h3>Review saved draft</h3><dl>{Object.entries(draft.data).map(([key,value])=><div key={key}><dt>{key.replace(/([A-Z])/g,' $1')}</dt><dd>{key.endsWith('Cents') && typeof value === 'number' ? '$'+(value/100).toFixed(2) : Array.isArray(value) ? value.join(', ') : String(value ?? 'Not set')}</dd></div>)}</dl><div className="admin-inline-actions"><button className="button button-primary" disabled={saving} onClick={()=>void review('publish')}>Publish saved draft</button><button className="button button-secondary" disabled={saving} onClick={()=>void review('discard')}>Discard draft</button></div></section>}
    {message && <p role="status">{message}</p>}
  </Panel>;
}
