'use client';
import { useEffect,useState } from 'react';
export function MarketingPreference({token}:{token?:string}){
  const [subscribed,setSubscribed]=useState<boolean|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(token!==undefined)return;void fetch('/api/v1/marketing-preference',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Could not load email preference.');setSubscribed((await r.json()).subscribed);}).catch(e=>setMessage(e.message));},[token]);
  async function save(){setBusy(true);try{
    const r=await fetch('/api/v1/marketing-preference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(token!==undefined?{token}:{subscribe:!subscribed})});
    if(!r.ok)throw new Error((await r.json()).error);setSubscribed(token?false:!subscribed);setMessage(token||subscribed?'Unsubscribed from marketing announcements.':'Marketing announcements enabled.');
  }catch(e){setMessage(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
  return <section className="admin-subcard"><h2>Marketing announcements</h2><p>{token?'Confirm to stop future announcements at this email address.':subscribed?'You receive optional Apex Filings news and offers.':'Subscribe to receive optional Apex Filings news and offers by email.'}</p><button className="button button-secondary" disabled={busy||(token===undefined?subscribed===null:subscribed===false)} onClick={()=>void save()}>{token||subscribed?'Unsubscribe':'Subscribe'}</button>{message&&<p role="status">{message}</p>}</section>;
}
