"use client";

import { useCallback, useEffect, useState } from "react";
import { StaffActions } from "./StaffActions";
import { useRouter } from "next/navigation";
import { useAdminDemo } from "@/components/dashboard/AdminDemoContext";

const types = ["PROOF_OF_ADDRESS", "OWNER_ID", "PASSPORT", "CNIC", "BUSINESS_ADDRESS_PROOF", "FORMATION_SUPPORTING_DOCUMENT", "OTHER_SUPPORTING_DOCUMENT"];

export function AdminDocumentRequestForm({ applicationId, owners }: { applicationId: string; owners: { id: string; name: string }[] }) {
  const {refresh}=useAdminDemo();
  return <DocumentRequestEditor applicationId={applicationId} owners={owners} refresh={refresh}/>;
}
export function DocumentRequestEditor({applicationId,owners,refresh:onRefresh}:{applicationId:string;owners:{id:string;name:string}[];refresh?:()=>Promise<void>}) {
  const router=useRouter();
  const refresh=onRefresh??(async()=>router.refresh());
  const [documentType, setDocumentType] = useState(types[0]);
  const [ownerId, setOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [customTitle,setTitle]=useState(""); const [dueDate,setDue]=useState(""); const [repeat,setRepeat]=useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<{ id: string; documentType: string; reason: string; status: string; customTitle?:string;dueDate?:string;createdAt:string;fileId?:string }[]>([]);
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/admin/applications/${applicationId}/document-requests`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load document requests.");
    setRequests((await response.json()).requests);
  }, [applicationId]);
  useEffect(() => { const frame = requestAnimationFrame(() => { void load().catch(() => setMessage("Could not load document requests.")); }); return () => cancelAnimationFrame(frame); }, [load]);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/applications/${applicationId}/document-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentType, ownerId: ownerId || undefined, reason, customTitle, dueDate:dueDate||undefined, confirmReplacement:repeat }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not request this document.");
      setReason("");setDue("");setTitle("");setRepeat(false); await Promise.all([refresh(), load()]); setMessage("Document request created. The dashboard notification and any enabled email were queued.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not request this document."); }
    finally { setBusy(false); }
  }
  async function cancel(id:string) {
    if(!window.confirm("Cancel this outstanding request?")) return;
    setBusy(true);try {
      const response=await fetch('/api/v1/admin/applications/'+applicationId+'/document-requests',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:id})});
      if(!response.ok) throw new Error((await response.json()).error);
      await Promise.all([load(),refresh()]);setMessage('Request cancelled.');
    }catch(e){setMessage(e instanceof Error?e.message:'Could not cancel.');}finally{setBusy(false);}
  }
  return <div className="admin-subcard admin-stack"><strong>Request a document</strong>{requests.length > 0 && <div className="admin-stack">{requests.map((item) => <div className="admin-row" key={item.id}><span>{item.customTitle || item.documentType.replaceAll("_", " ")} · {item.createdAt.slice(0,10)}{item.dueDate && " · Due "+item.dueDate.slice(0,10)}</span><small>{item.status.replaceAll("_", " ")}</small>{item.fileId && <a className="table-link" href={"/api/v1/documents/"+item.fileId+"/download?view=1"}>View file</a>}{item.fileId && item.status==="UNDER_REVIEW" && <StaffActions kind="review" id={item.fileId} onSaved={async()=>{await Promise.all([load(),refresh()]);}}/>}{["NOT_PROVIDED","REPLACEMENT_REQUIRED"].includes(item.status) && <button disabled={busy} onClick={()=>void cancel(item.id)}>Cancel request</button>}</div>)}</div>}<div className="form-grid"><label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{types.map((type) => <option key={type} value={type}>{type === "OWNER_ID" ? "Identity proof (passport or CNIC)" : type.replaceAll("_", " ")}</option>)}</select></label><label>Related owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">Company document</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label></div><label>Custom document name<input maxLength={160} value={customTitle} onChange={e=>setTitle(e.target.value)}/></label><label>Due date<input type="date" value={dueDate} onChange={e=>setDue(e.target.value)}/></label><label><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/> Request another copy even if an approved document exists. Explain the reason below.</label><label className="admin-form-field">What the client should provide<textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the document needed and why" /></label><button className="button button-secondary" disabled={busy || reason.trim().length < 5 || (["OWNER_ID","CNIC","PASSPORT"].includes(documentType) && !ownerId)} onClick={() => void submit()}>{busy ? "Sending…" : "Request document"}</button>{message && <p role="status">{message}</p>}</div>;
}
