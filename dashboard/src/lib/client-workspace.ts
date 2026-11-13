import { invoiceFinancials } from './invoices';

type Order = {
  status: string; paymentStatus: string; totalCents: number | null;
  payments: { id: string; status: string; amountCents: number | null; verifiedAt: Date | string | null }[];
  refunds: { id: string; status: string; amountCents: number | null; stripeRefundId: string | null; stripeStatus: string | null }[];
  stripeCheckout: { status: string } | null;
  paymentAttempts: { status: string }[];
};

// An order flag or Checkout redirect is never evidence that money was received.
export function dashboardPayment(order: Order | null) {
  if (!order) return { unlocked: false, status: 'NO_ORDER', paidCents: 0, refundedCents: 0, balanceCents: null, needsReconciliation: false };
  const ledger = invoiceFinancials({ lifecycle: 'ISSUED', totalCents: order.totalCents, dueAt: null, payments: order.payments, refunds: order.refunds });
  const validReceipts = order.payments.every(p => !p.verifiedAt || !['VERIFIED', 'REFUNDED', 'DISPUTED'].includes(p.status) || (Number.isSafeInteger(p.amountCents) && p.amountCents! > 0));
  const disputed = order.paymentStatus === 'DISPUTED' || order.payments.some(p => p.status === 'DISPUTED');
  const confirmed = validReceipts && order.totalCents !== null && order.totalCents > 0 && ledger.paidCents >= order.totalCents;
  const needsReconciliation = !validReceipts || (order.totalCents !== null && ledger.paidCents > order.totalCents) || ledger.refundedCents > ledger.paidCents || (order.totalCents === null && ledger.paidCents > 0) || (order.paymentStatus === 'VERIFIED' && !confirmed);
  const unlocked = confirmed && order.paymentStatus === 'VERIFIED' && !disputed && !needsReconciliation && ledger.refundedCents < ledger.paidCents && order.status !== 'CANCELLED';
  const processing = order.paymentStatus === 'AWAITING_VERIFICATION' || order.stripeCheckout?.status === 'PROCESSING' || order.payments.some(p => p.status === 'AWAITING_VERIFICATION');
  const status = disputed ? 'DISPUTED' : needsReconciliation ? 'REVIEW_REQUIRED' : ledger.refundedCents > 0 ? ledger.status : unlocked ? 'VERIFIED' : processing ? 'PENDING' : ledger.paidCents > 0 ? 'PARTIALLY_PAID' : order.status === 'CANCELLED' ? 'CANCELLED' : order.paymentStatus === 'REFUNDED' ? 'REFUNDED' : order.paymentStatus === 'REJECTED' || order.stripeCheckout?.status === 'FAILED' || order.paymentAttempts[0]?.status === 'FAILED' ? 'FAILED' : order.stripeCheckout?.status === 'EXPIRED' ? 'EXPIRED' : 'UNPAID';
  return { unlocked, status, paidCents: ledger.paidCents, refundedCents: ledger.refundedCents, balanceCents: ledger.balanceCents, needsReconciliation };
}

export function formationMilestones(input: {
  submittedAt: Date | string | null; approvedForFilingAt: Date | string | null; completedAt: Date | string | null;
  history: { newStatus: string; createdAt: Date | string }[];
  reviews: { checkKey: string; checkedAt: Date | string }[];
  payment: ReturnType<typeof dashboardPayment>;
}) {
  const event = (code: string) => input.history.find(h => h.newStatus === code)?.createdAt ?? null;
  return [
    { label: 'Application submitted', date: input.submittedAt },
    { label: 'Documents reviewed', date: input.reviews.find(r => r.checkKey === 'REQUIRED_DOCUMENTS')?.checkedAt ?? null },
    { label: 'Payment verified', date: input.payment.unlocked ? event('PAYMENT_RECEIVED') : null, complete: input.payment.unlocked },
    { label: 'Filing preparation', date: event('FILING_IN_PROGRESS') ?? input.approvedForFilingAt },
    { label: 'Submitted to state authority', date: event('SUBMITTED_TO_AUTHORITY') },
    { label: 'Formation completed', date: input.completedAt ?? event('COMPLETED') },
  ].map(item => ({ ...item, date: item.date ? new Date(item.date).toISOString() : null, complete: item.complete ?? !!item.date }));
}
