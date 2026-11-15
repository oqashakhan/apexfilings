'use client';
import { useEffect, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/DashboardUI';

type Candidate = { id: string; fullName: string; email: string; clientReference: string | null; validEmail: boolean };
export function BroadcastPreview() {
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('Loading candidates…');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search, applications: String(applications), page: String(page) });
      void fetch(`/api/v1/admin/broadcast-preview?${params}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error('Could not load candidates.');
        const result = await response.json();
        setRows(result.candidates); setTotal(result.total); setState('');
      }).catch(error => { if (!controller.signal.aborted) setState(error instanceof Error ? error.message : 'Could not load candidates.'); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, applications, page]);
  return <><PageHeader eyebrow="COMMUNICATIONS" title="Email Broadcasts" description="Review potential client recipients." /><Panel title="Recipient candidates" subtitle="Active clients with verified email addresses">
    <p role="status">Broadcast sending is not available yet. Consent, suppressions and unsubscribe handling must be completed before the final recipient count can be determined.</p>
    <div className="admin-filters"><label>Search clients<input value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} placeholder="Name, email or reference" /></label><label><input type="checkbox" checked={applications} onChange={event => { setPage(1); setApplications(event.target.checked); }} /> Clients with applications</label></div>
    {state ? <p role="status">{state}</p> : <><p>{total} candidates before delivery eligibility checks</p>{rows.map(row => <div className="admin-row admin-subcard" key={row.id}><div><strong>{row.fullName || 'Name not provided'}</strong><p>#{row.clientReference ?? 'Not assigned'} · {row.email}</p></div>{!row.validEmail && <span>Invalid email</span>}</div>)}{!rows.length && <p>No matching clients.</p>}<div className="admin-inline-actions"><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button type="button" className="button button-secondary" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></div></>}
  </Panel></>;
}
