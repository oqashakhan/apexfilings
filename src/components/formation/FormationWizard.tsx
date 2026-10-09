import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, CircleHelp, Eye, EyeOff, FileCheck2, Globe2, LockKeyhole, MapPin, Search, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react';
import { PRICING_PLANS } from '../../data/pricing';
import { US_STATES } from '../../data/usStates';
import { registerApplicant } from '../../lib/registerApplicant';
import './FormationWizard.css';

const steps = [
  { label: 'Welcome', icon: Sparkles },
  { label: 'Structure', icon: Building2 },
  { label: 'Formation state', icon: MapPin },
  { label: 'Package', icon: Wallet },
  { label: 'Your account', icon: LockKeyhole },
  { label: 'Business details', icon: BriefcaseBusiness },
  { label: 'Ownership & EIN', icon: Users },
  { label: 'Review', icon: FileCheck2 },
  { label: 'Checkout', icon: ShieldCheck },
];
const popularCodes = ['WY', 'DE', 'TX', 'FL'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  alternateName: string;
  activity: string;
  description: string;
  owners: string;
  einHelp: boolean;
};

function findState(value: string | null) {
  if (!value) return undefined;
  return US_STATES.find(state => state.code.toLowerCase() === value.toLowerCase() || state.name.toLowerCase().replace(/\s+/g, '-') === value.toLowerCase().replace(/\s+/g, '-'));
}

