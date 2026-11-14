// Run with: node --test tests/site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
test('HTML has main landmark and description',()=>{
 assert.match(html,/<main id="app"/);
 assert.match(html,/<meta name="description"/);
 assert.match(html,/<meta name="viewport"/);
});
test('inline JavaScript parses',()=>{assert.ok(script);new vm.Script(script)});
test('all tool IDs are unique',()=>{
 const ids=[...script.matchAll(/\{id:\s*"([^"]+)"\s*,\s*cat:/g)].map(x=>x[1]);
 assert.ok(ids.length>=10,'Expected the existing tools to remain present');
 assert.equal(new Set(ids).size,ids.length);
});
test('salary tax thresholds and sample values',()=>{
 const code=script.match(/function ukPay\(gross, pct\) \{[\s\S]*?\n\}/)?.[0];
 assert.ok(code);
 const fn=vm.runInNewContext(code+';ukPay');
 assert.equal(fn(12570,0).tax,0);
 assert.equal(fn(12570,0).ni,0);
 assert.ok(Math.abs(fn(30000,0).tax-3486)<0.01);
 assert.ok(Math.abs(fn(30000,0).ni-1394.4)<0.01);
 assert.ok(Math.abs(fn(60000,0).tax-11432)<0.01);
});
test('password generation uses secure randomness',()=>{
 assert.match(script,/crypto\.getRandomValues/);
 assert.doesNotMatch(script,/Math\.random\(/);
});

test('privacy and about pages are linked from the home page',()=>{
 assert.match(html,/href="privacy\.html"/);
 assert.match(html,/href="about\.html"/);
});
test('financial calculators reject invalid negative rates',()=>{
 assert.match(script,/apr < 0/);
 assert.match(script,/aer <= -100/);
 assert.match(script,/rate <= -100/);
});

test('homepage links to dedicated searchable tool pages',()=>{
 for(const path of ['uk-take-home-pay-calculator.html','loan-repayment-calculator.html','word-counter.html','password-generator.html']) {
  assert.ok(html.includes('href="'+path+'"'), 'Missing link: '+path);
  const page=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(page,/<title>[^<]+<\/title>/);
  assert.match(page,/<meta name="description"/);
  assert.match(page,/<iframe[^>]+title=/);
 }
});

test('workflow illustration is accessible and supports reduced motion',()=>{
 assert.match(html,/class="builder-promo"/);
 assert.match(html,/href="automation-builder.html"/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/\.flow-pulse\{animation:none/);
});
