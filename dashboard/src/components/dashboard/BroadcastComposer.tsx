'use client';
import {useCallback,useEffect,useState} from 'react';
import {Panel} from '@/components/ui/DashboardUI';
type Campaign={id:string;subject:string;category:string;createdAt:string;confirmedAt:string|null;cancelledAt:string|null;createdBy:string;_count:{recipients:number}};
type Detail={campaign:Campaign & {message:string};counts:{status:string;count:number}[];recipients:{email:string;status:string}[]};
type Preview={id:string;count:number;html:string;fingerprint:string};
async function call(input:object){
  const r=await fetch('/api/v1/admin/broadcasts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const data=await r.json();if(!r.ok)throw new Error(data.error??'Could not save broadcast.');return data;
}
export function BroadcastComposer({selectedIds}:{selectedIds:string[]}) {
  const [subject,setSubject]=useState(''),[message,setMessage]=useState(''),[category,setCategory]=useState('MARKETING'),[audience,setAudience]=useState('ALL');
  const [preview,setPreview]=useState<Preview|null>(null),[previewKey,setPreviewKey]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [history,setHistory]=useState<Campaign[]>([]),[page,setPage]=useState(1),[detail,setDetail]=useState<Detail|null>(null),[detailPage,setDetailPage]=useState(1);
  const form={subject,message,category,audience,selectedIds:audience==='SELECTED'?selectedIds:[]},key=JSON.stringify(form);
  const current=previewKey===key?preview:null;
  const load=useCallback(async()=>{const r=await fetch('/api/v1/admin/broadcasts?page='+page,{cache:'no-store'});if(!r.ok)throw new Error('Could not load history.');setHistory((await r.json()).campaigns);},[page]);
  useEffect(()=>{const timer=setTimeout(()=>void load().catch(e=>setNotice(e.message)),0);return ()=>clearTimeout(timer);},[load]);
  async function open(id:string,n=1){try{const r=await fetch('/api/v1/admin/broadcasts?id='+id+'&page='+n,{cache:'no-store'});if(!r.ok)throw new Error('Could not load recipients.');setDetail(await r.json());setDetailPage(n);}catch(e){setNotice(e instanceof Error?e.message:'Could not load details.');}}
  async function act(action:string,id?:string){
    if(busy)return;
    if(action==='confirm'&&!window.confirm('Queue this reviewed message for '+current?.count+' eligible clients?'))return;
    if(action==='cancel'&&!window.confirm('Cancel all remaining unsent messages?'))return;
    setBusy(true);setNotice('');
    try{
      if(action==='preview'){const result=await call({...form,id:crypto.randomUUID(),action});setPreview(result);setPreviewKey(key);}
      else {
        const campaignId=id??current?.id;
        await call({id:campaignId,action,...(action==='confirm'?{confirmed:true,fingerprint:current?.fingerprint}:{})});
        if(action==='confirm'){setPreview(null);setSubject('');setMessage('');}
        setNotice(action==='confirm'?'Broadcast confirmed. Recipients are pending worker processing.':action==='test'?'Test queued for your verified Owner address.':'Campaign updated.');
        if(campaignId)await open(campaignId);
      }
      await load();
    }catch(e){setNotice(e instanceof Error?e.message:'Broadcast request failed.');}finally{setBusy(false);}
  }
  return <><Panel title="Compose broadcast"><div className="form-grid"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="MARKETING">Marketing and announcements</option><option value="SERVICE">Necessary application update</option></select></label><label>Audience<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="ALL">All eligible active clients</option><option value="APPLICATIONS">Clients with applications</option><option value="SELECTED">Selected clients ({selectedIds.length})</option></select></label></div><label>Subject<input value={subject} maxLength={160} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea rows={6} maxLength={12000} value={message} onChange={e=>setMessage(e.target.value)}/></label>
    <button className="button button-secondary" disabled={busy||!subject.trim()||!message.trim()} onClick={()=>void act('preview')}>Preview and count recipients</button>
    {current&&<section><p>{current.count} eligible recipients</p><iframe sandbox="" title="Email preview" srcDoc={current.html} style={{width:'100%',minHeight:280}}/><div className="admin-inline-actions"><button disabled={busy} onClick={()=>void act('test')}>Queue test to my address</button><button className="button button-primary" disabled={busy||!current.count} onClick={()=>void act('confirm')}>Confirm and queue broadcast</button></div></section>}
    {notice&&<p role="status">{notice}</p>}</Panel>
    <Panel title="Broadcast history">{history.map(c=><button className="admin-row admin-subcard" key={c.id} onClick={()=>void open(c.id)}>{c.subject} · {c.category} · {new Date(c.createdAt).toLocaleString()} · {c.createdBy} · {c.cancelledAt?'Cancelled':c.confirmedAt?c._count.recipients+' recipients':'Draft'}</button>)}{!history.length&&<p>No campaigns on this page.</p>}<button disabled={page===1} onClick={()=>setPage(page-1)}>Previous campaigns</button><button disabled={history.length<25} onClick={()=>setPage(page+1)}>Next campaigns</button>
    {detail&&<section><h3>{detail.campaign.subject}</h3><p>{detail.campaign.message}</p><p>{detail.counts.map(c=>c.count+' '+c.status.toLowerCase()).join(' · ')}</p>{detail.recipients.map(r=><div className="admin-row" key={r.email}>{r.email} · {r.status.toLowerCase()}</div>)}<button disabled={detailPage===1} onClick={()=>void open(detail.campaign.id,detailPage-1)}>Previous recipients</button><button disabled={detail.recipients.length<25} onClick={()=>void open(detail.campaign.id,detailPage+1)}>Next recipients</button><button onClick={()=>void open(detail.campaign.id,detailPage)}>Refresh status</button>{!detail.campaign.cancelledAt&&<><button disabled={busy} onClick={()=>void act('cancel',detail.campaign.id)}>Cancel unsent</button>{detail.counts.some(x=>x.status==='FAILED')&&<button disabled={busy} onClick={()=>void act('retry',detail.campaign.id)}>Retry eligible failures</button>}</>}</section>}</Panel></>;
}
