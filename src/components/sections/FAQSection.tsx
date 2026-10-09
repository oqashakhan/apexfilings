import { useState } from 'react';
import { FAQS } from '../../data/faqs';
import type { FAQItem } from '../../types';

interface FAQSectionProps {
  items?: FAQItem[];
  eyebrow?: string;
  heading?: string;
  description?: string;
}

export function FAQSection({ items = FAQS, eyebrow = 'Got Questions?', heading = 'Frequently Asked Questions', description = 'Everything you need to know about US company formation for founders.' }: FAQSectionProps) {
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id || '']);

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <section className="py-20 lg:py-28 bg-white border-t border-slate-200 relative" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[#F04623] text-xs font-semibold tracking-wider uppercase">
            {eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-2">
            {heading}
          </h2>
          <p className="text-slate-600 text-sm mt-3">
            {description}
          </p>
        </div>

        <div className="space-y-4">
          {items.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="card-glass rounded-xl p-5 border-slate-200 transition-[transform,background-color,border-color,box-shadow,color] hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left text-base font-bold text-[#0F172A] flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]"
                >
                  <span className="pr-4">{faq.question}</span>
                  <span
                    className={`text-[#F04623] font-mono text-xl transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-150">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
