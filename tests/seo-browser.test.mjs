import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwrightModule = process.env.APEX_PLAYWRIGHT_MODULE;
test('public pages render for desktop and mobile and unknown pages are noindexed', { skip: !playwrightModule && 'Set APEX_PLAYWRIGHT_MODULE to an installed Playwright module' }, async t => {
 const { chromium } = require(playwrightModule);
 const browser=await chromium.launch({channel:'msedge',headless:true}); t.after(()=>browser.close());
 const xml=await (await fetch('http://127.0.0.1:4173/sitemap.xml')).text(); const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
 for (const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900}}); await page.addInitScript(()=>sessionStorage.setItem('apex-loader-seen','1'));
  for (const route of urls) {
   const response=await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'}); assert.equal(response.status(),200,route);
   await page.locator('main h1').first().waitFor({timeout:12000});
   const canonical=await page.locator('link[rel=canonical]').getAttribute('href'); assert.equal(canonical,'https://apexfilings.com'+route,route);
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index,follow',route);
   assert.ok(await page.locator('main').innerText(),route);
  }
  await page.goto('http://127.0.0.1:4173/not-a-real-page'); await page.getByRole('heading',{name:'Page not found'}).waitFor(); assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,follow');
  await page.goto('http://127.0.0.1:4173/pricing/'); await page.getByRole('heading',{level:1}).first().waitFor(); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1));
  await page.close();
 }
});