export function FormationWizard() {
  const [entry] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedState = query.get('state');
    return {
      source: query.get('source') || 'direct',
      requestedState,
      initialState: findState(requestedState)?.code || '',
      plan: PRICING_PLANS.some(plan => plan.id === query.get('plan')) ? query.get('plan')! : '',
      residency: query.get('residency') === 'non-us' ? 'non-us' as const : 'us' as const,
      service: 'llc-formation',
    };
  });
  const [step, setStep] = useState(0);
  const [stateCode, setStateCode] = useState(entry.initialState);
  const [search, setSearch] = useState('');
  const [planId, setPlanId] = useState(entry.plan);
  const [residency, setResidency] = useState<'us' | 'non-us'>(entry.residency);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState<FormValues>({
    fullName: '', email: '', password: '', confirmPassword: '', businessName: '',
    alternateName: '', activity: '', description: '', owners: '1', einHelp: true,
  });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const selectedState = US_STATES.find(state => state.code === stateCode);
  const selectedPlan = PRICING_PLANS.find(plan => plan.id === planId);
  const servicePrice = selectedPlan ? residency === 'us' ? selectedPlan.priceUsResident : selectedPlan.priceNonUsResident : null;
  const filteredStates = US_STATES.filter(state => `${state.name} ${state.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  const change = <K extends keyof FormValues>(key: K, value: FormValues[K]) => { setValues(previous => ({ ...previous, [key]: value })); setError(''); };
  const move = (next: number) => {
    setError('');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const stateForUrl = US_STATES.find(state => state.code === stateCode);
    if (stateForUrl) query.set('state', stateForUrl.name.toLowerCase().replace(/\s+/g, '-'));
    if (planId) query.set('plan', planId);
    query.set('residency', residency);
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }, [stateCode, planId, residency]);

  useEffect(() => {
    document.title = 'Form Your LLC | Apex Filings';
    return () => { document.title = 'Apex Filings | Start Your US Business With Confidence'; };
  }, []);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [step]);

  const continueStep = async () => {
    if (step === 0 || step === 1) { move(step + 1); return; }
    if (step === 2) {
      if (!selectedState) { setError('Choose a formation state to continue.'); return; }
      move(3); return;
    }
    if (step === 3) {
      if (!selectedPlan) { setError('Choose a formation package to continue.'); return; }
      move(4); return;
    }
    if (step === 4) {
      if (accountCreated) { move(5); return; }
      if (!values.fullName.trim() || values.fullName.trim().length > 150) { setError('Enter your full name (150 characters or fewer).'); return; }
      if (!emailPattern.test(values.email.trim())) { setError('Enter a valid email address.'); return; }
      if (values.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
      if (values.password !== values.confirmPassword) { setError('Passwords do not match.'); return; }
      if (!selectedState || !selectedPlan) { setError('Complete your state and package selections first.'); return; }
      setSubmitting(true);
      try {
        const names = values.fullName.trim().split(/\s+/);
        await registerApplicant({
          businessType: 'LLC',
          formationState: selectedState.code,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          email: values.email.trim(),
          password: values.password,
          formationContext: {
            entrySource: entry.source, formationState: selectedState.code,
            planId: selectedPlan.id, residency, serviceId: entry.service,
          },
        });
        setValues(previous => ({ ...previous, password: '', confirmPassword: '' }));
        setAccountCreated(true);
        move(5);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Account creation is unavailable. Please try again later.');
      } finally { setSubmitting(false); }
      return;
    }
    if (!accountCreated) { move(4); return; }
    if (step === 5) {
      if (!values.businessName.trim() || !values.activity.trim()) { setError('Enter a preferred business name and your main business activity.'); return; }
      move(6); return;
    }
    if (step === 6) {
      if (!Number.isInteger(Number(values.owners)) || Number(values.owners) < 1 || Number(values.owners) > 100) { setError('Enter a number of owners between 1 and 100.'); return; }
      move(7); return;
    }
    if (step === 7) { move(8); }
  };

  const field = (key: 'fullName' | 'email' | 'businessName' | 'alternateName' | 'activity' | 'description', label: string, hint?: string) => <label className="formation-field" htmlFor={key}>
    <span>{label}</span>
    {key === 'description' ? <textarea id={key} value={values[key]} onChange={event => change(key, event.target.value)} rows={3} maxLength={500} /> : <input id={key} value={values[key]} onChange={event => change(key, event.target.value)} type={key === 'email' ? 'email' : 'text'} autoComplete={key === 'fullName' ? 'name' : key === 'email' ? 'email' : key === 'businessName' ? 'organization' : 'off'} maxLength={150} />}
    {hint && <small>{hint}</small>}
  </label>;

  return <main className="formation">
    <header className="formation-header">
      <a className="formation-brand" href="/" aria-label="Apex Filings home"><img src="/images/apex-navbar-logo.png" alt="" width="38" height="38" /><span>Apex <strong>Filings</strong></span></a>
      <a className="formation-back-site" href="/"><ArrowLeft size={16} aria-hidden="true" /> Back to website</a>
    </header>
    <div className="formation-shell">
      <aside className="formation-sidebar" aria-label="Formation progress">
        <div className="formation-sidebar-kicker"><span className="formation-kicker-dot" /> YOUR FORMATION JOURNEY</div>
        <h2>Build with clarity.</h2>
        <p>One thoughtful step at a time.</p>
        <ol>
          {steps.map((item, index) => {
            const Icon = item.icon;
            return <li key={item.label} aria-current={index === step ? 'step' : undefined} className={index === step ? 'current' : index < step ? 'complete' : ''}>
              <span className="formation-step-icon">{index < step ? <Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}</span>
              <span><strong>{item.label}</strong><small>{index < step ? 'Completed' : index === step ? 'In progress' : 'Upcoming'}</small></span>
            </li>;
          })}
        </ol>
        <div className="formation-sidebar-help"><CircleHelp size={20} aria-hidden="true" /><div><strong>Need a hand?</strong><a href="/contact">Talk to our team <ArrowRight size={14} /></a></div></div>
      </aside>
      <div className="formation-main">
        <div className="formation-mobile-progress" aria-label="Formation progress"><span>Step {step + 1} of {steps.length} · {steps[step].label}</span><strong>{Math.round(((step + 1) / steps.length) * 100)}%</strong><div role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Formation steps completed"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
        <div className="formation-content" key={step}>
          <div className="formation-eyebrow">STEP {String(step + 1).padStart(2, '0')} <span /> {steps[step].label.toUpperCase()}</div>
          {step === 0 && <>
            <h1 ref={titleRef} tabIndex={-1}>Let's Get Your Business Started</h1>
            <p className="formation-lead">Tell us a little about what you'd like to do. We'll guide you through the details.</p>
            <div className="formation-entry-grid">
              <div className="formation-choice selected"><span className="formation-choice-icon"><Building2 size={24} /></span><BadgeCheck className="formation-choice-check" size={21} /><h3>Start a New Business</h3><p>I'm ready to form a new US company.</p><span className="formation-choice-status">Selected journey</span></div>
              <div className="formation-choice unavailable"><span className="formation-choice-icon"><BriefcaseBusiness size={24} /></span><h3>I Already Have a Business</h3><p>I have an existing company and need business services.</p><a href="/#services">Explore existing-business services <ArrowRight size={14} /></a></div>
            </div>
            {entry.initialState && <div className="formation-prefill"><MapPin size={18} /> You selected <strong>{selectedState?.name}</strong>. We’ll carry it into your formation steps.</div>}
          </>}
          {step === 1 && <>
            <h1 ref={titleRef} tabIndex={-1}>Choose Your Business Structure</h1>
            <p className="formation-lead">Select the structure you want to form. You can review details with our team before filing.</p>
            <div className="formation-entity-card selected"><span className="formation-choice-icon"><Building2 size={26} /></span><div><span className="formation-card-meta">AVAILABLE FOR FORMATION</span><h3>Limited Liability Company <span>LLC</span></h3><p>A flexible US company structure with a separate legal entity. Formation requirements vary by state.</p><ul><li><Check size={15} /> Available in all 50 states</li><li><Check size={15} /> Choose a package that fits your needs</li></ul></div><BadgeCheck size={22} /></div>
            <p className="formation-muted">Other entity structures are not available in this online flow. <a href="/contact">Contact us</a> to discuss your options.</p>
          </>}
          {step === 2 && <>
            <h1 ref={titleRef} tabIndex={-1}>Where Would You Like to Form Your Business?</h1>
            <p className="formation-lead">Choose a US state to start with. You can change your choice before placing an order.</p>
            {entry.requestedState && !entry.initialState && <div className="formation-note" role="status">We couldn’t match “{entry.requestedState}” to a state. Please choose one below.</div>}
            <h2 className="formation-section-title">Popular states</h2>
            <div className="formation-state-grid">{popularCodes.map(code => { const state = US_STATES.find(item => item.code === code)!; return <button key={code} type="button" className={`formation-state-card ${stateCode === code ? 'selected' : ''}`} aria-pressed={stateCode === code} onClick={() => { setStateCode(code); setError(''); }}><span className="formation-choice-icon"><MapPin size={20} /></span><strong>{state.name}</strong><small>Form an LLC in {state.name}</small>{stateCode === code && <BadgeCheck size={20} className="formation-choice-check" />}</button>; })}</div>
            <label className="formation-field" htmlFor="state-search"><span>Search all states</span><span className="formation-search"><Search size={18} aria-hidden="true" /><input id="state-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by state name or abbreviation" /></span></label>
            {search.trim() && <div className="formation-search-results" aria-label="Matching states">{filteredStates.length ? filteredStates.map(state => <button key={state.code} type="button" onClick={() => { setStateCode(state.code); setSearch(''); setError(''); }}>{state.name} <span>{state.code}</span></button>) : <p>No states match your search.</p>}</div>}
            {selectedState && <div className="formation-prefill"><BadgeCheck size={18} /> Selected: <strong>{selectedState.name}</strong></div>}
          </>}
          {step === 3 && <>
            <h1 ref={titleRef} tabIndex={-1}>Choose Your Formation Package</h1>
            <p className="formation-lead">Compare Apex Filings service fees. Government filing fees depend on your selected state and must be confirmed before checkout.</p>
            <fieldset className="formation-residency"><legend>Residency for package pricing</legend><div><button type="button" aria-pressed={residency === 'us'} className={residency === 'us' ? 'active' : ''} onClick={() => setResidency('us')}>US resident</button><button type="button" aria-pressed={residency === 'non-us'} className={residency === 'non-us' ? 'active' : ''} onClick={() => setResidency('non-us')}>Outside the US</button></div></fieldset>
            <div className="formation-plan-grid">{PRICING_PLANS.map(plan => <button key={plan.id} type="button" className={`formation-plan-card ${planId === plan.id ? 'selected' : ''}`} aria-pressed={planId === plan.id} onClick={() => { setPlanId(plan.id); setError(''); }}><span className="formation-plan-top"><span><small>{plan.subtitle}</small><strong>{plan.name}</strong></span>{planId === plan.id ? <BadgeCheck size={22} /> : <span className="formation-empty-radio" />}</span><span className="formation-plan-price">${residency === 'us' ? plan.priceUsResident : plan.priceNonUsResident} <small>+ state filing fee</small></span><span className="formation-plan-description">{plan.description}</span><span className="formation-plan-features">{plan.features.slice(0, 5).map(feature => <span key={feature}><Check size={15} />{feature}</span>)}</span><span className="formation-plan-select">{planId === plan.id ? 'Selected package' : 'Select package'} <ArrowRight size={17} /></span></button>)}</div>
            <div className="formation-fee-note"><Globe2 size={19} /><span><strong>About state fees</strong> Your package price is the Apex Filings service fee. The government filing fee and final total are pending confirmation for {selectedState?.name || 'your state'}.</span></div>
          </>}
          {step === 4 && <>
            <h1 ref={titleRef} tabIndex={-1}>Save Your Progress — Create Your Account</h1>
            <p className="formation-lead">Your {selectedState?.name} LLC and {selectedPlan?.name} package are ready to connect to your Apex Filings account.</p>
            <div className="formation-note"><LockKeyhole size={19} /><span>Account creation is not connected yet. Your information will not be submitted or saved; no account will be created until the secure service is available.</span></div>
            <div className="formation-form-grid">{field('fullName', 'Full name')}{field('email', 'Email address')}</div>
            <div className="formation-form-grid">{(['password', 'confirmPassword'] as const).map(key => <label className="formation-field" htmlFor={key} key={key}><span>{key === 'password' ? 'Password' : 'Confirm password'}</span><span className="formation-password"><input id={key} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values[key]} onChange={event => change(key, event.target.value)} /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={`${showPassword ? 'Hide' : 'Show'} passwords`}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{key === 'password' && <small>At least 8 characters.</small>}</label>)}</div>
            <p className="formation-muted">Already have an account? <a href="/contact">Contact us for access</a>. The client login is not available yet.</p>
          </>}
          {step === 5 && <>
            <h1 ref={titleRef} tabIndex={-1}>Tell Us About Your Business</h1><p className="formation-lead">Share the details you want to use for your new LLC. Name availability requires verification with the state.</p>
            <div className="formation-form-grid">{field('businessName', 'Preferred company name', 'We will not claim this name is available until it is checked.')}{field('alternateName', 'Alternative company name (optional)')}</div>
            {field('activity', 'Main business activity or industry')}{field('description', 'Short business description (optional)')}
          </>}
          {step === 6 && <>
            <h1 ref={titleRef} tabIndex={-1}>Business Ownership Details</h1><p className="formation-lead">For now, we only need a high-level picture. Personal identity and tax details require a secure backend-supported form.</p>
            <label className="formation-field" htmlFor="owners"><span>Number of LLC members</span><input id="owners" type="number" min="1" max="100" value={values.owners} onChange={event => change('owners', event.target.value)} /></label>
            <label className="formation-check"><input type="checkbox" checked={values.einHelp} onChange={event => change('einHelp', event.target.checked)} /> I would like help with an EIN application</label>
            <div className="formation-note">Member names, ownership percentages and sensitive tax information will be collected only through a secure supported process.</div>
          </>}
          {step === 7 && <>
            <h1 ref={titleRef} tabIndex={-1}>Review Your Business Formation</h1><p className="formation-lead">Check your selections before moving to checkout.</p>
            <div className="formation-review">{[['Structure', 'Limited Liability Company'], ['Formation state', selectedState?.name || '—'], ['Package', selectedPlan?.name || '—'], ['Preferred name', values.businessName || '—'], ['Main activity', values.activity || '—'], ['Members', values.owners], ['EIN assistance', values.einHelp ? 'Requested' : 'Not requested']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
            <div className="formation-review-price"><span>Apex Filings service fee</span><strong>${servicePrice}</strong><span>Government state filing fee</span><strong>Pending confirmation</strong><span>Final total</span><strong>Available after fee confirmation</strong></div>
            <div className="formation-edit-links"><button type="button" onClick={() => move(2)}>Edit state</button><button type="button" onClick={() => move(3)}>Edit package</button><button type="button" onClick={() => move(5)}>Edit business details</button></div>
          </>}
          {step === 8 && <>
            <h1 ref={titleRef} tabIndex={-1}>Complete Your Business Formation Order</h1><p className="formation-lead">Your formation choices are ready. Payment will be available after the state filing fee and total are verified.</p>
            <div className="formation-checkout"><ShieldCheck size={28} /><h2>Secure checkout integration pending</h2><p>No payment method will be collected on this page. No order has been placed and no charge has been made.</p><div><span>Apex Filings service fee</span><strong>${servicePrice}</strong></div><div><span>Government filing fee</span><strong>Pending confirmation</strong></div><div><span>Total</span><strong>Not available yet</strong></div></div>
            <a href="/contact" className="formation-contact-link">Contact Apex Filings about your formation <ArrowRight size={17} /></a>
          </>}
          {error && <p className="formation-error" role="alert">{error}</p>}
          <div className="formation-actions"><button className="formation-prev" type="button" onClick={() => step === 0 ? window.location.assign('/') : move(step - 1)}><ArrowLeft size={17} /> {step === 0 ? 'Website' : 'Back'}</button>{step < 8 && <button className="formation-next" type="button" onClick={continueStep} disabled={submitting}>{submitting ? 'Connecting…' : step === 4 ? 'Create account & continue' : step === 7 ? 'Continue to checkout' : 'Continue'} <ArrowRight size={17} /></button>}</div>
          <div className="formation-bottom-note"><ShieldCheck size={16} /> We only ask for information needed at each step.</div>
        </div>
      </div>
    </div>
  </main>;
}
