'use client';
import { useEffect, useState } from 'react';
import { BroadcastComposer } from "./BroadcastComposer";
import { PageHeader, Panel } from '@/components/ui/DashboardUI';

type Candidate = { id: string; fullName: string; email: string; clientReference: string | null; validEmail: boolean };
export function BroadcastPreview() {
  const [selected,setSelected]=useState<string[]>([]);
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
  return <><PageHeader eyebrow="COMMUNICATIONS" title="Email Broadcasts" description="Review potential client recipients." /><BroadcastComposer selectedIds={selected}/><Panel title="Recipient candidates" subtitle="Active clients with verified email addresses">
    <p role="status">Select individual clients for a targeted broadcast. Preview applies consent and eligibility rules.</p>
    <div className="admin-filters"><label>Search clients<input value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} placeholder="Name, email or reference" /></label><label><input type="checkbox" checked={applications} onChange={event => { setPage(1); setApplications(event.target.checked); }} /> Clients with applications</label></div>
    {state ? <p role="status">{state}</p> : <><p>{total} candidates before delivery eligibility checks</p>{rows.map(row => <div className="admin-row admin-subcard" key={row.id}><div><label><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>setSelected(e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id))}/> <strong>{row.fullName || 'Name not provided'}</strong></label><p>#{row.clientReference ?? 'Not assigned'} · {row.email}</p></div>{!row.validEmail && <span>Invalid email</span>}</div>)}{!rows.length && <p>No matching clients.</p>}<div className="admin-inline-actions"><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button type="button" className="button button-secondary" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></div></>}
  </Panel></>;
}
