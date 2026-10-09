import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare, Mail, Clock } from 'lucide-react';
import { SERVICES } from '../../data/services';

export function ContactSection({ asPage = false, consultation = false }: { asPage?: boolean; consultation?: boolean }) {
  const Heading = asPage ? 'h1' : 'h2';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    phone: '',
    service: '',
    contactMethod: 'Email',
  });

  const [status, setStatus] = useState<'idle' | 'draft'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailSubject = consultation ? 'Free consultation request' : formData.subject.trim();
  const emailBody = consultation
    ? `Consultation request\n\nService of interest: ${formData.service}\nPreferred contact method: ${formData.contactMethod}\nPhone / WhatsApp: ${formData.phone.trim() || 'Not provided'}\nMessage: ${formData.message.trim() || 'Not provided'}\n\nName: ${formData.name.trim()}\nReply to: ${formData.email.trim()}`
    : `${formData.message.trim()}\n\nName: ${formData.name.trim()}\nReply to: ${formData.email.trim()}`;
  const emailDraft = `mailto:support@apexfiling.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Please provide your full name.';
    if (!formData.email.trim()) {
      errs.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (consultation && !formData.service) errs.service = 'Choose a service of interest.';
    if (consultation && formData.contactMethod !== 'Email' && !formData.phone.trim()) errs.phone = 'Add a phone or WhatsApp number for this contact method.';
    if (!consultation && !formData.subject.trim()) errs.subject = 'Please specify a subject.';
    if (!consultation && !formData.message.trim()) errs.message = 'Please provide your message.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setStatus('draft');
  };

  const handleReset = () => {
    setStatus('idle');
    setErrors({});
  };

  return (
    <section className="py-20 lg:py-28 relative bg-[#fcf9f8]" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-glass rounded-3xl p-8 lg:p-12 border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Contact Form */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-[#F04623] text-xs font-semibold tracking-wider uppercase">
                  {consultation ? 'Free consultation request' : asPage ? 'Contact Apex Filings' : 'Direct Support'}
                </span>
                <Heading className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
                  {consultation ? 'Request a Free Consultation' : asPage ? "Let's Talk About Your Business" : 'Ready to Start Your Business?'}
                </Heading>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  {consultation ? 'Tell us what you need help with. We’ll prepare an email request for you to review and send; no appointment is booked yet.' : asPage ? 'Questions about formation, packages, or your next steps? Share a few details with our team.' : 'Start your US business with a simple and guided process from Apex Filings.'}
                </p>
              </div>

              {status === 'draft' ? (
                <div role="status" className={`p-6 rounded-2xl text-center space-y-3 ${consultation ? 'bg-orange-50 border border-orange-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${consultation ? 'bg-orange-100 text-[#F04623]' : 'bg-emerald-100 text-emerald-600'}`}>
                    {consultation ? <Mail className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{consultation ? 'Your consultation request draft is ready' : 'Your email draft is ready'}</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Open your email app to review and send {consultation ? 'your consultation request' : 'your message'} to support@apexfiling.com. {consultation ? 'No request has been sent or appointment booked yet.' : 'Your message has not been sent yet.'}
                  </p>
                  <a href={emailDraft} className="inline-flex rounded-xl bg-[#F04623] px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">Open Email App</a>
                  <p className="text-xs text-slate-600">No email app configured? You can email support@apexfiling.com directly.</p>
                    <button
                    onClick={handleReset}
                    type="button"
                    className={`mt-2 px-4 py-2 bg-white border rounded-lg text-xs font-medium transition-colors ${consultation ? 'border-orange-300 text-[#c52e0f] hover:bg-orange-100/50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100/50'}`}
                  >
                    Edit Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Alex Morgan"
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-[transform,background-color,border-color,box-shadow,color] ${
                          errors.name
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-300 focus:border-[#F04623]'
                        }`}
                      />
                      {errors.name && (
                        <span className="text-[11px] text-rose-500 mt-1 block">{errors.name}</span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="alex@company.com"
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-[transform,background-color,border-color,box-shadow,color] ${
                          errors.email
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-300 focus:border-[#F04623]'
                        }`}
                      />
                      {errors.email && (
                        <span className="text-[11px] text-rose-500 mt-1 block">{errors.email}</span>
                      )}
                    </div>
                  </div>

                  {consultation ? <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="consultation-phone" className="block text-xs font-medium text-slate-700 mb-1">Phone / WhatsApp (optional)</label>
                        <input id="consultation-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'consultation-phone-error' : undefined} placeholder="+1 555 123 4567" className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${errors.phone ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300 focus:border-[#F04623]'}`} />
                        {errors.phone && <span id="consultation-phone-error" className="text-[11px] text-rose-500 mt-1 block">{errors.phone}</span>}
                      </div>
                      <div>
                        <label htmlFor="consultation-contact-method" className="block text-xs font-medium text-slate-700 mb-1">Preferred contact method</label>
                        <select id="consultation-contact-method" value={formData.contactMethod} onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F04623]">
                          <option>Email</option><option>Phone</option><option>WhatsApp</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="consultation-service" className="block text-xs font-medium text-slate-700 mb-1">Business service of interest</label>
                      <select id="consultation-service" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? 'consultation-service-error' : undefined} className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${errors.service ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300 focus:border-[#F04623]'}`}>
                        <option value="">Select a service</option>
                        {SERVICES.map(service => <option key={service.id} value={service.title}>{service.title}</option>)}
                        <option value="Not sure yet">Not sure yet</option>
                      </select>
                      {errors.service && <span id="consultation-service-error" className="text-[11px] text-rose-500 mt-1 block">{errors.service}</span>}
                    </div>
                  </> : <div>
                    <label htmlFor="contact-subject" className="block text-xs font-medium text-slate-700 mb-1">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="LLC formation inquiry for non-US resident"
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-[transform,background-color,border-color,box-shadow,color] ${
                        errors.subject
                          ? 'border-rose-300 focus:border-rose-500'
                          : 'border-slate-300 focus:border-[#F04623]'
                      }`}
                    />
                    {errors.subject && (
                      <span className="text-[11px] text-rose-500 mt-1 block">{errors.subject}</span>
                    )}
                  </div>}

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-medium text-slate-700 mb-1">
                      {consultation ? 'Short message (optional)' : 'Message'}
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your business goals and questions..."
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-[transform,background-color,border-color,box-shadow,color] ${
                        errors.message
                          ? 'border-rose-300 focus:border-rose-500'
                          : 'border-slate-300 focus:border-[#F04623]'
                      }`}
                    />
                    {errors.message && (
                      <span className="text-[11px] text-rose-500 mt-1 block">{errors.message}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#e03e1b] via-[#F04623] to-[#fb923c] hover:brightness-105 text-white font-semibold text-xs transition-[transform,background-color,border-color,box-shadow,color] shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{consultation ? 'Prepare Consultation Request' : 'Prepare Email'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-xs leading-relaxed text-slate-500">{consultation ? 'We’ll prepare an email for you to review and send. This does not book an appointment.' : 'We’ll prepare your message for your email app. Review and send it there.'}</p>
                </form>
              )}
            </div>

            {/* Illustration */}
            <div className="lg:col-span-5">
              <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_70%,#FFF1E7_0%,#FFF9F5_58%,#F8FAFC_100%)] sm:h-80 lg:h-[350px]">
                <img
                  src="/images/contact-support-character.png"
                  alt="3D illustration of a person using a laptop with message, email, and phone icons"
                  width="1312"
                  height="1199"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain object-bottom"
                />
              </div>
            </div>

            {/* Full-width support details beneath the form and illustration */}
            <div className="lg:col-span-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex flex-col gap-4 bg-[#111B2E] px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-10">
                <div className="max-w-3xl">
                  <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Live Support Active
                  </span>
                  <h3 className="text-xl font-bold text-white sm:text-2xl">Reach Out, We're Here to Help!</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Our incorporation specialists are standing by across multiple time zones (New York,
                    London, Dubai) to guide you through LLC jurisdiction selection, banking preparation,
                    and document delivery.
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-slate-300 lg:inline-flex">
                  Here when you need us
                </span>
              </div>

              <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-3 lg:gap-4 lg:p-8">
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F04623]">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Average response time</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">8 minutes</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Direct WhatsApp desk</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">+1 (302) 415-468</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Official inquiries</p>
                    <p className="mt-0.5 break-all text-sm font-semibold text-[#0F172A]">support@apexfiling.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
