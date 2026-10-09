import { TOP_STATES } from '../../data/states';
import { STATE_DATA_NOTICE, US_STATES } from '../../data/usStates';
import { TopState } from '../../types';

interface TopStatesSectionProps {
  onSelectState: (state: TopState) => void;
}

export function TopStatesSection({ onSelectState }: TopStatesSectionProps) {
  const getBadgeClasses = (variant: TopState['tagVariant']) => {
    switch (variant) {
      case 'emerald':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'brand':
        return 'text-[#F04623] bg-orange-50 border-orange-200';
      case 'slate':
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <section className="py-20 lg:py-28 relative bg-[#fcf9f8]" id="states">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F04623] text-xs font-semibold tracking-wider uppercase">
            Strategic Formation
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-2">
            Form Your LLC in the United States
          </h2>
          <p className="text-slate-600 text-sm mt-3">
            Choose your state and explore the requirements and services available through Apex Filings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOP_STATES.map((state) => {
            const stateData = US_STATES.find((item) => item.name === state.name);
            return (
            <div
              key={state.id}
              onClick={() => onSelectState(state)}
              className="card-glass p-6 rounded-2xl border-slate-200 hover:border-orange-300 transition-[transform,background-color,border-color,box-shadow,color] cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-[#0F172A] group-hover:text-[#F04623] transition-colors">
                    {state.name}
                  </span>
                  <span
                    className={`text-[11px] font-semibold border px-2 py-0.5 rounded ${getBadgeClasses(
                      state.tagVariant
                    )}`}
                  >
                    {state.tag}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{state.description}</p>
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-700">
                <p>Filing fee: <strong>{stateData?.filingFee == null ? 'Not provided' : `$${stateData.filingFee}`}</strong></p>
                <p>Annual / biennial: <strong>{stateData?.recurringFeeDescription ?? 'Not provided'}</strong></p>
                <p>Online processing estimate: <strong>{stateData?.processingTimeLabel ?? 'Not listed'}</strong></p>
              </div>
            </div>
          ); })}
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-600">{STATE_DATA_NOTICE} Online processing is not an approval guarantee.</p>
      </div>
    </section>
  );
}
