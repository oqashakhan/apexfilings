import { ArrowRight, Check } from 'lucide-react';
import type { ServiceItem } from '../../types';
import { serviceIcons } from './serviceIcons';

interface ServiceCardProps {
  service: ServiceItem;
  number?: number;
  compact?: boolean;
  cardCopy?: { description: string; benefits: string[]; cta: string };
}

export function ServiceCard({ service, number, compact = false, cardCopy }: ServiceCardProps) {
  const Icon = serviceIcons[service.iconName];

  return (
    <a
      id={number ? `service-${service.id}` : undefined}
      href={`/services/${service.id}`}
      className={`polish-card group flex h-full scroll-mt-28 flex-col rounded-3xl border border-[#e8e4e1] bg-white p-6 shadow-[0_10px_30px_-26px_rgba(23,23,23,0.3)] motion-safe:transition-[transform,border-color,box-shadow] motion-safe:duration-250 motion-safe:hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_22px_50px_-29px_rgba(240,70,35,0.24)] motion-safe:focus-visible:-translate-y-1 focus-visible:border-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 sm:p-7 ${compact ? 'min-h-52' : 'min-h-80'}`}
      aria-label={cardCopy?.cta ?? `Learn more about ${service.title}`}
    >
      <div className="flex items-start justify-between gap-4">
        {number && <span className="text-xs font-bold tracking-[0.16em] text-[#F04623]">{String(number).padStart(2, '0')}</span>}
        <span className={`ml-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-[#fff7f4] text-[#F04623] motion-safe:transition-colors motion-safe:duration-250 group-hover:bg-[#ffede6] group-focus-visible:bg-[#ffede6] ${compact ? 'h-11 w-11' : ''}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <h3 className="mt-5 text-xl font-bold tracking-tight text-[#171717]">{service.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{cardCopy?.description ?? service.description}</p>
      {!compact && (
        <ul className="mt-5 space-y-2" aria-label={`${service.title} highlights`}>
          {(cardCopy?.benefits ?? service.cardBenefits).map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F04623]" strokeWidth={2.2} aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-semibold text-[#F04623] group-hover:text-[#c52e0f]">
        {cardCopy?.cta ?? 'Learn More'} <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-250 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1" aria-hidden="true" />
      </span>
    </a>
  );
}
