import { STATE_DATA_NOTICE, type USStateData } from '../data/usStates';

interface StateFeeDetailsProps {
  state: USStateData;
  className?: string;
}

export function StateFeeDetails({ state, className = '' }: StateFeeDetailsProps) {
  return (
    <div className={`rounded-xl border border-[#EEE2DB] bg-[#FFF9F5] p-4 ${className}`}>
      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#171717]">{state.name} state information</h4>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
        <div><dt className="text-slate-500">State filing fee</dt><dd className="mt-0.5 font-semibold text-[#171717]">{state.filingFee == null ? 'Not provided' : `$${state.filingFee}`}</dd></div>
        <div><dt className="text-slate-500">Annual / biennial fee</dt><dd className="mt-0.5 font-semibold text-[#171717]">{state.recurringFeeDescription ?? 'Not provided'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-slate-500">Estimated online processing</dt><dd className="mt-0.5 font-semibold text-[#171717]">{state.processingTimeLabel ?? 'Not listed'}</dd></div>
      </dl>
      {state.notes.length > 0 && <p className="mt-3 text-xs leading-5 text-[#694738]"><strong>Reporting / source note:</strong> {state.notes.join('; ')}</p>}
      <p className="mt-3 border-t border-[#F0E1D8] pt-3 text-[11px] leading-5 text-slate-600">{STATE_DATA_NOTICE}</p>
    </div>
  );
}
