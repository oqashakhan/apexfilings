import { NextRequest } from 'next/server';
import { pricingCatalog } from '@/server/pricing';
import { json, handleError } from '@/server/http';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const catalog = await pricingCatalog();
    const response = json(catalog);
    if (request.headers.get('origin') === process.env.PUBLIC_SITE_ORIGIN) response.headers.set('Access-Control-Allow-Origin', process.env.PUBLIC_SITE_ORIGIN!);
    response.headers.set('Vary', 'Origin');
    return response;
  } catch (error) { return handleError(error); }
}
