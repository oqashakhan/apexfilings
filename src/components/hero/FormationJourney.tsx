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
  { number: '01', title: 'Select Your Formation State', kind: 'state', icon: MapPin },
  { number: '02', title: 'Register Your US Company', kind: 'llc', icon: FileText },
  { number: '03', title: 'Apply for Your EIN', kind: 'ein', icon: IdCard },
  { number: '04', title: 'Your Company Dashboard', kind: 'ready', icon: Check },
];

const trustPills = [
  { label: '100% Online', icon: Zap },
  { label: 'Track Your Progress', icon: ChartNoAxesColumnIncreasing },
  { label: 'Documents in One Place', icon: Folder },
];

function JourneyStep({ step, index, activeStep, setActiveStep }: {
  step: JourneyStepData;
  index: number;
  activeStep: number | null;
  setActiveStep: (index: number | null) => void;
}) {
  const Icon = step.icon;
  return (
    <article
      className={`journey-step journey-step--${step.kind} premium-glass premium-glass--frosted${step.kind === 'ready' ? ' premium-glass--accent' : ''}${activeStep === index ? ' journey-step--active' : ''}`}
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
          <div className="journey-step__identity-name">Your Company Dashboard <span className="ml-1 rounded-full bg-[#fff0ea] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-[#c52e0f]">Sample</span></div>
          <p className="journey-step__identity-type">US Limited Liability Company</p>
          <div className="journey-step__ready-status">
            <span>Your Company Is Set Up</span>
            <span className="journey-step__active-status"><Check size={13} strokeWidth={3} aria-hidden="true" /> Demo Active</span>
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
              <span>Formation Request Started</span>
              <span className="journey-step__progress-track"><span /></span>
            </div>
          )}
          {step.kind === 'ein' && (
            <div className="journey-step__detail journey-step__ein-status">
              <span className="journey-step__check"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
              EIN Application Prepared
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
          <span className="formation-journey__trust-pill premium-glass" key={label}>
            <Icon size={17} strokeWidth={2.2} aria-hidden="true" /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
