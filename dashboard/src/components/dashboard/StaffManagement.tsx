"use client";
import { useCallback,useEffect,useState } from "react";
import { Panel } from "@/components/ui/DashboardUI";
type Staff={id:string;fullName:string;email:string;staffScope:string;status:string;activated:boolean};
export function StaffManagement({applicationId}:{applicationId?:string}) {
  const [rows,setRows]=useState<Staff[]>([]),[assigned,setAssigned]=useState(""),[loaded,setLoaded]=useState(false);
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[editing,setEditing]=useState<Staff|null>(null);
  const load=useCallback(async()=>{
    const r=await fetch("/api/v1/admin/staff"+(applicationId?"?applicationId="+encodeURIComponent(applicationId):""),{cache:"no-store"});
    if(!r.ok) throw new Error("Could not load staff.");
    const data=await r.json();setRows(data.staff);setAssigned(data.assignedStaffId??"");setLoaded(true);
  },[applicationId]);
  useEffect(()=>{const timer=setTimeout(()=>void load().catch(e=>setMessage(e.message)),0);return ()=>clearTimeout(timer);},[load]);
  async function save(method:string,input:object) {
    setBusy(true);try{
      const r=await fetch("/api/v1/admin/staff",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
      if(!r.ok) throw new Error((await r.json()).error);
      await load();setEditing(null);setMessage(method==="POST"?"Invitation queued.":"Changes saved.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false);}
  }
  return <Panel title={applicationId?"Assigned reviewer":"Staff management"}>
    {applicationId?<form onSubmit={e=>{e.preventDefault();void save("PATCH",{action:"assign",applicationId,staffId:assigned||null});}}><label>Staff member<select value={assigned} onChange={e=>setAssigned(e.target.value)}><option value="">Unassigned</option>{rows.filter(r=>r.status==="ACTIVE"&&r.staffScope==="OPERATIONS").map(r=><option key={r.id} value={r.id}>{r.fullName}</option>)}</select></label><button disabled={busy||!loaded} className="button button-primary">Save assignment</button></form>:<>
      {rows.map(r=><div className="admin-row" key={r.id}><span><strong>{r.fullName}</strong> · {r.email}<small> {r.staffScope} · {r.status==="SUSPENDED"?"Suspended":r.activated?"Active":"Invited"}</small></span><button className="table-link" onClick={()=>setEditing(r)}>Edit</button></div>)}
      <form className="admin-stack" key={editing?.id??"invite"} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void save(editing?"PATCH":"POST",{...Object.fromEntries(f),...(editing?{id:editing.id,action:"profile"}:{})});}}>
        <h3>{editing?"Edit staff member":"Invite staff member"}</h3><label>Full name<input name="fullName" required minLength={2} defaultValue={editing?.fullName}/></label>{!editing&&<label>Email<input name="email" required type="email"/></label>}
        <label>Access role<select name="staffScope" defaultValue={editing?.staffScope??"SUPPORT"}><option value="SUPPORT">Assigned support tickets</option><option value="OPERATIONS">Assigned applications and tickets</option></select></label>
        {editing&&<label>Account status<select name="status" defaultValue={editing.status}><option>ACTIVE</option><option>SUSPENDED</option></select></label>}
        <div><button disabled={busy||!loaded} className="button button-primary">{editing?"Save changes":"Queue invitation"}</button>{editing&&<button type="button" onClick={()=>setEditing(null)}>Cancel</button>}</div>
      </form></>}
    {message&&<p role="status">{message}</p>}
  </Panel>;
}
