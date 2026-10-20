import { isLanguage } from '../src/i18n/languages.ts';

type TranslationResponse = { data?: { translations?: Array<{ translatedText?: string }> }; error?: { message?: string } };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function decodeEntities(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|#39);/gi, (match, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    if (entity.startsWith('#')) {
      const code = entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      if (Number.isInteger(code) && code > 0 && code <= 0x10ffff) return String.fromCodePoint(code);
    }
    return match;
  });
}

export async function handleTranslation(request: Request, apiKey: string | undefined, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let payload: unknown;
  try { payload = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { target, texts } = (payload && typeof payload === 'object' ? payload : {}) as { target?: unknown; texts?: unknown };
  if (typeof target !== 'string' || !isLanguage(target) || target === 'en'
    || !Array.isArray(texts) || texts.length < 1 || texts.length > 50
    || texts.some((value) => typeof value !== 'string' || !value.trim() || value.length > 5000)
    || texts.reduce<number>((sum, value) => sum + (typeof value === 'string' ? value.length : 0), 0) > 18000) {
    return json({ error: 'Invalid translation request' }, 400);
  }
  if (!apiKey) return json({ error: 'Translation is not configured' }, 503);

  try {
    const provider = await fetcher(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'en', target, format: 'text' }),
      signal: AbortSignal.timeout(9000),
    });
    const result = await provider.json() as TranslationResponse;
    const translated = result.data?.translations?.map((entry) => decodeEntities(entry.translatedText ?? ''));
    if (!provider.ok || !translated || translated.length !== texts.length || translated.some((value) => !value)) {
      return json({ error: 'Translation provider unavailable' }, 502);
    }
    return json({ translations: translated });
  } catch {
    return json({ error: 'Translation provider unavailable' }, 502);
  }
}
