import { useEffect, useRef } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';

interface LoginPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginPortalModal({ isOpen, onClose }: LoginPortalModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-portal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <BrandLogo size="sm" />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close client portal information"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="pt-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#F04623]">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 id="client-portal-title" className="mt-4 text-xl font-bold text-[#0F172A]">Client portal coming soon</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Online account access is being prepared. For help with Apex Filings services, please use the contact form on this page.
          </p>
          <a
            href="#contact"
            onClick={onClose}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F04623] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
