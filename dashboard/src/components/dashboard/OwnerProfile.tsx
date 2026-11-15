'use client';
import {useEffect,useState} from 'react';
export function OwnerProfile(){
  const [name,setName]=useState(''),[saved,setSaved]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{void fetch('/api/v1/auth/current',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();const {user}=await r.json();setName(user.fullName);setSaved(user.fullName);}).catch(()=>setMessage('Could not load your profile.'));},[]);
  async function save(){setBusy(true);try{const r=await fetch('/api/v1/admin/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:name})});if(!r.ok)throw new Error((await r.json()).error);setSaved(name.trim());setName(name.trim());setMessage('Profile saved.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
  return <section><label>Full name<input value={name} maxLength={120} disabled={saved===null} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||saved===null||name===saved||name.trim().length<2} onClick={()=>void save()}>Save profile</button><button disabled={busy||saved===null||name===saved} onClick={()=>{setName(saved??'');setMessage('Changes discarded.');}}>Cancel changes</button>{message&&<p role="status">{message}</p>}</section>;
}
