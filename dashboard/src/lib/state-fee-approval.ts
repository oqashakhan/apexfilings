export function validFeeSource(value: string | null | undefined) {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function validateStateFeeApproval(input: {filingFeeCents:number|null;sourceReference:string|null;verifiedAt:string|null;verificationConfirmed?:boolean;referenceDifferenceConfirmed?:boolean}, reference: number | null, now = Date.now()) {
  if (input.filingFeeCents === null || !Number.isSafeInteger(input.filingFeeCents) || input.filingFeeCents < 0) return 'Enter the verified initial filing fee.';
  if (!validFeeSource(input.sourceReference)) return 'Enter the official HTTPS source used to verify this filing fee.';
  if (!input.verifiedAt || !Number.isFinite(Date.parse(input.verifiedAt)) || Date.parse(input.verifiedAt) > now) return 'Enter a verification date that is not in the future.';
  if (!input.verificationConfirmed) return 'Confirm that you checked the current official initial formation fee.';
  if (reference !== null && reference !== input.filingFeeCents && !input.referenceDifferenceConfirmed) return 'Confirm the difference from the imported client reference.';
  return null;
}
