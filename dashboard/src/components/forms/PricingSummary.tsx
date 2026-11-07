"use client";
import type { QuoteSnapshot } from '@/lib/pricing';
export function PricingSummary({ quote, error }: { quote: QuoteSnapshot | null; error?: string | null }) {
  const money = (n: number | null) => n === null ? 'Pending verified quotation' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
  if (!quote) return <p role={error ? 'alert' : 'status'}>{error ? `${error}. A payable total cannot be confirmed. Please retry.` : 'Calculating current server pricing…'}</p>;
  return <div className="payment-preview" aria-live="polite">
    <h3>Payment Summary</h3><p>{quote.packageName} · {quote.state}</p>
    {quote.items.map((item, i) => <div className="fee-row" key={i}><span>{item.description}</span><strong>{money(item.amountCents)}</strong></div>)}
    {quote.pendingItems?.map((item, i) => <div className="fee-row" key={`pending-${i}`}><span>{item.description}</span><strong>{item.referenceAmountCents !== null ? `${money(item.referenceAmountCents)} reference — ` : ''}{item.reason}</strong></div>)}
    {quote.governmentFeeCents === null && !quote.pendingItems?.length && <div className="fee-row"><span>Government filing fee — {quote.state}</span><strong>Owner verification and approval required</strong></div>}
    <div className="fee-row"><span>Approved paid additional services subtotal</span><strong>{money(quote.additionalFeeCents)}</strong></div>
    <div className="fee-row"><span>Discounts</span><strong>{money(quote.discountCents)}</strong></div>
    <div className="fee-row"><span>Taxes assessed on this quote</span><strong>{money(quote.taxCents)}</strong></div>
    {typeof quote.referenceSubtotalCents === 'number' && <div className="fee-row"><span>{quote.totalCents === null ? 'Reference subtotal — before taxes and discounts; approval pending' : 'Subtotal before taxes and discounts'}</span><strong>{money(quote.referenceSubtotalCents)}</strong></div>}
    <div className="fee-row total"><span>Total payable</span><strong>{money(quote.totalCents)}</strong></div>
    {!!quote.issues.length && <div role="status"><p>Application review may continue. Payment is unavailable until pricing is confirmed.</p><ul>{quote.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    <details><summary>Included at no additional charge</summary><ul>{quote.includedServices.map(feature => <li key={feature}>{feature}</li>)}</ul></details>
    {quote.recurringFeeDescription && <p>Future government fees: {quote.recurringFeeDescription}. Excluded from the initial order.</p>}
    {quote.processingTime && <p>Estimated online processing: {quote.processingTime}. This is not guaranteed.</p>}
    <p>Recurring government fees are separate future obligations. Processing estimates and bank, EIN, or payment-provider approvals are not guaranteed.</p>
  </div>;
}
