import { ArrowUpRight, MapPin } from 'lucide-react';
import { TOP_STATES } from '../../data/states';
import { STATE_DATA_NOTICE, US_STATES } from '../../data/usStates';
import { TopState } from '../../types';
import './TopStatesSection.css';

interface TopStatesSectionProps {
  onSelectState: (state: TopState) => void;
}

export function TopStatesSection({ onSelectState }: TopStatesSectionProps) {
  return (
    <section className="top-states-section" id="states" aria-labelledby="top-states-title">
      <div className="top-states-decor" aria-hidden="true" />
      <div className="top-states-container">
        <div className="top-states-intro">
          <span className="top-states-eyebrow">Strategic Formation</span>
          <h2 id="top-states-title">Form Your LLC in the United States</h2>
          <p>Choose your state and explore the requirements and services available through Apex Filings.</p>
        </div>

        <div className="top-states-grid">
          {TOP_STATES.map((state, index) => {
            const stateData = US_STATES.find((item) => item.name === state.name);
            return (
              <button
                key={state.id}
                type="button"
                onClick={() => onSelectState(state)}
                className={`top-state-card top-state-card--${state.tagVariant}${index === 0 ? ' top-state-card--featured' : ''}`}
              >
                <span className="top-state-card__top">
                  <span className="top-state-card__icon"><MapPin size={19} strokeWidth={1.9} aria-hidden="true" /></span>
                  <span className="top-state-card__badge">{state.tag}</span>
                </span>
                <span className="top-state-card__name">{state.name}</span>
                <span className="top-state-card__description">{state.description}</span>

                <span className="top-state-card__details">
                  <span className="top-state-card__detail">
                    <span>Filing fee</span>
                    <strong>{stateData?.filingFee == null ? 'Not provided' : `$${stateData.filingFee}`}</strong>
                  </span>
                  <span className="top-state-card__detail">
                    <span>Annual / biennial</span>
                    <strong>{stateData?.recurringFeeDescription ?? 'Not provided'}</strong>
                  </span>
                  <span className="top-state-card__detail">
                    <span>Online processing estimate</span>
                    <strong>{stateData?.processingTimeLabel ?? 'Not listed'}</strong>
                  </span>
                </span>
                <span className="top-state-card__action">Explore {state.name} <ArrowUpRight size={16} aria-hidden="true" /></span>
              </button>
            );
          })}
        </div>
        <p className="top-states-notice">{STATE_DATA_NOTICE} Online processing is not an approval guarantee.</p>
      </div>
    </section>
  );
}
