import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTranslation } from '../server/translate.ts';

const request = (target: string, texts: string[]) => new Request('http://localhost/api/translate', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, texts }),
});

test('server refuses unsupported language and oversized batches', async () => {
  assert.equal((await handleTranslation(request('xx', ['Hello']), 'secret')).status, 400);
  assert.equal((await handleTranslation(request('lt', Array(51).fill('Hello')), 'secret')).status, 400);
});

test('missing credential returns a clean unavailable response', async () => {
  const response = await handleTranslation(request('ar', ['Hello']), undefined);
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('key'), false);
});

test('server sends English source text to provider and returns translated strings', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = String(init?.body);
    return new Response(JSON.stringify({ data: { translations: [{ translatedText: 'Labas &amp; sveiki' }, { translatedText: 'Kainos' }] } }), { status: 200 });
  };
  const response = await handleTranslation(request('lt', ['Hello & welcome', 'Pricing']), 'private-test-key', fakeFetch as typeof fetch);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { translations: ['Labas & sveiki', 'Kainos'] });
  assert.match(capturedUrl, /translation.googleapis.com/);
  assert.deepEqual(JSON.parse(capturedBody), { q: ['Hello & welcome', 'Pricing'], source: 'en', target: 'lt', format: 'text' });
});
