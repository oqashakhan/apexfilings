import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { US_STATES } from '../../data/usStates';
import { US_STATE_PATHS } from './usStatePaths';

type State = (typeof US_STATES)[number];

interface USStateMapProps {
  selectedCode: string | null;
  onSelect: (state: State) => void;
}

const statesByName = new Map<string, State>(US_STATES.map((state) => [state.name, state]));

export function USStateMap({ selectedCode, onSelect }: USStateMapProps) {
  const [hovered, setHovered] = useState<State | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Position the tooltip directly; pointer movement does not rerender 50 paths.
  const positionTooltip = (clientX: number, clientY: number) => {
    const frame = frameRef.current?.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    if (!frame || !tooltip) return;
    const width = tooltip.offsetWidth || 145;
    const height = tooltip.offsetHeight || 42;
    const left = Math.max(12, Math.min(clientX - frame.left + 15, frame.width - width - 12));
    const top = Math.max(height + 12, Math.min(clientY - frame.top - 10, frame.height - 12));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const hover = (state: State, event: ReactPointerEvent<SVGPathElement>) => {
    if (event.pointerType !== 'mouse') return;
    setHovered(state);
    positionTooltip(event.clientX, event.clientY);
  };

  return (
    <div className="us-state-map" ref={frameRef}>
      <svg viewBox="-65 4 1030 612" role="group" aria-label="Select a US state to form an LLC" preserveAspectRatio="xMidYMid meet">
        {US_STATE_PATHS.map(({ name, d }) => {
          const state = statesByName.get(name);
          if (!state) return null;
          const selected = state.code === selectedCode;
          return (
            <path
              key={state.code}
              d={d}
              className="us-state-map__state"
              data-state={state.code}
              data-selected={selected ? 'true' : undefined}
              role="button"
              tabIndex={0}
              aria-label={`Select ${state.name} for LLC formation`}
              aria-pressed={selected}
              onClick={() => onSelect(state)}
              onPointerEnter={(event) => hover(state, event)}
              onPointerMove={(event) => { if (event.pointerType === 'mouse') positionTooltip(event.clientX, event.clientY); }}
              onPointerLeave={() => setHovered(null)}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHovered(state);
                positionTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
              onBlur={() => setHovered(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(state);
                }
              }}
            />
          );
        })}
      </svg>
      <div ref={tooltipRef} className="us-state-map__tooltip" data-visible={hovered ? 'true' : undefined} aria-hidden="true">
        <span>{hovered?.name} LLC</span><span className="us-state-map__tooltip-arrow">↗</span>
      </div>
    </div>
  );
}
