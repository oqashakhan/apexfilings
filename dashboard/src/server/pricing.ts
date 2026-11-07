import 'server-only';
import { db } from '@/server/db';
import { quotePricing, type PricingCatalog } from '@/lib/pricing';
export async function pricingCatalog(client: Pick<typeof db, 'package' | 'service' | 'stateFilingFee'> = db): Promise<PricingCatalog> {
  const [packages, services, states] = await Promise.all([
    client.package.findMany({ orderBy: { serviceFeeCents: 'asc' } }),
    client.service.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    client.stateFilingFee.findMany({ orderBy: { state: 'asc' } }),
  ]);
  return { packages, services, states };
}
export async function applicationQuote(slug: string, state: string, services: string[], client?: Parameters<typeof pricingCatalog>[0]) {
  return quotePricing(await pricingCatalog(client), slug, state, services);
}
