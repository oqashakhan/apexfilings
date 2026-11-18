import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:4173';
test('sitemap pages return unique server HTML with canonical metadata and crawlable content', async () => {
 const sitemap = await fetch(base + '/sitemap.xml'); assert.equal(sitemap.status, 200); assert.match(sitemap.headers.get('content-type'), /xml/);
 const xml = await sitemap.text(); const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]); assert.ok(urls.length >= 15); assert.equal(new Set(urls).size, urls.length);
 const titles = new Set(), descriptions = new Set();
 for (const url of urls) {
  assert.ok(url.startsWith('https://apexfilings.com/')); const pathname = new URL(url).pathname;
  const r = await fetch(base + pathname, {redirect:'manual'}); assert.equal(r.status, 200, pathname); const html = await r.text();
  assert.match(html, /<h1[^>]*>[^<]+<\/h1>/); assert.ok(html.includes(`rel="canonical" href="${url}"`), pathname);
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1], description=html.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, pathname); assert.ok(!titles.has(title), pathname); assert.ok(!descriptions.has(description), pathname); titles.add(title); descriptions.add(description);
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(match[1]);
 }
 const robots=await fetch(base+'/robots.txt');assert.equal(robots.status,200);assert.match(robots.headers.get('content-type'),/text\/plain/);const text=await robots.text();for(const bot of ['Googlebot','Bingbot','OAI-SearchBot','*'])assert.ok(text.includes(`User-agent: ${bot}\nAllow: /`));assert.ok(text.includes('https://apexfilings.com/sitemap.xml'));
 for (const route of ['/start/', '/formation/start/', '/consultation/']) {
  const response = await fetch(base + route); assert.equal(response.status, 200, route);
  const html = await response.text(); assert.match(html, /<meta name="robots" content="noindex,follow"/);
  assert.ok(html.includes(`rel="canonical" href="https://apexfilings.com${route}"`));
 }
 const notFound = await fetch(base + '/404.html'); assert.equal(notFound.status, 200); assert.match(await notFound.text(), /Page not found/);
 assert.equal(await readFile('public/sitemap.xml','utf8'),xml);
});
