"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, CreditCard, FileText, Headphones, History, Package, ReceiptText, ShieldCheck, RefreshCw } from 'lucide-react';
import { activityCategories, relativeActivityTime, type ActivityItem } from '@/lib/admin-activity';
import { PageHeader, Panel, EmptyState } from '../ui/DashboardUI';
import { AdminClientIdentity } from './AdminClientIdentity';

const icons = { APPLICATION: ClipboardList, DOCUMENT: FileText, INVOICE: ReceiptText, PAYMENT: CreditCard, SUPPORT: Headphones, SERVICE: Package, ACCOUNT: ShieldCheck, OTHER: History };
const timestamp = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC';
export function ActivityTimeline({ items, now }: { items: ActivityItem[]; now: number }) {
  return <ol className="activity-timeline">{items.map(item => {
    const Icon = icons[item.category];
    return <li key={item.id} className={`activity-event activity-${item.category.toLowerCase()}`}>
      <span className="activity-event-icon"><Icon size={18} aria-hidden="true" /></span>
      <div className="activity-event-copy"><div className="activity-event-top"><span className="activity-category">{activityCategories[item.category]}</span><span className="activity-actor-role">{item.actorRole}</span></div>
        {item.href ? <Link className="activity-description" href={item.href}>{item.description}<ArrowRight size={14} aria-hidden="true" /></Link> : <strong className="activity-description">{item.description}</strong>}
        <p>{item.companyName ? `${item.companyName} · ` : ''}{item.recordName}</p>
        {item.detail && <span className="activity-event-detail">{item.detail}</span>}
        {item.customer && <AdminClientIdentity client={item.customer} />}
      </div><time dateTime={item.timestamp} title={timestamp(item.timestamp)}><strong>{relativeActivityTime(item.timestamp, now)}</strong><small>{timestamp(item.timestamp)}</small></time>
    </li>;
  })}</ol>;
}
type Result = { items: ActivityItem[]; total: number; page: number; pageCount: number; asOf: string };
const empty = { items: [], total: 0, page: 1, pageCount: 1, asOf: '' };
export function AdminActivity({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<Result>(empty), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [category, setCategory] = useState('ALL'), [actor, setActor] = useState('ALL');
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [sort, setSort] = useState('newest'), [page, setPage] = useState(1);
  const [query, setQuery] = useState(''), [now, setNow] = useState(0), [revision, setRevision] = useState(0);
  const snapshot = useRef('');
  const sequence = useRef(0);
  useEffect(() => { const timer = setTimeout(() => { if (search.trim() !== query) { snapshot.current = ''; setQuery(search.trim()); setPage(1); } }, 250); return () => clearTimeout(timer); }, [search, query]);
  const load = useCallback(async (signal?: AbortSignal, fresh = false) => {
    const request = ++sequence.current;
    const params = new URLSearchParams({ page: String(compact ? 1 : page), pageSize: compact ? '10' : '20', search: query, category, actor, sort, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(!fresh && snapshot.current && !compact ? { asOf: snapshot.current } : {}) });
    const response = await fetch(`/api/v1/admin/activity?${params}`, { cache: 'no-store', signal });
    const data = await response.json();
    if (signal?.aborted || sequence.current !== request) return;
    if (!response.ok) throw new Error(data.error ?? 'Could not load activities. Please try again.');
    snapshot.current = data.asOf;
    setResult(data); setError(''); setLoading(false); setNow(Date.now());
  }, [compact, page, query, category, actor, sort, from, to]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { setLoading(true); setError(''); void load(controller.signal).catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false); } }); });
    const timer = setInterval(() => {
      setNow(Date.now());
      if (compact && document.visibilityState === 'visible') void load(controller.signal, true).catch(() => { if (!controller.signal.aborted) setError('Could not refresh recent activity.'); });
    }, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load, compact, revision]);
  function resetPage(change: () => void) { snapshot.current = ''; setPage(1); setRevision(value => value + 1); change(); }
  function refresh() { snapshot.current = ''; setLoading(true); void load(undefined, true).catch(cause => { setError(cause.message); setLoading(false); }); }
  return <div className="admin-activity-workspace">
    {!compact && <PageHeader eyebrow="ADMIN WORKSPACE" title="Activity Log" description="Recorded actions across your client and company workflows." />}
    <Panel title={compact ? 'Recent activity' : 'All activities'} subtitle={compact ? 'The latest 10 recorded actions' : `${result.total.toLocaleString()} matching activities · Dates shown in UTC`} action={compact ? <Link className="button button-secondary" href="/admin/activity">View All Activity <ArrowRight size={15} /></Link> : <button className="button button-secondary" disabled={loading} type="button" onClick={refresh}><RefreshCw size={15} />Refresh activity</button>}>
      {!compact && <div className="activity-filters">
        <label className="activity-search">Search<input aria-label="Search activities" value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder="Client, reference, company, application or action…" /></label>
        <label>Category<select value={category} onChange={event => resetPage(() => setCategory(event.target.value))}><option value="ALL">All categories</option>{Object.entries(activityCategories).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Actor<select value={actor} onChange={event => resetPage(() => setActor(event.target.value))}><option value="ALL">All actors</option><option value="OWNER">Admin</option><option value="STAFF">Staff</option><option value="CLIENT">Client</option><option value="SYSTEM">System / unrecorded actor</option></select></label>
        <label>From (UTC)<input type="date" value={from} onChange={event => resetPage(() => setFrom(event.target.value))} /></label><label>To (UTC)<input type="date" value={to} onChange={event => resetPage(() => setTo(event.target.value))} /></label>
        <label>Sort<select value={sort} onChange={event => resetPage(() => setSort(event.target.value))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        <button type="button" className="text-action" onClick={() => resetPage(() => { setSearch(''); setQuery(''); setCategory('ALL'); setActor('ALL'); setFrom(''); setTo(''); setSort('newest'); })}>Clear filters</button>
      </div>}
      {error ? <div role="alert" className="activity-error"><p>{error}</p><button type="button" className="button button-secondary" onClick={refresh}>Try again</button></div> : loading ? <p role="status" className="panel-body-copy">Loading activities…</p> : result.items.length ? <ActivityTimeline items={result.items} now={now} /> : <EmptyState title="No activities found" description="Try a different search or date range. Only recorded actions appear here." icon={History} />}
      {!compact && !error && !loading && <nav className="activity-pagination" aria-label="Activity pages"><span>Page {result.page} of {result.pageCount}</span><div><button type="button" className="button button-secondary" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)}>Previous</button><button type="button" className="button button-secondary" disabled={result.page >= result.pageCount} onClick={() => setPage(result.page + 1)}>Next</button></div></nav>}
    </Panel>
  </div>;
}
