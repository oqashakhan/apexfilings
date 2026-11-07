"use client";
import { useState } from 'react';
import type { PriceState } from '@/lib/pricing';
import { validFeeSource } from '@/lib/state-fee-approval';
export function StateFeeApproval({state,onSaved}:{state:PriceState;onSaved:()=>Promise<void>}) {
 const [amount,setAmount]=useState(state.filingFeeCents === null ? state.referenceFilingFeeCents == null ? '' : (state.referenceFilingFeeCents/100).toFixed(2) : (state.filingFeeCents/100).toFixed(2));
 const [source,setSource]=useState(state.sourceReference?.startsWith('https://')?state.sourceReference:'');
 const [date,setDate]=useState(''); const [confirmed,setConfirmed]=useState(false); const [difference,setDifference]=useState(false);
 const [recurring,setRecurring]=useState(state.recurringFeeDescription??'');const [period,setPeriod]=useState(state.recurringFeePeriod??'');const [processing,setProcessing]=useState(state.processingTime??'');
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const cents=/^\d+(\.\d{1,2})?$/.test(amount)?Math.round(Number(amount)*100):null;
 const differs=state.referenceFilingFeeCents!=null&&cents!==state.referenceFilingFeeCents;
 const approved=state.active&&state.verifiedAt&&validFeeSource(state.sourceReference)&&state.filingFeeCents!==null;
 async function save(active:boolean){setBusy(true);setNotice('');try{
  const response=await fetch('/api/v1/admin/pricing',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'state',id:state.code,data:{filingFeeCents:cents,sourceReference:source||null,verifiedAt:date?new Date(`${date}T00:00:00`).toISOString():state.verifiedAt?new Date(state.verifiedAt).toISOString():null,active,verificationConfirmed:confirmed,referenceDifferenceConfirmed:difference,recurringFeeDescription:recurring||null,recurringFeePeriod:period||null,processingTime:processing||null}})});
  const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not save fee');await onSaved();setConfirmed(false);setDifference(false);setNotice(active?'Approved. Current pending Client quotes will refresh automatically. Finalized orders retain their prices.':'Saved inactive. This fee cannot be used for payment.');
 }catch(e){setNotice(e instanceof Error?e.message:'Could not save fee');}finally{setBusy(false);}}
 return <section className="admin-subcard admin-stack"><h3>Verify and approve {state.state} filing fee</h3>
 <p>Imported initial fee: <strong>{state.referenceFilingFeeCents==null?'Not supplied':`$${(state.referenceFilingFeeCents/100).toFixed(2)}`}</strong> · {approved?'Approved':'Not approved for payment'}</p>
 {state.verifiedAt&&<p>Last verified: {new Date(state.verifiedAt).toLocaleDateString()}</p>}
 <p>The imported amount is a reference, not an approved charge. Check the current official source before approving. Include only the initial formation fee here.</p>
 <div className="form-grid"><label>Verified initial filing fee (USD)<input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setConfirmed(false);setDifference(false);}}/></label><label>Official source URL<input type="url" value={source} placeholder="https://official-state-source" onChange={e=>{setSource(e.target.value);setConfirmed(false);}}/></label><label>Verification date<input type="date" max={new Date().toLocaleDateString('en-CA')} value={date} onChange={e=>{setDate(e.target.value);setConfirmed(false);}}/></label></div>
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked the current official initial formation fee for this state and confirm the amount above.</label>
 {differs&&<label><input type="checkbox" checked={difference} onChange={e=>setDifference(e.target.checked)}/> I reviewed the difference from the imported reference. Use the verified amount for new quotes.</label>}
 <details><summary>Recurring fees and processing estimates</summary><label>Future recurring fees<textarea value={recurring} onChange={e=>setRecurring(e.target.value)}/></label><label>Recurring period<input value={period} onChange={e=>setPeriod(e.target.value)}/></label><label>Estimated processing time<input value={processing} onChange={e=>setProcessing(e.target.value)}/></label><p>Future recurring fees are excluded from the initial formation payment. Processing estimates are not guarantees.</p></details>
 <div className="admin-inline-actions"><button className="button button-secondary" disabled={busy} onClick={()=>void save(false)}>Save inactive draft</button><button className="button button-primary" disabled={busy||cents===null||!source||!date||!confirmed||(differs&&!difference)} onClick={()=>void save(true)}>Verify and approve filing fee</button></div>{notice&&<p role="status">{notice}</p>}</section>;
}
