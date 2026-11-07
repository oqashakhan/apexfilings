import { validFeeSource } from './state-fee-approval';

type StateFee = {
  filingFeeCents: number | null;
  active: boolean;
  verifiedAt: string | Date | null;
  sourceReference: string | null;
};

// Approval is represented by active + a valid configured fee + verification evidence.
// The imported reference amount is deliberately never used to authorize a charge.
export function diagnoseStateFee(state: StateFee | null | undefined, now = Date.now()) {
  const blockers: string[] = [];
  if (!state) return { status: 'MISSING' as const, blockers: ['STATE_RECORD_MISSING'], reason: 'State fee record missing' };
  if (!state.active) blockers.push('OWNER_APPROVAL_PENDING');
  if (state.filingFeeCents === null) blockers.push('PAYABLE_FEE_MISSING');
  else if (!Number.isSafeInteger(state.filingFeeCents) || state.filingFeeCents < 0) blockers.push('PAYABLE_FEE_INVALID');
  const verified = state.verifiedAt ? new Date(state.verifiedAt).getTime() : NaN;
  if (!Number.isFinite(verified)) blockers.push('VERIFICATION_MISSING');
  else if (verified > now) blockers.push('VERIFICATION_IN_FUTURE');
  if (!validFeeSource(state.sourceReference)) blockers.push('OFFICIAL_SOURCE_MISSING');
  const reasons: Record<string, string> = {
    OWNER_APPROVAL_PENDING: 'Owner verification and approval required',
    PAYABLE_FEE_MISSING: 'Payable filing fee not configured',
    PAYABLE_FEE_INVALID: 'Payable filing fee invalid',
    VERIFICATION_MISSING: 'Verification date missing or invalid',
    VERIFICATION_IN_FUTURE: 'Verification date is in the future',
    OFFICIAL_SOURCE_MISSING: 'Official HTTPS verification source missing or invalid',
  };
  return { status: blockers.length ? 'PENDING' as const : 'APPROVED' as const, blockers, reason: blockers.map(b => reasons[b]).join('; ') };
}
