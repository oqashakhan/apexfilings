import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Building2, Check, ChevronDown, Globe2, LockKeyhole } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import { z } from 'zod';
import { US_STATES } from '../../data/usStates';
import { COUNTRIES } from '../../data/countries';
import { SearchSelect } from './SearchSelect';
import './StartPage.css';
import { dashboardApplicationUrl } from '../../lib/dashboardLinks';

const schema = z.object({
  businessType: z.literal('LLC', { error: 'Select LLC to continue.' }),
  country: z.string().refine(value => COUNTRIES.some(item => item.code === value), 'Choose your country from the list.'),
  formationState: z.string().refine(value => US_STATES.some(item => item.availableForFormation && item.code === value), 'Choose a state from the list.'),
  businessName: z.string().trim().min(1, 'Enter your preferred business name.').max(150, 'Use 150 characters or fewer.'),
});
type Answers = z.infer<typeof schema>;
const fields: (keyof Answers)[][] = [['businessType'], ['country'], ['formationState'], ['businessName'], []];
const labels = ['Business', 'Residence', 'State', 'Name', 'Continue'];
const questions = ['What type of business would you like to start?', 'Where do you currently live?', 'In which US state would you like to form your company?', 'What would you like to name your business?', 'Continue in your secure Apex Filings account'];
const DRAFT_KEY = 'apex-registration-draft-v1';
const draftFields = ['businessType', 'country', 'formationState', 'businessName'] as const;

function readDraft(): Partial<Answers> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');
    const clean: Record<string, string> = {};
    for (const field of draftFields) if (typeof saved?.[field] === 'string') clean[field] = saved[field];
    return clean as Partial<Answers>;
  } catch { return {}; }
}

export function StartPage({ onBackToSite, initialState }: { onBackToSite: () => void; initialState?: string }) {
  const [step, setStep] = useState(0);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const [defaults] = useState(() => {
    const selectedState = US_STATES.find(state => state.availableForFormation && (state.code.toLowerCase() === initialState?.toLowerCase() || state.name.toLowerCase() === initialState?.toLowerCase()));
    return { businessType: undefined, country: '', formationState: '', businessName: '', ...readDraft(), ...(selectedState ? { formationState: selectedState.code } : {}) };
  });
  const { register, control, watch, trigger, formState: { errors } } = useForm<Answers>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: defaults });
  const values = watch();
  useEffect(() => {
    const subscription = watch(answers => {
      const draft = Object.fromEntries(draftFields.map(key => [key, answers[key] ?? '']));
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); setStorageUnavailable(false); } catch { setStorageUnavailable(true); }
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  useEffect(() => {
    document.title = 'Start Your Business | Apex Filings';
    return () => { document.title = 'US LLC Formation for Non-Residents | Apex Filings'; };
  }, []);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step]);
  const move = (next: number) => { setStep(next); window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' }); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 4) { window.location.assign(dashboardApplicationUrl({ state: values.formationState })); return; }
    if (await trigger(fields[step], { shouldFocus: true })) move(step + 1);
  };
  const errorFor = (field: keyof Answers) => errors[field] ? <p id={`${field}-error`} className="wizard-error" role="alert">{errors[field]?.message}</p> : null;

  return <main className="registration-wizard">
    <header className="wizard-header">
      <button className="wizard-back" type="button" aria-label="Back" onClick={() => { if (step > 0) move(step - 1); else onBackToSite(); }}><ArrowLeft size={18} aria-hidden="true" /><span>Back</span></button>
      <a href="/" className="wizard-brand" aria-label="Apex Filings home"><img src="/images/apex-navbar-logo.png" alt="" width="42" height="42" /><span>Apex Filings</span></a>
    </header>
    <div className="wizard-shell">
      <div className="wizard-progress-caption"><span>LET’S BUILD YOUR NEXT CHAPTER</span><span>Step {step + 1} of 5</span></div>
      <ol className="wizard-progress" aria-label="Registration progress">
        {labels.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-complete={index < step}><span className="wizard-progress-bar" /><span className="wizard-progress-label">{index < step ? <Check size={12} aria-hidden="true" /> : <span>0{index + 1}</span>} {label}<span className="sr-only">{index < step ? ', completed' : index === step ? ', current step' : ''}</span></span></li>)}
      </ol>
      <form onSubmit={submit} noValidate>
        <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }} className="wizard-screen">
          <div className="wizard-question-icon" aria-hidden="true">{step === 1 ? <Globe2 size={25} /> : step === 4 ? <LockKeyhole size={25} /> : <Building2 size={25} />}</div>
          <h1 ref={headingRef} tabIndex={-1}>{questions[step]}</h1>
          <p className="wizard-intro">{['A clear foundation for your next idea. Choose your business structure to begin.', 'Select your country of residence so we can understand your starting point.', 'Choose the state that fits your plans. You can review your choice later.', 'You can change this later. Final name availability depends on the relevant state’s records.', 'Sign in or create an account to complete your application securely. Your selected state will carry over; enter your preferred business name in the dashboard.'][step]}</p>
          <div className="wizard-fields">
            {step === 0 && <fieldset><legend className="sr-only">Business type</legend><label className="wizard-business-option"><input type="radio" value="LLC" {...register('businessType')} /><span className="wizard-option-icon"><Building2 size={25} /></span><span><strong>Limited Liability Company</strong><span>LLC · US business formation</span></span><span className="wizard-radio-check"><Check size={15} /></span></label>{errorFor('businessType')}<p className="wizard-hint">LLC formation is currently available through Apex Filings.</p></fieldset>}
            {step === 1 && <Controller name="country" control={control} render={({ field }) => <SearchSelect id="country" label="Country of residence" options={COUNTRIES} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.country?.message} />} />}
            {step === 2 && <><Controller name="formationState" control={control} render={({ field }) => <SearchSelect id="formationState" label="Formation state" options={US_STATES.filter(state => state.availableForFormation)} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.formationState?.message} />} /><details className="wizard-state-help"><summary>Help me choose a state <ChevronDown size={16} /></summary><p>Consider where your business will operate, the state filing fee, and recurring reports and compliance costs. Operating in another state may involve additional registration requirements. Review official state requirements or consult a qualified adviser for your circumstances.</p><a href="/contact" target="_blank" rel="noreferrer">Ask our team about the process ↗</a></details></>}
            {step === 3 && <div><label htmlFor="businessName">Preferred business name</label><input id="businessName" placeholder="Enter your preferred business name" autoComplete="organization" maxLength={150} {...register('businessName')} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? 'businessName-error' : undefined} />{errorFor('businessName')}</div>}
            {step === 4 && <div className="wizard-integration-note">You’ll continue on the secure Apex Filings dashboard. No account or application has been created by this website form.</div>}
          </div>
          {storageUnavailable && <p className="wizard-hint" role="status">Browser session storage is unavailable. Keep this page open to retain your answers.</p>}
          <button type="submit" className="wizard-continue" disabled={step === 0 && values.businessType !== 'LLC'}>{step === 4 ? 'Continue to Secure Dashboard' : 'Continue'}<ArrowRight size={18} aria-hidden="true" /></button>
          <p className="wizard-footnote"><LockKeyhole size={13} aria-hidden="true" />{step === 4 ? 'Account and application details stay in the dashboard' : 'No payment or documents needed at this stage'}</p>
        </motion.div>
      </form>
    </div>
  </main>;
}
