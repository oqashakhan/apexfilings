import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Building2, CircleHelp, Landmark, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { US_STATES } from '../../data/usStates';
import { registerApplicant, type RegistrationResult } from '../../lib/registerApplicant';
import { BrandLogo } from '../ui/BrandLogo';

const onboardingSchema = z.object({
  businessType: z.string().min(1, 'Please select a business type.'),
  formationState: z.string().refine((value) => US_STATES.some((state) => state.name === value), 'Please select a state from the list.'),
  firstName: z.string().trim().min(1, 'Enter your first name.'),
  lastName: z.string().trim().min(1, 'Enter your last name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().refine((value) => /^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7, 'Enter a valid phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  termsAccepted: z.boolean().refine(Boolean, 'Please agree before continuing.'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

type OnboardingForm = z.infer<typeof onboardingSchema>;
type Step = 1 | 2 | 3 | 4;

const stepFields: Record<Step, (keyof OnboardingForm)[]> = {
  1: ['businessType'],
  2: ['formationState'],
  3: ['firstName', 'lastName', 'email', 'phone'],
  4: ['password', 'confirmPassword', 'termsAccepted'],
};

const options = [
  { value: 'LLC', title: 'LLC', description: 'A flexible choice for many new businesses.', icon: Building2 },
  { value: 'Corporation', title: 'Corporation', description: 'A formal structure often used by growing companies.', icon: Landmark },
  { value: 'Not Sure Yet', title: 'Not Sure Yet', description: 'You can decide on the right structure later.', icon: CircleHelp },
] as const;

const fieldClasses = 'mt-1.5 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#171717] outline-none transition-colors placeholder:text-slate-400 focus:border-[#F04623] focus:ring-2 focus:ring-orange-100';

interface StartPageProps {
  onBackToSite: () => void;
  initialState?: string;
}

export function StartPage({ onBackToSite, initialState }: StartPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState('');
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectedState = US_STATES.find((state) => state.code.toLowerCase() === initialState?.toLowerCase() || state.name.toLowerCase() === initialState?.toLowerCase());
  const {
    register,
    watch,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      businessType: '',
      formationState: selectedState?.name ?? '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  useEffect(() => {
    document.title = 'Start My Business | Apex Filings';
    return () => { document.title = 'Apex Filings | Start Your US Business With Confidence'; };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const nextStep = async () => {
    const valid = await trigger(stepFields[step], { shouldFocus: true });
    if (valid && step < 4) {
      setStep((step + 1) as Step);
      setSubmitError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submitRegistration = async (values: OnboardingForm) => {
    setSubmitError('');
    try {
      const result = await registerApplicant({
        businessType: values.businessType,
        formationState: values.formationState,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      setRegistration(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Account creation is unavailable. Please try again later.');
    }
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 4) {
      void handleSubmit(submitRegistration)();
    } else {
      void nextStep();
    }
  };

  return (
    <main className="min-h-screen bg-[#fcf9f8] px-4 pb-16 pt-5 text-[#171717] sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <a href="/" onClick={(event) => { event.preventDefault(); onBackToSite(); }} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]" aria-label="Apex Filings home">
            <BrandLogo size="sm" />
          </a>
          <button type="button" onClick={onBackToSite} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to site
          </button>
        </div>

        {registration ? (
          <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:mt-16 sm:p-12">
            <h1 className="text-3xl font-bold">You’re ready to get started.</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">Your Apex Filings account has been created. Continue to your dashboard to complete your business formation.</p>
            <a href={registration.dashboardUrl} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 text-sm font-semibold text-white hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">
              Go to My Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="mt-8 sm:mt-12">
            <div className="mx-auto max-w-xl">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>Step {step} of 4</span>
                <span>{step * 25}% complete</span>
              </div>
              <div role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={step * 25} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#F04623] transition-[width] duration-300" style={{ width: `${step * 25}%` }} />
              </div>
            </div>

            <form onSubmit={onFormSubmit} noValidate className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
              {step === 1 && (
                <div>
                  <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">What would you like to start?</h1>
                  <p className="mt-2 text-sm text-slate-600">Choose the business structure you're interested in.</p>
                  <fieldset className="mt-7 space-y-3" aria-describedby={errors.businessType ? 'business-type-error' : undefined}>
                    <legend className="sr-only">Business structure</legend>
                    {options.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label key={option.value} className="block cursor-pointer">
                          <input type="radio" value={option.value} {...register('businessType')} className="peer sr-only" />
                          <span className="flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-50/40 peer-checked:border-[#F04623] peer-checked:bg-orange-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#F04623]">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F04623]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                            <span><strong className="block text-sm text-[#171717]">{option.title}</strong><span className="mt-1 block text-xs text-slate-600">{option.description}</span></span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {errors.businessType && <p id="business-type-error" role="alert" className="mt-2 text-sm text-red-700">{errors.businessType.message}</p>}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">Where would you like to form your business?</h1>
                  <p className="mt-2 text-sm text-slate-600">Search and choose a US state. You can review your choice later.</p>
                  <div className="mt-7">
                    <label htmlFor="formation-state" className="text-sm font-semibold">Formation state</label>
                    <input id="formation-state" type="search" list="us-state-options" autoComplete="off" placeholder="Search or select a state" aria-invalid={!!errors.formationState} aria-describedby={errors.formationState ? 'formation-state-error' : 'formation-state-help'} className={fieldClasses} {...register('formationState')} />
                    <datalist id="us-state-options">{US_STATES.map((state) => <option key={state.code} value={state.name} />)}</datalist>
                    <p id="formation-state-help" className="mt-2 text-xs text-slate-500">All 50 US states are available. State fees are shown later when confirmed.</p>
                    {errors.formationState && <p id="formation-state-error" role="alert" className="mt-2 text-sm text-red-700">{errors.formationState.message}</p>}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">Let's get to know you</h1>
                  <p className="mt-2 text-sm text-slate-600">Just your contact details for now.</p>
                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first-name" className="text-sm font-semibold">First name</label>
                      <input id="first-name" type="text" autoComplete="given-name" aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? 'first-name-error' : undefined} className={fieldClasses} {...register('firstName')} />
                      {errors.firstName && <p id="first-name-error" role="alert" className="mt-1 text-xs text-red-700">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="last-name" className="text-sm font-semibold">Last name</label>
                      <input id="last-name" type="text" autoComplete="family-name" aria-invalid={!!errors.lastName} aria-describedby={errors.lastName ? 'last-name-error' : undefined} className={fieldClasses} {...register('lastName')} />
                      {errors.lastName && <p id="last-name-error" role="alert" className="mt-1 text-xs text-red-700">{errors.lastName.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="contact-email" className="text-sm font-semibold">Email address</label>
                      <input id="contact-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className={fieldClasses} {...register('email')} />
                      {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="contact-phone" className="text-sm font-semibold">Phone number</label>
                      <input id="contact-phone" type="tel" autoComplete="tel" placeholder="Include country code if outside the US" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined} className={fieldClasses} {...register('phone')} />
                      {errors.phone && <p id="phone-error" role="alert" className="mt-1 text-xs text-red-700">{errors.phone.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">Create your Apex Filings account</h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Your account will let you save your progress, track your application, access documents, and continue your business formation.</p>
                  <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs leading-relaxed text-orange-900">Account registration is being prepared. You can review this step, but no account or application can be created yet.</div>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="account-email" className="text-sm font-semibold">Email address</label>
                      <input id="account-email" type="email" value={watch('email')} readOnly className={`${fieldClasses} bg-slate-50`} />
                      <p className="mt-1 text-xs text-slate-500">Use Back to change your email address.</p>
                    </div>
                    <div>
                      <label htmlFor="password" className="text-sm font-semibold">Password</label>
                      <input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : 'password-help'} className={fieldClasses} {...register('password')} />
                      <p id="password-help" className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
                      {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className="text-sm font-semibold">Confirm password</label>
                      <input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined} className={fieldClasses} {...register('confirmPassword')} />
                      {errors.confirmPassword && <p id="confirm-password-error" role="alert" className="mt-1 text-xs text-red-700">{errors.confirmPassword.message}</p>}
                    </div>
                    <div>
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                        <input type="checkbox" aria-invalid={!!errors.termsAccepted} aria-describedby={errors.termsAccepted ? 'terms-error' : 'terms-help'} className="mt-0.5 h-5 w-5 shrink-0 accent-[#F04623]" {...register('termsAccepted')} />
                        <span>I agree to the Terms of Service and Privacy Policy.</span>
                      </label>
                      <p id="terms-help" className="mt-1 pl-8 text-xs text-slate-500">These documents will be available before registration launches.</p>
                      {errors.termsAccepted && <p id="terms-error" role="alert" className="mt-1 pl-8 text-xs text-red-700">{errors.termsAccepted.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {submitError && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</p>}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                <button type="button" onClick={step === 1 ? onBackToSite : () => { setStep((step - 1) as Step); setSubmitError(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                <button type="submit" disabled={isSubmitting || (step === 1 && !watch('businessType'))} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {step === 4 ? (isSubmitting ? 'Creating account…' : 'Create account') : 'Continue'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
            <p className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> No payment or identity documents are requested here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
