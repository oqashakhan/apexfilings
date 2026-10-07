import { useState } from 'react';
import { ArrowRight, Brush, FileText, Landmark, MessageCircle, Sparkles } from 'lucide-react';

const bonuses = [
  {
    id: 'concierge',
    title: 'Dedicated Concierge',
    description: 'Direct support through WhatsApp and Slack.',
    detail: 'Connect with your dedicated account manager for guidance on your business setup and next steps.',
    icon: MessageCircle,
  },
  {
    id: 'banking',
    title: 'Business Banking',
    description: 'Introductions to Mercury, Wise, and Relay.',
    detail: 'Get guidance as you explore banking options for your business. Each provider makes its own eligibility and approval decisions.',
    icon: Landmark,
  },
  {
    id: 'branding',
    title: 'Brand Identity',
    description: 'Three custom vector logos for your business.',
    detail: 'Start shaping your business identity with three custom vector logos you can use across your brand materials.',
    icon: Brush,
  },
  {
    id: 'tax',
    title: 'Tax Strategy',
    description: 'A free CPA consultation to plan your next steps.',
    detail: 'Bring your US business tax and compliance questions to the 30-minute CPA consultation included in your Premium package.',
    icon: FileText,
  },
];

export function ExclusiveBonusesSection() {
  const [expandedBenefits, setExpandedBenefits] = useState<string[]>([]);
  const allExpanded = expandedBenefits.length === bonuses.length;

  const toggleBenefit = (id: string) => {
    setExpandedBenefits((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <section
      id="bonuses"
      aria-labelledby="premium-benefits-title"
      className="relative overflow-hidden bg-[#FFFAF7] py-20 lg:py-28"
    >
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-6 xl:gap-10">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E54723] sm:text-sm">
              Exclusive benefits
            </p>
            <h2
              id="premium-benefits-title"
              className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#101828] sm:text-5xl xl:text-[3.35rem]"
            >
              More Value for
              <span className="mt-1 block text-[#F04623]">A Smarter Start</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#536078]">
              Get more than business formation. Premium brings personal guidance, banking introductions,
              branding support, and a CPA consultation together to help you start with confidence.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#F5DCCF] bg-[#FFF0E8] px-3 py-1.5 text-xs font-semibold text-[#B93E1F]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Premium clients only
            </span>

            <div id="premium-benefit-cards" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {bonuses.map((bonus) => {
                const Icon = bonus.icon;
                const expanded = expandedBenefits.includes(bonus.id);

                return (
                  <div
                    key={bonus.id}
                    className={`self-start overflow-hidden rounded-2xl border bg-white shadow-[0_3px_12px_-8px_rgba(35,30,27,0.3)] transition-[border-color,box-shadow] motion-reduce:transition-none ${expanded ? 'border-[#F7B29B] shadow-[0_8px_20px_-15px_rgba(240,70,35,0.5)]' : 'border-[#EEE6E1] hover:border-[#F7B29B] hover:shadow-[0_8px_20px_-15px_rgba(240,70,35,0.5)]'}`}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`premium-benefit-${bonus.id}`}
                      onClick={() => toggleBenefit(bonus.id)}
                      className="group flex min-h-28 w-full items-center gap-3 rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#F04623]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EC] text-[#F04623]">
                        <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-5 tracking-tight text-[#101828]">{bonus.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#536078]">{bonus.description}</span>
                      </span>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 text-[#263142] transition-transform duration-200 group-hover:text-[#F04623] motion-reduce:transition-none ${expanded ? 'rotate-90' : 'group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0'}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div id={`premium-benefit-${bonus.id}`} hidden={!expanded} className="px-4 pb-4">
                      <p className="border-t border-[#F1EBE7] pt-3 text-xs leading-5 text-[#536078]">{bonus.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-5">
              <a
                href="/start"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#F04623] to-[#FF682D] px-6 py-3.5 text-sm font-bold text-white shadow-[0_9px_20px_-10px_rgba(240,70,35,0.65)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-105 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
              >
                Start My Business
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => setExpandedBenefits(allExpanded ? [] : bonuses.map((bonus) => bonus.id))}
                aria-expanded={allExpanded}
                aria-controls="premium-benefit-cards"
                className="group inline-flex min-h-11 items-center gap-3 border-b border-[#F04623] py-2 text-sm font-semibold text-[#101828] transition-colors hover:text-[#F04623] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
              >
                {allExpanded ? 'Hide Benefit Details' : 'See All Benefits'}
                <ArrowRight className={`h-4 w-4 text-[#F04623] transition-transform motion-reduce:transition-none ${allExpanded ? '-rotate-90' : 'group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:w-[108%] lg:max-w-none lg:justify-self-start">
            <div className="aspect-[960/864] overflow-hidden">
              <img
                src="/images/premium-benefits.png"
                alt="Illustration of business tools for banking, payments, branding, and tax support on a laptop."
                width="1821"
                height="864"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-right mix-blend-multiply"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent), linear-gradient(to bottom, transparent, black 4%, black 95%, transparent)',
                  maskComposite: 'intersect',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
