import { SERVICES } from '../../data/services';
import { ServiceCard } from '../services/ServiceCard';

export function ServicesSection() {
  return (
    <section className="scroll-mt-20 bg-white py-20 sm:py-24 lg:py-28" id="services" aria-labelledby="services-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Our Services</p>
          <h2 id="services-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">
            Everything You Need to Start and Manage Your Business
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            From forming your LLC to keeping your business organized, Apex Filings brings essential business services into one simple experience.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {SERVICES.map((service, index) => (
            <ServiceCard key={service.id} service={service} number={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
