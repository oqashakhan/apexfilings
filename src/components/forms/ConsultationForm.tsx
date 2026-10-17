import { useEffect, useId, useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import { COUNTRY_DIAL_CODES } from '../../data/countryDialCodes';

const SERVICE_OPTIONS = [
  'Not sure yet',
  'LLC Formation',
  'EIN Application',
  'Registered Agent Service',
  'US Address and Mail Forwarding',
  'US Business Bank Account Support',
  'Operating Agreement',
  'Business Licenses and Permits',
  'ITIN Application',
  'Trademark Registration',
  'Annual Compliance and Tax Filing',
] as const;

const SERVICE_BY_SLUG: Record<string, string> = {
  'llc-formation': 'LLC Formation',
  ein: 'EIN Application',
  'registered-agent': 'Registered Agent Service',
  'mail-forwarding': 'US Address and Mail Forwarding',
  'business-banking': 'US Business Bank Account Support',
  'operating-agreement': 'Operating Agreement',
  'business-licenses': 'Business Licenses and Permits',
  itin: 'ITIN Application',
  trademark: 'Trademark Registration',
  'annual-report': 'Annual Compliance and Tax Filing',
  'resale-certificate': 'Resale Certificate',
  'dissolve-llc': 'LLC Dissolution',
  'business-documents': 'Business Documents',
  'uk-ltd-formation': 'UK Ltd Company Formation',
};

const inputClass = 'clay-input min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#171717] outline-none transition-colors placeholder:text-slate-400 focus:border-[#F04623] focus:ring-2 focus:ring-orange-100 aria-[invalid=true]:border-rose-500';
const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL?.trim() || '/privacy-policy';

function detectedCountry(): string {
  // A browser language such as en-US is often only a language preference, not residence.
  const timezoneCountries: Record<string, string> = {
    'Asia/Karachi': 'PK', 'Asia/Kolkata': 'IN', 'Asia/Dubai': 'AE',
    'Asia/Singapore': 'SG', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN',
    'Asia/Hong_Kong': 'HK', 'Asia/Riyadh': 'SA', 'Asia/Dhaka': 'BD',
    'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
    'Europe/Lisbon': 'PT', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
    'America/New_York': 'US', 'America/Chicago': 'US',
    'America/Denver': 'US', 'America/Los_Angeles': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
    'Pacific/Auckland': 'NZ', 'Africa/Lagos': 'NG',
    'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG',
  };
  return timezoneCountries[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? '';
}

export function ConsultationForm({ serviceSlug, initialState }: { serviceSlug?: string; initialState?: string }) {
  const id = useId().replace(/:/g, '');
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = serviceSlug ?? params.get('service') ?? '';
  const requestedService = SERVICE_BY_SLUG[requestedSlug] ?? (SERVICE_OPTIONS as readonly string[]).find((option) => option === requestedSlug) ?? (requestedSlug === 'consultation' ? 'Not sure yet' : '');
  const requestedState = initialState ?? params.get('state') ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [dialCountry, setDialCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'Email' | 'WhatsApp' | 'Phone'>('Email');
  const [service, setService] = useState(requestedService || 'Not sure yet');
  const [business, setBusiness] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState({ name: '', method: 'Email' });

  useEffect(() => {
    const detected = detectedCountry();
    if (detected) {
      setCountry(detected);
      setDialCountry(detected);
    }
  }, []);

  const fieldId = (field: string) => `${id}-${field}`;
  const showError = (field: string) => errors[field] && <p id={fieldId(`${field}-error`)} className="mt-1 text-xs text-rose-700">{errors[field]}</p>;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (honeypot.trim()) return;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!country) nextErrors.country = 'Choose your country of residence.';
    if (contactMethod !== 'Email' && !phone.trim()) nextErrors.phone = `Enter a number so we can contact you by ${contactMethod}.`;
    if (phone.trim() && !dialCountry && !phone.trim().startsWith('+')) nextErrors.phone = 'Choose a phone country code.';
    if (!service) nextErrors.service = 'Choose a service.';
    if (!consent) nextErrors.consent = 'Agree to the Privacy Policy before submitting.';
    if (!privacyPolicyUrl) nextErrors.consent = 'The Privacy Policy link is pending. Requests cannot be submitted yet.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(fieldId(first))?.focus();
      return;
    }

    // Vite's local server can return index.html to a POST without saving a lead.
    if (import.meta.env.DEV) {
      setSubmitStatus('error');
      setServerError('Live submissions are available on the deployed Netlify site. This local preview did not send your request.');
      return;
    }

    const formData = new URLSearchParams({
      'form-name': 'apex-consultation',
      'bot-field': honeypot,
      name: name.trim(),
      email: email.trim(),
      country,
      'contact-method': contactMethod,
      service,
      'phone-country': phone.trim() ? dialCountry : '',
      phone: phone.trim() ? (phone.trim().startsWith('+') ? phone.trim() : `${COUNTRY_DIAL_CODES[dialCountry] ?? ''} ${phone.trim()}`.trim()) : '',
      business: business.trim(),
      state: requestedState,
      'privacy-consent': 'yes',
      source: window.location.pathname,
    });

    setSubmitStatus('sending');
    setServerError('');
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (!response.ok) throw new Error(`Submission returned ${response.status}`);
      setSubmitted({ name: name.trim(), method: contactMethod });
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
      setServerError('We could not send your request. Please try again in a moment.');
    }
  }

  if (submitStatus === 'success') {
    return <div role="status" aria-live="polite" className="consultation-success rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold text-[#171717]">Thank you, {submitted.name}.</h3><p className="mt-2 text-sm leading-7 text-slate-700">We received your request and will contact you by {submitted.method} with next steps.</p></div>;
  }

  return <form name="apex-consultation" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={handleSubmit} noValidate className="space-y-5">
    <input type="hidden" name="form-name" value="apex-consultation" />
    <input type="hidden" name="state" value={requestedState} />
    <input type="hidden" name="source" value={window.location.pathname} />
    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor={fieldId('bot-field')}>Leave this field empty</label><input id={fieldId('bot-field')} name="bot-field" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor={fieldId('name')} className="mb-2 block text-sm font-semibold text-[#171717]">Your Name <span aria-hidden="true">*</span></label><input id={fieldId('name')} name="name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? fieldId('name-error') : undefined} className={inputClass} />{showError('name')}</div>
      <div><label htmlFor={fieldId('email')} className="mb-2 block text-sm font-semibold text-[#171717]">Email Address <span aria-hidden="true">*</span></label><input id={fieldId('email')} name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? fieldId('email-error') : undefined} className={inputClass} />{showError('email')}</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor={fieldId('country')} className="mb-2 block text-sm font-semibold text-[#171717]">Country of Residence <span aria-hidden="true">*</span></label><select id={fieldId('country')} name="country" autoComplete="country" required value={country} onChange={(event) => { setCountry(event.target.value); setDialCountry(event.target.value); }} aria-invalid={!!errors.country} aria-describedby={errors.country ? fieldId('country-error') : undefined} className={inputClass}><option value="">Select your country</option>{COUNTRIES.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}</select>{showError('country')}</div>
      <div><label htmlFor={fieldId('service')} className="mb-2 block text-sm font-semibold text-[#171717]">Service You Are Interested In <span aria-hidden="true">*</span></label><select id={fieldId('service')} name="service" required value={service} onChange={(event) => setService(event.target.value)} aria-invalid={!!errors.service} aria-describedby={errors.service ? fieldId('service-error') : undefined} className={inputClass}>{SERVICE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}{requestedService && !SERVICE_OPTIONS.includes(requestedService as typeof SERVICE_OPTIONS[number]) && <option value={requestedService}>{requestedService}</option>}</select>{showError('service')}</div>
    </div>
    {requestedState && <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-slate-700">Selected LLC state: <strong>{requestedState}</strong></p>}
    <fieldset><legend className="mb-2 text-sm font-semibold text-[#171717]">Preferred Contact Method <span aria-hidden="true">*</span></legend><div className="grid grid-cols-3 gap-2">{(['Email', 'WhatsApp', 'Phone'] as const).map((method) => <label key={method} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-[#F04623] ${contactMethod === method ? 'border-[#F04623] bg-orange-50 text-[#b83518]' : 'border-slate-300 bg-white text-slate-700 hover:border-orange-200'}`}><input type="radio" name="contact-method" value={method} checked={contactMethod === method} onChange={() => setContactMethod(method)} className="sr-only" />{method}</label>)}</div></fieldset>
    <div><label htmlFor={fieldId('phone')} className="mb-2 block text-sm font-semibold text-[#171717]">Phone / WhatsApp <span className="font-normal text-slate-500">{contactMethod === 'Email' ? '(optional)' : '(required for this method)'}</span></label><div className="flex min-w-0 gap-2"><select id={fieldId('phone-country')} name="phone-country" aria-label="Phone country code" value={dialCountry} onChange={(event) => setDialCountry(event.target.value)} className={`${inputClass} max-w-28 shrink-0 px-2 sm:max-w-40`}><option value="">Code</option>{COUNTRIES.filter((entry) => COUNTRY_DIAL_CODES[entry.code]).map((entry) => <option key={entry.code} value={entry.code}>{entry.code} {COUNTRY_DIAL_CODES[entry.code]}</option>)}</select><input id={fieldId('phone')} name="phone" type="tel" autoComplete="tel-national" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? fieldId('phone-error') : undefined} className={`${inputClass} min-w-0 flex-1`} placeholder="Your number" /></div>{showError('phone')}</div>
    <div><label htmlFor={fieldId('business')} className="mb-2 block text-sm font-semibold text-[#171717]">Tell Us About Your Business <span className="font-normal text-slate-500">(optional)</span></label><textarea id={fieldId('business')} name="business" value={business} onChange={(event) => setBusiness(event.target.value)} maxLength={500} rows={4} className={inputClass} placeholder="Your business goals or questions" /><p className="mt-1 text-right text-xs text-slate-500">{business.length}/500</p></div>
    <div><label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700"><input id={fieldId('consent')} name="privacy-consent" type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? fieldId('consent-error') : undefined} className="mt-1 h-4 w-4 shrink-0 accent-[#F04623]" /><span>I agree to the {privacyPolicyUrl ? <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#bb3417] underline underline-offset-2">Privacy Policy</a> : <strong>Privacy Policy</strong>} and to be contacted about my request.</span></label>{showError('consent')}{!privacyPolicyUrl && <p className="mt-2 text-xs text-amber-800">The Privacy Policy link is pending; submissions will open once it is provided.</p>}</div>
    {submitStatus === 'error' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{serverError}</p>}
    <button type="submit" disabled={submitStatus === 'sending' || !privacyPolicyUrl} className="clay-button flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/15 transition-colors hover:bg-[#db3b1b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{submitStatus === 'sending' ? 'Sending request…' : 'Request Free Consultation'}<Send className="h-4 w-4" aria-hidden="true" /></button>
    <p className="text-xs text-slate-500">No obligation to buy.</p>
  </form>;
}

export function ConsultationFormSection({ serviceSlug, initialState, requireState = false }: { serviceSlug?: string; initialState?: string; requireState?: boolean }) {
  return <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="service-consultation-title">
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_24px_70px_-44px_rgba(23,23,23,0.28)] sm:p-8 lg:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Free consultation</p>
        <h2 id="service-consultation-title" className="mt-3 text-3xl font-extrabold tracking-tight text-[#171717]">Request a Free Consultation</h2>
        <p className="mb-8 mt-3 text-sm leading-7 text-slate-600">Tell us what you need help with. A specialist will reply with clear next steps.</p>
        {requireState && !initialState ? <p className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm text-slate-700">Select the LLC’s state above to request this service.</p> : <ConsultationForm serviceSlug={serviceSlug} initialState={initialState} />}
      </div>
    </div>
  </section>;
}
