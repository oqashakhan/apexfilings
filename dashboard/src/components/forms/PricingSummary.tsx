"use client";
import type { QuoteSnapshot } from '@/lib/pricing';
export function PricingSummary({ quote, error }: { quote: QuoteSnapshot | null; error?: string | null }) {
 const money=(n:number|null)=>n===null?'Being confirmed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
 if(!quote) return <p role={error?'alert':'status'}>{error?'Pricing is temporarily unavailable. Please try again.':'Updating your summary…'}</p>;
 const extras=quote.items.filter(i=>i.serviceSlug);
 return <section className="llc-payment-card" aria-live="polite"><div className="llc-card-heading"><h3>Payment Summary</h3><span className="llc-summary-state">{quote.state}</span></div>
 <div className="fee-row"><span>Selected Package</span><strong>{quote.packageName}</strong></div>
 <div className="fee-row"><span>Package Fee</span><strong>{money(quote.serviceFeeCents)}</strong></div>
 <div className="fee-row"><span>Government Filing Fee — {quote.state}</span><strong>{money(quote.governmentFeeCents)}</strong></div>
 {extras.map(i=><div className="fee-row llc-extra-row" key={i.serviceSlug}><span>{i.description}</span><strong>{money(i.amountCents)}</strong></div>)}
 {quote.items.filter((i,k)=>k>0&&!i.serviceSlug&&!i.description.startsWith('Government filing fee')&&i.amountCents>=0).map((i,k)=><div className="fee-row" key={`other-${k}`}><span>{i.description}</span><strong>{money(i.amountCents)}</strong></div>)}
 {quote.pendingItems?.filter(i=>!i.description.startsWith('Government filing fee')).map((i,k)=><div className="fee-row llc-extra-row" key={k}><span>{i.description}</span><strong>Being confirmed</strong></div>)}
 <div className="fee-row"><span>Additional Services</span><strong>{money(quote.additionalFeeCents)}</strong></div>
 <div className="fee-row"><span>Discount</span><strong>{money(quote.discountCents)}</strong></div>
 {quote.taxCents>0&&<div className="fee-row"><span>Taxes</span><strong>{money(quote.taxCents)}</strong></div>}
 <div className="fee-row total"><span>Total Payable</span><strong>{money(quote.totalCents)}</strong></div>
 {quote.totalCents===null&&<p className="llc-pricing-notice" role="status">Final pricing is being confirmed. You can continue your application review.</p>}
 {(quote.recurringFeeDescription||quote.processingTime)&&<details className="llc-state-info"><summary>State information</summary>{quote.recurringFeeDescription&&<p>Future state fees: {quote.recurringFeeDescription}. Not included in this order.</p>}{quote.processingTime&&<p>Estimated processing: {quote.processingTime}. Timing is not guaranteed.</p>}</details>}
 </section>;
}
