import { TESTIMONIALS } from '../../data/testimonials';
import { Star, Quote } from 'lucide-react';

export function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-28 bg-white border-y border-slate-200 relative" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#F04623] text-xs font-semibold tracking-wider uppercase">
            Proven Track Record
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-2">
            Trusted by entrepreneurs from 150+ countries
          </h2>
          <p className="text-slate-600 text-sm mt-3">
            Read how cross-border founders used Apex Filings to establish their entities and scale
            globally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="card-glass p-8 rounded-2xl flex flex-col justify-between relative group"
            >
              <div>
                {/* Star rating */}
                <div className="flex items-center gap-1 text-[#F04623] mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F04623]" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-orange-200 mb-2" />

                <p className="text-sm text-slate-700 leading-relaxed italic">"{t.quote}"</p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">{t.author}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <span>{t.flag}</span>
                  <span className="font-medium">{t.country}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
