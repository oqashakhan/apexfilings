'use client';
import { FormEvent,useState } from 'react';
import { useRouter } from 'next/navigation';
export function StaffActions({kind,id,onSaved}:{kind:'review'|'reply'|'logout'|'status';id:string;onSaved?:()=>Promise<void>}) {
  const router=useRouter(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[key,setKey]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget,values=new FormData(form),token=key||crypto.randomUUID();setKey(token);setBusy(true);
    const path=kind==='logout'?'auth/logout':kind==='review'?'admin/documents/'+id+'/review' : kind==='status'?'admin/support/'+id:'admin/support/'+id+'/reply';
    try {
      const r=await fetch('/api/v1/'+path,{method:kind==='status'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(values),idempotencyKey:token})});
      if(!r.ok) throw new Error((await r.json()).error);
      form.reset();await onSaved?.();setMessage('Saved.');setKey('');if(kind==='logout')router.replace('/login');router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
  }
  return <form onSubmit={submit}>{kind==='status'&&<label>Ticket status<select name="status" defaultValue=""><option disabled value="">Choose status</option>{['OPEN','IN_PROGRESS','WAITING_FOR_CLIENT','RESOLVED','CLOSED'].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>}{kind==='reply'&&<label>Reply<textarea name="message" required minLength={2} maxLength={4000}/></label>}{kind==='review'&&<><label>Decision<select name="status"><option value="ACCEPTED">Approve</option><option value="REPLACEMENT_REQUIRED">Request replacement</option></select></label><label>Reason for replacement<input name="reason" maxLength={500}/></label></>}<button className="button button-secondary" disabled={busy}>{kind==='logout'?'Sign out':kind==='review'?'Save decision':kind==='status'?'Update status':'Send reply'}</button>{message&&<p role="status">{message}</p>}</form>;
}
