import React, { useState } from 'react';
import { CheckCircle2, Globe2 } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  hubName: string;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, hubName, onClose }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      alert('Please provide your name and email address.');
      return;
    }
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setEmail('');
    setName('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#F04623]" />
            <h3 className="font-bold text-slate-900 text-base">Global Hub Waitlist</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">You're on the priority list!</h4>
            <p className="text-xs text-slate-600">
              We'll notify <strong>{email}</strong> the moment early slots open for{' '}
              <strong>{hubName}</strong> formations and banking setups.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-5 py-2 rounded-xl bg-[#F04623] text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950">
              Target Entity: <strong>{hubName}</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#F04623]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#F04623]"
                required
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Waitlist members receive complimentary 0% registered agent fees for their first operational
              year.
            </p>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#F04623] hover:bg-[#e03e1b] text-white text-xs font-semibold transition-colors shadow-md"
            >
              Secure Priority Access
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
