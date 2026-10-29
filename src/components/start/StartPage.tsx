import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Building2, Check, ChevronDown, Eye, EyeOff, Globe2, LockKeyhole } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import { z } from 'zod';
import { US_STATES } from '../../data/usStates';
import { COUNTRIES } from '../../data/countries';
import { SearchSelect } from './SearchSelect';
import './StartPage.css';
import { dashboardOnboardingApplicationUrl, dashboardOnboardingLoginUrl, dashboardOnboardingUrl } from '../../lib/dashboardLinks';

const schema = z.object({
  businessType: z.literal('LLC', { error: 'Select LLC to continue.' }),
  country: z.string().refine(value => COUNTRIES.some(item => item.code === value), 'Choose your country from the list.'),
  formationState: z.string().refine(value => US_STATES.some(item => item.availableForFormation && item.code === value), 'Choose a state from the list.'),
  businessName: z.string().trim().min(2, 'Enter a preferred business name of at least 2 characters.').max(150, 'Use 150 characters or fewer.'),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Use 120 characters or fewer.'),
  email: z.email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(5, 'Enter a valid phone number.').max(40, 'Use 40 characters or fewer.'),
  password: z.string().min(12, 'Use at least 12 characters.').max(128, 'Use 128 characters or fewer.').regex(/[a-z]/i, 'Include a letter.').regex(/\d/, 'Include a number.').regex(/[^a-z\d]/i, 'Include a symbol.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  acceptedTerms: z.boolean().refine(value => value, 'Accept the Terms and Privacy Policy to continue.'),
}).refine(values => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
type Answers = z.infer<typeof schema>;
const fields: (keyof Answers)[][] = [['businessType'], ['country'], ['formationState'], ['businessName'], ['fullName', 'email', 'phone', 'password', 'confirmPassword', 'acceptedTerms']];
const labels = ['Business', 'Residence', 'State', 'Name', 'Account'];
const questions = ['What type of business would you like to start?', 'Where do you currently live?', 'In which US state would you like to form your company?', 'What would you like to name your business?', 'Create Your Apex Filings Account'];
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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const [defaults] = useState(() => {
    const selectedState = US_STATES.find(state => state.availableForFormation && (state.code.toLowerCase() === initialState?.toLowerCase() || state.name.toLowerCase() === initialState?.toLowerCase()));
    return { businessType: undefined, country: '', formationState: '', businessName: '', ...readDraft(), ...(selectedState ? { formationState: selectedState.code } : {}), fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptedTerms: false };
  });
  const { register, control, watch, trigger, getValues, formState: { errors } } = useForm<Answers>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: defaults });
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
  const details = (answers: Answers) => ({ businessType: 'LLC' as const, country: answers.country, formationState: US_STATES.find(state => state.code === answers.formationState)?.name ?? '', preferredName: answers.businessName.trim() });
  const signIn = async () => {
    if (submittingRef.current || !(await trigger(fields.slice(0, 4).flat(), { shouldFocus: true }))) return;
    submittingRef.current = true; setBusy(true); setServerError('');
    try {
      const response = await fetch(dashboardOnboardingUrl('prepare'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details(getValues())) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not continue to sign in.');
      window.location.assign(dashboardOnboardingLoginUrl());
    } catch (error) { setServerError(error instanceof Error ? error.message : 'Could not connect to the dashboard. Please try again.'); submittingRef.current = false; setBusy(false); }
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !(await trigger(step === 4 ? undefined : fields[step], { shouldFocus: true }))) return;
    if (step < 4) { move(step + 1); return; }
    submittingRef.current = true; setBusy(true); setServerError('');
    const answers = getValues();
    try {
      const response = await fetch(dashboardOnboardingUrl('register'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: answers.fullName.trim(), email: answers.email.trim(), phone: answers.phone.trim(), password: answers.password, confirm: answers.confirmPassword, acceptedTerms: answers.acceptedTerms, details: details(answers) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Account could not be created. Please try again.');
      window.location.assign(dashboardOnboardingApplicationUrl());
    } catch (error) { setServerError(error instanceof Error ? error.message : 'Could not connect to the dashboard. Please try again.'); submittingRef.current = false; setBusy(false); }
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
          <p className="wizard-intro">{['A clear foundation for your next idea. Choose your business structure to begin.', 'Select your country of residence so we can understand your starting point.', 'Choose the state that fits your plans. You can review your choice later.', 'You can change this later. Final name availability depends on the relevant state’s records.', "You're almost there! Create your account to securely save your company details and continue your LLC formation."][step]}</p>
          <div className="wizard-fields">
            {step === 0 && <fieldset><legend className="sr-only">Business type</legend><label className="wizard-business-option"><input type="radio" value="LLC" {...register('businessType')} /><span className="wizard-option-icon"><Building2 size={25} /></span><span><strong>Limited Liability Company</strong><span>LLC · US business formation</span></span><span className="wizard-radio-check"><Check size={15} /></span></label>{errorFor('businessType')}<p className="wizard-hint">LLC formation is currently available through Apex Filings.</p></fieldset>}
            {step === 1 && <Controller name="country" control={control} render={({ field }) => <SearchSelect id="country" label="Country of residence" options={COUNTRIES} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.country?.message} />} />}
            {step === 2 && <><Controller name="formationState" control={control} render={({ field }) => <SearchSelect id="formationState" label="Formation state" options={US_STATES.filter(state => state.availableForFormation)} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={errors.formationState?.message} />} /><details className="wizard-state-help"><summary>Help me choose a state <ChevronDown size={16} /></summary><p>Consider where your business will operate, the state filing fee, and recurring reports and compliance costs. Operating in another state may involve additional registration requirements. Review official state requirements or consult a qualified adviser for your circumstances.</p><a href="/contact" target="_blank" rel="noreferrer">Ask our team about the process ↗</a></details></>}
            {step === 3 && <div><label htmlFor="businessName">Preferred business name</label><input id="businessName" placeholder="Enter your preferred business name" autoComplete="organization" maxLength={150} {...register('businessName')} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? 'businessName-error' : undefined} />{errorFor('businessName')}</div>}
            {step === 4 && <>
              <div className="wizard-account-grid">
                <div><label htmlFor="fullName">Full Name</label><input id="fullName" autoComplete="name" maxLength={120} {...register('fullName')} aria-invalid={!!errors.fullName} />{errorFor('fullName')}</div>
                <div><label htmlFor="email">Email Address</label><input id="email" type="email" autoComplete="email" maxLength={254} {...register('email')} aria-invalid={!!errors.email} />{errorFor('email')}</div>
                <div><label htmlFor="phone">Phone Number</label><input id="phone" type="tel" autoComplete="tel" maxLength={40} {...register('phone')} aria-invalid={!!errors.phone} />{errorFor('phone')}</div>
                <div><label htmlFor="password">Password</label><div className="wizard-password"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errorFor('password')}</div>
                <div><label htmlFor="confirmPassword">Confirm Password</label><div className="wizard-password"><input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} /><button type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errorFor('confirmPassword')}</div>
              </div>
              <p className="wizard-hint">Use 12–128 characters with a letter, number, and symbol.</p>
              <label className="wizard-terms"><input type="checkbox" {...register('acceptedTerms')} aria-invalid={!!errors.acceptedTerms} /><span>I accept the <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a> and <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span></label>{errorFor('acceptedTerms')}
            </>}
          </div>
          {storageUnavailable && <p className="wizard-hint" role="status">Browser session storage is unavailable. Keep this page open to retain your answers.</p>}
          {serverError && <p className="wizard-error" role="alert">{serverError}</p>}
          <button type="submit" className="wizard-continue" disabled={busy || (step === 0 && values.businessType !== 'LLC')}>{step === 4 ? busy ? 'Creating account…' : 'Create Account & Continue' : 'Continue'}<ArrowRight size={18} aria-hidden="true" /></button>
          {step === 4 && <p className="wizard-account-switch">Already have an account? <button type="button" disabled={busy} onClick={() => void signIn()}>Sign In</button></p>}
          <p className="wizard-footnote"><LockKeyhole size={13} aria-hidden="true" />{step === 4 ? 'Your account will be created securely in the Apex Filings dashboard' : 'No payment or documents needed at this stage'}</p>
        </motion.div>
      </form>
    </div>
  </main>;
}
