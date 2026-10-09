import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronDown, Eye, EyeOff, Globe2, LockKeyhole } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import { z } from 'zod';
import { US_STATES } from '../../data/usStates';
import { COUNTRIES } from '../../data/countries';
import { SearchSelect } from './SearchSelect';
import './StartPage.css';

const schema = z.object({
  businessType: z.literal('LLC', { error: 'Select LLC to continue.' }),
  country: z.string().refine(value => COUNTRIES.some(item => item.code === value), 'Choose your country from the list.'),
  formationState: z.string().refine(value => US_STATES.some(item => item.availableForFormation && item.code === value), 'Choose a state from the list.'),
  businessName: z.string().trim().min(1, 'Enter your preferred business name.').max(150, 'Use 150 characters or fewer.'),
  fullName: z.string().trim().min(1, 'Enter your full name.').max(150, 'Use 150 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
}).refine(values => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
type Answers = z.infer<typeof schema>;
const fields: (keyof Answers)[][] = [['businessType'], ['country'], ['formationState'], ['businessName'], ['fullName', 'email', 'password', 'confirmPassword']];
const labels = ['Business', 'Residence', 'State', 'Name', 'Account'];
const questions = ['What type of business would you like to start?', 'Where do you currently live?', 'In which US state would you like to form your company?', 'What would you like to name your business?', 'Create your Apex Filings account'];
const DRAFT_KEY = 'apex-registration-draft-v1';
const draftFields = ['businessType', 'country', 'formationState', 'businessName', 'fullName', 'email'] as const;

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
  const [showPassword, setShowPassword] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const [defaults] = useState(() => {
    const selectedState = US_STATES.find(state => state.availableForFormation && (state.code.toLowerCase() === initialState?.toLowerCase() || state.name.toLowerCase() === initialState?.toLowerCase()));
    return { businessType: undefined, country: '', formationState: '', businessName: '', fullName: '', email: '', ...readDraft(), ...(selectedState ? { formationState: selectedState.code } : {}), password: '', confirmPassword: '' };
  });
  const { register, control, watch, trigger, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Answers>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: defaults });
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
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step, draftSaved]);
  const move = (next: number) => { setStep(next); window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' }); };
  const saveDraft = () => {
    // Registration has no backend yet. This is a draft, never an account creation.
    // The session allowlist deliberately excludes both password fields.
    setValue('password', ''); setValue('confirmPassword', ''); setDraftSaved(true);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 4) { await handleSubmit(saveDraft)(); return; }
    if (await trigger(fields[step], { shouldFocus: true })) move(step + 1);
  };
  const errorFor = (field: keyof Answers) => errors[field] ? <p id={`${field}-error`} className="wizard-error" role="alert">{errors[field]?.message}</p> : null;

  return <main className="registration-wizard">
    <header className="wizard-header">
      <button className="wizard-back" type="button" aria-label="Back" onClick={() => { if (draftSaved) setDraftSaved(false); else if (step > 0) move(step - 1); else onBackToSite(); }}><ArrowLeft size={18} aria-hidden="true" /><span>Back</span></button>
      <a href="/" className="wizard-brand" aria-label="Apex Filings home"><img src="/images/apex-navbar-logo.png" alt="" width="42" height="42" /><span>Apex Filings</span></a>
    </header>
    <div className="wizard-shell">
      <div className="wizard-progress-caption"><span>LET’S BUILD YOUR NEXT CHAPTER</span><span>Step {step + 1} of 5</span></div>
      <ol className="wizard-progress" aria-label="Registration progress">
        {labels.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-complete={index < step}><span className="wizard-progress-bar" /><span className="wizard-progress-label">{index < step ? <Check size={12} aria-hidden="true" /> : <span>0{index + 1}</span>} {label}<span className="sr-only">{index < step ? ', completed' : index === step ? ', current step' : ''}</span></span></li>)}
      </ol>
      {draftSaved ? <section className="wizard-saved">
        <CheckCircle2 size={40} className="text-[#F04623]" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1}>Your details are ready.</h1>
        <p>{storageUnavailable ? 'Your answers are retained while this page stays open.' : 'Your answers are saved for this browser tab’s session.'} Account creation is not available yet. No account has been created and nothing has been submitted.</p>
        <p>Passwords have been cleared. You can review your details or contact us for help with your next steps.</p>
        <button type="button" className="wizard-continue" onClick={() => { setDraftSaved(false); move(0); }}>Review My Details <ArrowRight size={18} /></button>
        <a href="/contact" className="wizard-text-link">Contact Apex Filings</a>
      </section> : <form onSubmit={submit} noValidate>
        <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }} className="wizard-screen">
          <div className="wizard-question-icon" aria-hidden="true">{step === 1 ? <Globe2 size={25} /> : step === 4 ? <LockKeyhole size={25} /> : <Building2 size={25} />}</div>
          <h1 ref={headingRef} tabIndex={-1}>{questions[step]}</h1>
          <p className="wizard-intro">{['A clear foundation for your next idea. Choose your business structure to begin.', 'Select your country of residence so we can understand your starting point.', 'Choose the state that fits your plans. You can review your choice later.', 'You can change this later. Final name availability depends on the relevant state’s records.', 'Your initial details are all we need here. Your full application comes later.'][step]}</p>
          <div className="wizard-fields">
            {step === 0 && <fieldset><legend className="sr-only">Business type</legend><label className="wizard-business-option"><input type="radio" value="LLC" {...register('businessType')} /><span className="wizard-option-icon"><Building2 size={25} /></span><span><strong>Limited Liability Company</strong><span>LLC · US business formation</span></span><span className="wizard-radio-check"><Check size={15} /></span></label>{errorFor('businessType')}<p className="wizard-hint">LLC formation is currently available through Apex Filings.</p></fieldset>}
            {step === 1 && <Controller name="country" control={control} render={({ field }) => <SearchSelect id="country" label="Country of residence" options={COUNTRIES} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.country?.message} />} />}
            {step === 2 && <><Controller name="formationState" control={control} render={({ field }) => <SearchSelect id="formationState" label="Formation state" options={US_STATES.filter(state => state.availableForFormation)} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.formationState?.message} />} /><details className="wizard-state-help"><summary>Help me choose a state <ChevronDown size={16} /></summary><p>Consider where your business will operate, the state filing fee, and recurring reports and compliance costs. Operating in another state may involve additional registration requirements. Review official state requirements or consult a qualified adviser for your circumstances.</p><a href="/contact" target="_blank" rel="noreferrer">Ask our team about the process ↗</a></details></>}
            {step === 3 && <div><label htmlFor="businessName">Preferred business name</label><input id="businessName" placeholder="Enter your preferred business name" autoComplete="organization" maxLength={150} {...register('businessName')} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? 'businessName-error' : undefined} />{errorFor('businessName')}</div>}
            {step === 4 && <>
              <div className="wizard-integration-note">Account creation is not live yet. Continue to save your details for this session; no account will be created. Passwords are never saved.</div>
              {(['fullName', 'email'] as const).map(field => <div key={field}><label htmlFor={field}>{field === 'fullName' ? 'Full Name' : 'Email Address'}</label><input id={field} type={field === 'email' ? 'email' : 'text'} autoComplete={field === 'email' ? 'email' : 'name'} {...register(field)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} />{errorFor(field)}</div>)}
              {(['password', 'confirmPassword'] as const).map(field => <div key={field}><label htmlFor={field}>{field === 'password' ? 'Password' : 'Confirm Password'}</label><div className="wizard-password"><input id={field} type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register(field)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : field === 'password' ? 'password-help' : undefined} /><button type="button" aria-label={`${showPassword ? 'Hide' : 'Show'} ${field === 'password' ? 'password' : 'confirm password'}`} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{field === 'password' && <p id="password-help" className="wizard-hint">Use at least 8 characters.</p>}{errorFor(field)}</div>)}
              <p className="wizard-hint">Terms of Service and Privacy Policy will be available before account registration launches.</p>
            </>}
          </div>
          {storageUnavailable && <p className="wizard-hint" role="status">Browser session storage is unavailable. Keep this page open to retain your answers.</p>}
          <button type="submit" className="wizard-continue" disabled={isSubmitting || (step === 0 && values.businessType !== 'LLC')}>{step === 4 ? 'Create Account & Continue' : 'Continue'}<ArrowRight size={18} aria-hidden="true" /></button>
          <p className="wizard-footnote"><LockKeyhole size={13} aria-hidden="true" />{step === 4 ? 'Session draft only · registration coming soon' : 'No payment or documents needed at this stage'}</p>
        </motion.div>
      </form>}
    </div>
  </main>;
}
