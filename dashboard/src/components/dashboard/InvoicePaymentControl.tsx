"use client";
import { useEffect, useState } from 'react';
import type { InvoiceData } from '@/lib/invoice-presentation';

export function InvoicePaymentControl({invoice}:{invoice:InvoiceData}) {
 const [config,setConfig]=useState<{available:boolean;mode:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch('/api/v1/payments/checkout',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(setConfig).catch(()=>{});return()=>controller.abort();},[]);
 async function pay(){setBusy(true);setError('');try{const response=await fetch('/api/v1/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:invoice.orderId})});const result=await response.json();if(!response.ok||typeof result.url!=='string'||!result.url.startsWith('https://checkout.stripe.com/'))throw new Error(result.error??'Payment is unavailable. Please try again.');window.location.assign(result.url);}catch(value){setError(value instanceof Error?value.message:'Payment unavailable');setBusy(false);}}
 if(invoice.status==='VOIDED'||(invoice.balanceCents===0&&invoice.lifecycle==='ISSUED'))return null;
 const pending=invoice.lifecycle!=='ISSUED'||invoice.totalCents===null;
 return <div className="invoice-payment-placeholder"><button type="button" className="invoice-button invoice-button--pay" disabled={pending||!invoice.canPay||!config?.available||busy} onClick={()=>void pay()}> {busy?'Opening secure Checkout…':'Pay now'}</button><small>{pending?'Your final amount is being confirmed. Payment will be enabled once your invoice is finalized.':invoice.processing?'Payment is awaiting confirmation. Please do not pay again.':invoice.paidCents>0?'A partial payment is recorded. Contact the team to arrange the remaining balance.':!config?.available?'Online payment is not configured yet. Please contact the team.':config.mode==='test'?'Stripe TEST MODE — no real charge':'Secure payment through Stripe Checkout'}</small>{error&&<p role="alert">{error}</p>}</div>;
}
