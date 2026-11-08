import { invoiceMoney } from './invoices';
import type { invoiceView } from '@/server/invoices';

export type InvoiceData = ReturnType<typeof invoiceView>;
export type InvoiceTotals = { currency: string; invoicedCents: number; collectedCents: number; refundedCents: number; outstandingCents: number; overdue: number };
export const invoiceStatuses = ['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
const labels: Record<string, string> = { DRAFT: 'Draft', UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially paid', PAID: 'Paid', OVERDUE: 'Overdue', VOIDED: 'Cancelled', PARTIALLY_REFUNDED: 'Partially refunded', REFUNDED: 'Refunded' };
export const invoiceStatusLabel = (status: string) => labels[status] ?? 'Draft';
export const invoiceStatusTone = (status: string) => ({ PAID: 'paid', UNPAID: 'unpaid', PARTIALLY_PAID: 'partial', OVERDUE: 'overdue', VOIDED: 'cancelled', REFUNDED: 'refunded', PARTIALLY_REFUNDED: 'refunded' }[status] ?? 'draft');
export const invoiceDate = (value: Date | string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : '—';
export const invoiceAmount = (value: number | null, currency: string) => value === null ? 'Amount unavailable' : invoiceMoney(value, currency);
export const invoiceCanPrint = (invoice: InvoiceData) => !!invoice.snapshot && ['ISSUED', 'VOIDED'].includes(invoice.lifecycle);
export function invoiceDownloadHref(invoice: InvoiceData) {
  if (invoiceCanPrint(invoice)) return `/api/v1/invoices/${encodeURIComponent(invoice.id)}/pdf`;
  if (invoice.legacyProviderPdfUrl?.startsWith('https://')) return invoice.legacyProviderPdfUrl;
  return null;
}
export function invoiceBalanceNote(invoice: InvoiceData) {
  if (invoice.status === 'VOIDED') return 'This invoice has been cancelled.';
  if (invoice.status === 'DRAFT') return 'Draft invoice · not yet issued.';
  if (invoice.status === 'PAID') return 'Paid in full. Thank you.';
  if (invoice.refundedCents > 0) return `${invoiceMoney(invoice.refundedCents, invoice.currency)} refunded.`;
  if (invoice.overdue && invoice.dueAt) return `Payment overdue since ${invoiceDate(invoice.dueAt)}.`;
  if (invoice.dueAt) return `Due ${invoiceDate(invoice.dueAt)}.`;
  return invoice.balanceCents === null ? 'The final amount is not available yet.' : 'No payment due date has been set.';
}
