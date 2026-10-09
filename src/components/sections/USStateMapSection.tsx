import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, MapPin, Search, X } from 'lucide-react';
import { PRICING_PLANS } from '../../data/pricing';
import { US_STATES } from '../../data/usStates';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import '../us-map/USStateMap.css';

const USStateMap = lazy(() => import('../us-map/USStateMap').then((module) => ({ default: module.USStateMap })));

type State = (typeof US_STATES)[number];

interface USStateMapSectionProps {
  onStartState: (stateCode: string, planId: string, isNonUsResident: boolean) => void;
}

export function USStateMapSection({ onStartState }: USStateMapSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [planId, setPlanId] = useState('basic');
  const [nonUsResident, setNonUsResident] = useState(true);
  useScrollReveal(sectionRef);

  useEffect(() => {
    if (!selectedCode || window.innerWidth > 900) return;
    const frame = requestAnimationFrame(() => previewRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    }));
    return () => cancelAnimationFrame(frame);
  }, [selectedCode]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? US_STATES.filter((state) => state.name.toLowerCase().includes(term)) : [];
  }, [query]);
  const selectedState = US_STATES.find((state) => state.code === selectedCode);
  const activePlan = PRICING_PLANS.find((plan) => plan.id === planId) ?? PRICING_PLANS[0];
  const visibleFeatures = activePlan.features.slice(0, 4);

  const selectState = (state: State) => {
    setSelectedCode(state.code);
    setQuery(state.name);
    setSuggestionsOpen(false);
    setActiveIndex(0);
  };

  return (
    <section ref={sectionRef} id="state-map" aria-labelledby="state-map-title" className="us-map-section scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center" data-polish-reveal="0">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#D33D1D]">Your next step starts here</span>
          <h2 id="state-map-title" className="mt-4 text-4xl font-bold tracking-tight text-[#171717] sm:text-5xl">Choose Your State to Form an LLC</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">Select a US state to explore your LLC formation options and get started with Apex Filings.</p>
        </div>

        <div className="us-map-search relative mx-auto mt-9 max-w-lg" ref={searchRef} data-polish-reveal="1">
          <label htmlFor="us-state-search" className="sr-only">Search for a US state</label>
          <Search size={19} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="us-state-search"
            type="search"
            autoComplete="off"
            placeholder="Search for a US state..."
            value={query}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && matches.length > 0}
            aria-controls={suggestionsOpen && query.trim() ? 'us-state-suggestions' : undefined}
            aria-activedescendant={suggestionsOpen && matches[activeIndex] ? `us-state-option-${matches[activeIndex].code}` : undefined}
            className="h-14 w-full rounded-2xl border border-[#DAD8D6] bg-white py-3 pl-13 pr-5 text-[15px] text-[#171717] shadow-[0_8px_28px_-18px_#47352c45] outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-[#F04623] focus:shadow-[0_0_0_4px_#F0462318,0_8px_28px_-18px_#47352c45]"
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setSuggestionsOpen(true); }}
            onFocus={() => { if (query.trim()) setSuggestionsOpen(true); }}
            onBlur={(event) => { if (!searchRef.current?.contains(event.relatedTarget as Node)) setSuggestionsOpen(false); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { setSuggestionsOpen(false); return; }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (!matches.length) return;
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
              }
              if (event.key === 'Enter' && suggestionsOpen && matches[activeIndex]) {
                event.preventDefault();
                selectState(matches[activeIndex]);
              }
            }}
          />
          {suggestionsOpen && query.trim() && (
            <div id="us-state-suggestions" role="listbox" aria-label="Matching US states" className="us-map-search__results">
              {matches.length ? matches.map((state, index) => (
                <button
                  key={state.code}
                  id={`us-state-option-${state.code}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className="us-map-search__option"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectState(state)}
                >
                  <MapPin size={16} aria-hidden="true" />
                  <span>{state.name}</span>
                  <span className="ml-auto text-xs font-semibold text-slate-400">{state.code}</span>
                </button>
              )) : <p className="px-5 py-4 text-sm text-slate-500" role="status">No matching states found.</p>}
            </div>
          )}
        </div>

        <div className="us-map-shell mt-10" data-polish-reveal="2">
          <div className="us-map-visual">
            <div className="us-map-visual__heading"><span className="us-map-visual__dot" /> All 50 US states <span className="ml-auto text-right text-xs font-medium text-slate-500">Select a state on the map</span></div>
            <Suspense fallback={<div className="us-state-map" style={{ aspectRatio: '1030 / 612' }} role="status" aria-label="Loading state map" />}>
              <USStateMap selectedCode={selectedCode} onSelect={selectState} />
            </Suspense>
            <p className="us-map-visual__footnote">Alaska and Hawaii are shown as insets. You can also use search to select smaller states.</p>
          </div>

          <aside ref={previewRef} className="us-map-preview" aria-live="polite" aria-label="Selected state and LLC package preview">
            {selectedState ? (
              <div className="us-map-preview__selected" key={selectedState.code}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#D33D1D]">State selected</span>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#171717]">Form Your LLC in {selectedState.name}</h3>
                  </div>
                  <button type="button" aria-label="Close package preview" className="us-map-preview__close" onClick={() => {
                    setSelectedCode(null);
                    setQuery('');
                    setSuggestionsOpen(false);
                    requestAnimationFrame(() => searchRef.current?.querySelector('input')?.focus());
                  }}><X size={18} aria-hidden="true" /></button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">Explore a package for your selected state. You can review your choice in the registration flow.</p>

                <div className="us-map-preview__switch mt-5" role="group" aria-label="Package">
                  {PRICING_PLANS.map((plan) => <button key={plan.id} type="button" aria-pressed={planId === plan.id} onClick={() => setPlanId(plan.id)}>{plan.name}</button>)}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div><span className="text-3xl font-bold tabular-nums text-[#171717]">${nonUsResident ? activePlan.priceNonUsResident : activePlan.priceUsResident}</span><span className="ml-1 text-xs font-medium text-slate-500">+ state fee</span></div>
                  <span className="text-[11px] font-semibold text-slate-500">Package price</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><span>Pricing for:</span><button type="button" className="us-map-preview__residency" onClick={() => setNonUsResident((value) => !value)} aria-label={`Pricing for ${nonUsResident ? 'non-US' : 'US'} residents. Switch residency`}>{nonUsResident ? 'Non-US resident' : 'US resident'} ↔</button></div>

                <div className="mt-6 border-t border-[#EEE7E2] pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#171717]">Included in {activePlan.name}</h4>
                  <ul className="mt-3 space-y-2.5">
                    {visibleFeatures.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm leading-5 text-slate-600"><Check size={15} className="mt-0.5 shrink-0 text-[#E54723]" strokeWidth={2.5} aria-hidden="true" /><span>{feature}</span></li>)}
                  </ul>
                  {activePlan.features.length > visibleFeatures.length && <a href="/pricing" className="mt-3 inline-flex text-xs font-semibold text-[#C6381B] underline underline-offset-4">View all package inclusions</a>}
                </div>
                <button type="button" className="us-map-preview__cta mt-6" onClick={() => onStartState(selectedState.code, planId, nonUsResident)}>Start LLC in {selectedState.name} <ArrowRight size={17} aria-hidden="true" /></button>
                <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">Applicable state filing fee is additional.</p>
              </div>
            ) : (
              <div className="us-map-preview__empty">
                <span className="us-map-preview__empty-icon"><MapPin size={24} aria-hidden="true" /></span>
                <h3 className="mt-5 text-xl font-bold text-[#171717]">Explore your options</h3>
                <p className="mt-3 max-w-[27ch] text-sm leading-6 text-slate-600">Choose a state on the map or search by name to see the available LLC packages.</p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#D33D1D]">Select a state <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
