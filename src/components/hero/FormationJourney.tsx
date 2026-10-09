import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  FileText,
  Folder,
  IdCard,
  MapPin,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import './FormationJourney.css';

type JourneyStepData = {
  number: string;
  title: string;
  kind: 'state' | 'llc' | 'ein' | 'ready';
  icon: LucideIcon;
};

const journeySteps: JourneyStepData[] = [
  { number: '01', title: 'Choose Your State', kind: 'state', icon: MapPin },
  { number: '02', title: 'Form Your LLC', kind: 'llc', icon: FileText },
  { number: '03', title: 'Get Your EIN', kind: 'ein', icon: IdCard },
  { number: '04', title: 'Your Business Is Ready', kind: 'ready', icon: Check },
];

const trustPills = [
  { label: '100% Online', icon: Zap },
  { label: 'Track Your Progress', icon: ChartNoAxesColumnIncreasing },
  { label: 'Documents in One Place', icon: Folder },
];

function WorldMapBackdrop() {
  return (
    <svg className="journey-map" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="journey-map-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#F04623" />
        </pattern>
      </defs>
      <g fill="url(#journey-map-dots)">
        <path d="M61 72 115 46 169 47 198 67 231 65 254 90 232 112 188 112 171 138 137 144 121 178 93 160 74 120 49 105Z" />
        <path d="m198 172 48 5 29 27 31 42-11 39-20 18-6 39-25 21-16-31-12-51-20-29-14-47Z" />
        <path d="m450 81 38-26 51 8 18 17 36-9 40 12 47-10 44 8 22-18 58 12 36 23 49-8 65 22 32 29-22 24-49-4-23 19-35-12-23 21-37-11-18 27-37-7-24-26-35 6-18-22-32 11-17-26-43 7-17-20-38 9-33-19-31 8-31-21Z" />
        <path d="m540 172 48-7 53 23 26 37-11 38-22 42-27 29-35-17-15-48-28-34-16-40Z" />
        <path d="m966 245 53-13 55 17 32 31-17 28-61 5-58-22-22-26Z" />
      </g>
    </svg>
  );
}

function JourneyStep({ step, index, activeStep, setActiveStep }: {
  step: JourneyStepData;
  index: number;
  activeStep: number | null;
  setActiveStep: (index: number | null) => void;
}) {
  const Icon = step.icon;
  return (
    <article
      className={`journey-step journey-step--${step.kind}${activeStep === index ? ' journey-step--active' : ''}`}
      tabIndex={0}
      aria-label={`Step ${step.number}: ${step.title}`}
      onMouseEnter={() => setActiveStep(index)}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) setActiveStep(null);
      }}
      onFocus={() => setActiveStep(index)}
      onBlur={() => setActiveStep(null)}
    >
      <span className="journey-step__number" aria-hidden="true">{step.number}</span>
      {step.kind === 'ready' ? (
        <>
          <div className="journey-step__identity-top">
            <div className="journey-step__brand"><BrandLogo size="sm" showText={false} /><span>Apex Filings</span></div>
            <svg className="journey-step__flag" viewBox="0 0 28 18" role="img" aria-label="United States flag">
              <rect width="28" height="18" rx="2" fill="#fff" />
              <path d="M0 1h28M0 5h28M0 9h28M0 13h28M0 17h28" stroke="#d73936" strokeWidth="2" />
              <rect width="12" height="9" rx="1" fill="#244878" />
              <path d="M2 2h1m2 0h1m2 0h1M3 4h1m2 0h1m2 0h1M2 6h1m2 0h1m2 0h1" stroke="#fff" strokeWidth="1" />
            </svg>
          </div>
          <div className="journey-step__identity-name">Rapid Ventures LLC <span className="ml-1 rounded-full bg-[#fff0ea] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-[#c52e0f]">Sample</span></div>
          <p className="journey-step__identity-type">US Limited Liability Company</p>
          <div className="journey-step__ready-status">
            <span>Your Business Is Ready</span>
            <span className="journey-step__active-status"><Check size={13} strokeWidth={3} aria-hidden="true" /> Active</span>
          </div>
        </>
      ) : (
        <>
          <span className="journey-step__icon" aria-hidden="true"><Icon size={27} strokeWidth={1.8} /></span>
          <h3 className="journey-step__title">{step.title}</h3>
          {step.kind === 'state' && (
            <div className="journey-step__detail journey-step__state">
              <MapPin size={14} aria-hidden="true" /> Wyoming <ChevronDown size={13} className="journey-step__chevron" aria-hidden="true" />
              <span className="journey-step__check"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
            </div>
          )}
          {step.kind === 'llc' && (
            <div className="journey-step__detail journey-step__progress">
              <span>Application Started</span>
              <span className="journey-step__progress-track"><span /></span>
            </div>
          )}
          {step.kind === 'ein' && (
            <div className="journey-step__detail journey-step__ein-status">
              <span className="journey-step__check"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
              Ready for Processing
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function FormationJourney() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHasEntered(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`formation-journey${hasEntered ? ' formation-journey--visible' : ''}`} aria-label="Your journey to a US business">
      <div className="formation-journey__scene">
        <WorldMapBackdrop />
        <div className="formation-journey__label">Your journey to a US business <ArrowRight size={14} aria-hidden="true" /></div>
        <svg className="journey-path" viewBox="0 0 1200 380" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <marker id="journey-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 7 3.5 0 7" fill="none" stroke="#F04623" strokeWidth="1.8" />
            </marker>
          </defs>
          <path className={`journey-path__segment${activeStep === 0 || activeStep === 1 ? ' journey-path__segment--active' : ''}`} d="M246 181 C285 181 292 258 323 258" markerEnd="url(#journey-arrow)" />
          <path className={`journey-path__segment${activeStep === 1 || activeStep === 2 ? ' journey-path__segment--active' : ''}`} d="M527 258 C566 258 576 299 603 299" markerEnd="url(#journey-arrow)" />
          <path className={`journey-path__segment${activeStep === 2 || activeStep === 3 ? ' journey-path__segment--active' : ''}`} d="M805 299 C855 299 852 187 878 187" markerEnd="url(#journey-arrow)" />
        </svg>
        <div className="formation-journey__steps">
          {journeySteps.map((step, index) => (
            <JourneyStep key={step.number} step={step} index={index} activeStep={activeStep} setActiveStep={setActiveStep} />
          ))}
        </div>
      </div>
      <div className="formation-journey__trust" aria-label="Apex Filings platform benefits">
        {trustPills.map(({ label, icon: Icon }) => (
          <span className="formation-journey__trust-pill" key={label}>
            <Icon size={17} strokeWidth={2.2} aria-hidden="true" /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
