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
  assert.doesNotMatch(page,/<iframe\\b/i);\n  assert.match(page,/id="standalone-tool"/);\n  assert.match(page,/tool\\.init\\(root\\)/);
 }
});

test('workflow illustration is accessible and supports reduced motion',()=>{
 assert.match(html,/class="builder-promo"/);
 assert.match(html,/href="automation-builder.html"/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/\.flow-pulse\{animation:none/);
});

test('all 24 published tools have valid categories, UI and initializers',()=>{
 const ids=[...script.matchAll(/\\{id:\\s*"([^"]+)"\\s*,\\s*cat:\\s*"([^"]+)"\\s*,\\s*name:\\s*"([^"]+)"\\s*,\\s*desc:/g)];
 assert.equal(ids.length,24,'Published tool inventory changed; review coverage');
 for(const [,id,cat,name] of ids){
  assert.ok(['general','advanced','finance'].includes(cat),id+' has unknown category');
  assert.ok(name.trim(),id+' has no name');
  assert.match(script,new RegExp('id:\\s*"'+id+'"[^]*?init\\s*\\(el\\)\\s*\\{'),id+' missing initializer');
 }
});
test('payoff calculator amortization examples and safety cap',()=>{
 const code=script.match(/function payoff\\(bal, r, pay\\) \\{[\\s\\S]*?\\n\\}/)?.[0];
 assert.ok(code);
 const fn=vm.runInNewContext(code+';payoff');
 const free=fn(1200,0,100);
 assert.equal(free.months,12);
 assert.equal(free.interest,0);
 const charged=fn(1000,.01,100);
 assert.equal(charged.months,11);
 assert.ok(charged.interest>0);
 assert.equal(fn(1000,.1,1).months,1200);
});
test('HTML-escaping helper protects tool-generated markup',()=>{
 const code=script.match(/const esc = [^\\n]+/)?.[0];
 assert.ok(code);
 const fn=vm.runInNewContext(code+';esc');
 assert.equal(fn('<img src="x" onerror="x">&'), '&lt;img src=&quot;x&quot; onerror=&quot;x&quot;&gt;&amp;');
});
test('custom domain and crawl configuration remain aligned',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.equal(read('CNAME').trim(),'toolsbravo.com');
 assert.match(html,/https:\\/\\/toolsbravo\\.com\\//);
 assert.match(read('robots.txt'),/Sitemap: https:\\/\\/toolsbravo\\.com\\/sitemap\\.xml/);
 const sitemap=read('sitemap.xml');
 for(const path of ['','uk-take-home-pay-calculator.html','loan-repayment-calculator.html','word-counter.html','password-generator.html'])
  assert.ok(sitemap.includes('https://toolsbravo.com/'+path),'Sitemap missing '+path);
});
