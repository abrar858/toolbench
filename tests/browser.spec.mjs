import {test,expect} from '@playwright/test';
const ids = [
'time-duration','aspect-ratio','text-sorter','date-difference','bmi-calculator',
'word-counter','case-converter','password-generator','unit-converter','age-calculator',
'percentage-calculator','json-formatter','base64','url-encoder','hash-generator',
'uuid-generator','timestamp-converter','colour-converter','take-home-pay',
'loan-calculator','savings-calculator','debt-payoff','vat-calculator','budget-planner'
];
test('all 24 tools render without uncaught browser errors', async ({page})=>{
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 for(const id of ids){
  await page.goto('/#'+id);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main .panel')).toBeVisible();
  await expect(page.locator('main .panel input,main .panel textarea,main .panel select').first()).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('search filters the tool list',async ({page})=>{
 await page.goto('/');
 await page.locator('#q').fill('password');
 await expect(page.locator('a[href="#password-generator"]')).toBeVisible();
 await expect(page.locator('a[href="#loan-calculator"]')).toBeHidden();
});
test('salary calculator displays a result and rejects invalid pension',async ({page})=>{
 await page.goto('/#take-home-pay');
 await expect(page.locator('#so')).toContainText('a month');
 await page.locator('#sp').fill('-5');
 await expect(page.locator('#so')).toContainText('valid salary');
});
test('SEO landing pages load their embedded tools',async ({page})=>{
 for(const [path,hash] of [
 ['uk-take-home-pay-calculator.html','take-home-pay'],
 ['loan-repayment-calculator.html','loan-calculator'],
 ['word-counter.html','word-counter'],
 ['password-generator.html','password-generator']]){
  await page.goto('/'+path);
  await expect(page.locator('main h1')).toBeVisible();
  const frame=page.frameLocator('iframe');
  await expect(frame.locator('main h1')).toBeVisible();
  expect(await page.locator('iframe').getAttribute('src')).toBe('./#'+hash);
 }
});
test('mobile layout has no horizontal document overflow',async ({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(overflow).toBe(false);
});
