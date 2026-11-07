"use client";
import { useEffect, useState } from 'react';
import type { QuoteSnapshot } from '@/lib/pricing';

export function useApplicationQuote(input: { applicationId?: string; packageSlug: string; state: string; services: string[] }, catalogRevision: string) {
  const requestKey = JSON.stringify(input);
  const key = requestKey + catalogRevision;
  const [result, setResult] = useState<{ key: string; quote: QuoteSnapshot | null; error: string | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/pricing/quote', { method: 'POST', signal: controller.signal, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: requestKey })
      .then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.error ?? 'Pricing could not be calculated'); return value as QuoteSnapshot; })
      .then(quote => { if (!controller.signal.aborted) setResult({ key, quote, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, quote: null, error: error instanceof Error ? error.message : 'Pricing unavailable' }); });
    return () => controller.abort();
  }, [requestKey, key]);
  return result?.key === key ? { quote: result.quote, error: result.error } : { quote: null, error: null };
}
