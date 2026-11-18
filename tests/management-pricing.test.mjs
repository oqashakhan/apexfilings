import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url), modulePath=process.env.APEX_PLAYWRIGHT_MODULE;
test('management page displays published prices and falls back to a quote', {skip:!modulePath && 'Set APEX_PLAYWRIGHT_MODULE'}, async t=>{
 const {chromium}=require(modulePath),browser=await chromium.launch({channel:'msedge',headless:true});t.after(()=>browser.close());
 const page=await browser.newPage();await page.addInitScript(()=>sessionStorage.setItem('apex-loader-seen','1'));
 let amount=23450,restricted=[];
 await page.route('**/api/v1/pricing',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({packages:[],states:[],services:[{slug:'annual-report',name:'Annual report',priceCents:amount,currency:'USD',automaticCharge:false,availableStateCodes:restricted}]})}));
 await page.goto('http://127.0.0.1:3000/services/annual-report');
 const pricing=page.getByRole('complementary',{name:'Service pricing'});await pricing.getByText('$234.50').waitFor();
 amount=null;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await pricing.getByText('Quote required').waitFor();
 amount=19000;restricted=['FL'];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);assert.equal(await pricing.getByText('Quote required').count(),1);
 await page.locator('#management-state').selectOption('Florida');await pricing.getByText('$190.00').waitFor();
 assert.doesNotMatch(await page.locator('body').innerText(),/US\$70/);
});
