import { NextRequest } from 'next/server';
import { pricingCatalog } from '@/server/pricing';
import { json, handleError } from '@/server/http';
import { diagnoseStateFee } from '@/lib/state-fee-diagnostics';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const catalog = await pricingCatalog();
    const response = json({
      packages: catalog.packages.filter(item => item.available).map(({ id, slug, name, serviceFeeCents, currency, available, description, includedServices, includedServiceSlugs }) => ({ id, slug, name, serviceFeeCents, currency, available, description, includedServices, includedServiceSlugs })),
      services: catalog.services.filter(item => item.available).map(({ id, slug, name, description, available, priceCents, currency, priceApproved, availableStateCodes, category, displayOrder, automaticCharge, requiredCharge }) => ({ id, slug, name, description, available, priceCents: priceApproved ? priceCents : null, currency, priceApproved, availableStateCodes, category, displayOrder, automaticCharge, requiredCharge })),
      states: catalog.states.map(item => { const approved = diagnoseStateFee(item).status === 'APPROVED'; return { code: item.code, state: item.state, filingFeeCents: approved ? item.filingFeeCents : null, referenceFilingFeeCents: null, active: approved, verifiedAt: approved ? item.verifiedAt : null, sourceReference: approved ? item.sourceReference : null, recurringFeeDescription: approved ? item.recurringFeeDescription : null, recurringFeePeriod: approved ? item.recurringFeePeriod : null, processingTime: approved ? item.processingTime : null }; }),
    });
    if (request.headers.get('origin') === process.env.PUBLIC_SITE_ORIGIN) response.headers.set('Access-Control-Allow-Origin', process.env.PUBLIC_SITE_ORIGIN!);
    response.headers.set('Vary', 'Origin');
    return response;
  } catch (error) { return handleError(error); }
}
