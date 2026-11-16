// Run with: node --test tests/site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {TOOL_CONTENT} from '../scripts/content.mjs';
const readPage=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=readPage('index.html');
const script=readPage('assets/tools.js');
const css=readPage('assets/site.css');
test('HTML has main landmark and description',()=>{
 assert.match(html,/<main id="app"/);
 assert.match(html,/<meta name="description"/);
 assert.match(html,/<meta name="viewport"/);
});
test('shared JavaScript parses',()=>{assert.ok(script);new vm.Script(script)});
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

test('every tool has its own static page with unique search metadata',()=>{
 const ids=[...script.matchAll(/\{id:\s*"([^"]+)"\s*,\s*cat:/g)].map(x=>x[1]);
 assert.deepEqual(TOOL_CONTENT.map(c=>c.id).sort(),[...ids].sort());
 const titles=new Set(),descs=new Set();
 for(const c of TOOL_CONTENT){
  const page=readPage(c.slug);
  const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title&&!titles.has(title),'Unique title: '+c.slug); titles.add(title);
  const desc=page.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(desc&&!descs.has(desc)&&desc.length<=160,'Unique, short description: '+c.slug); descs.add(desc);
  assert.ok(page.includes('<link rel="canonical" href="https://toolsbravo.com/'+c.slug+'">'),'Canonical: '+c.slug);
  assert.equal((page.match(/<h1[ >]/g)||[]).length,1,'One h1: '+c.slug);
  assert.ok(page.includes('<body data-tool="'+c.id+'">'));
  assert.ok(!/<iframe[^>]+src="\.\/#/.test(page),'Tool is rendered on the page, not embedded from the home page: '+c.slug);
  assert.match(page,/"@type":"FAQPage"/);
  assert.match(page,/"@type":"BreadcrumbList"/);
  for(const m of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  assert.ok(html.includes('href="'+c.slug+'"'),'Home page links to '+c.slug);
  assert.ok(script.includes('"'+c.id+'": "'+c.slug+'"'),'tools.js slug for '+c.id);
 }
});

test('sitemap lists every tool page',()=>{
 const sm=readPage('sitemap.xml');
 for(const c of TOOL_CONTENT) assert.ok(sm.includes('<loc>https://toolsbravo.com/'+c.slug+'</loc>'),c.slug);
});

test('generated pages are up to date with scripts/content.mjs',()=>{
 execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/build.mjs',import.meta.url)),'--check'],{stdio:'pipe'});
});

test('finance worked examples match the calculators',()=>{
 const ukPay=vm.runInNewContext(script.match(/function ukPay\(gross, pct\) \{[\s\S]*?\n\}/)[0]+';ukPay');
 const payoff=vm.runInNewContext(script.match(/function payoff\(bal, r, pay\) \{[\s\S]*?\n\}/)[0]+';payoff');
 const money=n=>n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 const pay=readPage('uk-take-home-pay-calculator.html');
 for(const g of [30000,45000,60000]){const r=ukPay(g,0);for(const v of [r.tax,r.ni,r.net,r.net/12]) assert.ok(pay.includes('£'+money(v)),'take-home '+g+': £'+money(v));}
 const r=6.9/1200,m=10000*r/(1-Math.pow(1+r,-60));
 assert.ok(readPage('loan-repayment-calculator.html').includes('£'+money(m)));
 const d=payoff(3000,24.9/1200,150),debt=readPage('debt-payoff-calculator.html');
 assert.ok(debt.includes(d.months+' months')&&debt.includes('£'+money(d.interest)));
 let bal=1000;const mr=Math.pow(1.04,1/12)-1;for(let i=0;i<120;i++)bal=bal*(1+mr)+100;
 assert.ok(readPage('savings-calculator.html').includes('£'+money(bal)));
});

test('automation builder is linked and motion respects user preferences',()=>{
 assert.ok(script.includes('href="automation-builder.html"'));
 assert.ok(html.includes('href="automation-builder.html"'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('.flow-pulse{animation:none'));
 assert.ok(readPage('automation-builder.html').includes('<link rel="canonical" href="https://toolsbravo.com/automation-builder.html">'));
});

test('salary pages agree with the take-home pay calculator',()=>{
 const ukPay=vm.runInNewContext(script.match(/function ukPay\(gross, pct\) \{[\s\S]*?\n\}/)[0]+';ukPay');
 const money=n=>n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 const hub=readPage('salary-after-tax.html'),sm=readPage('sitemap.xml');
 const salaries=[...hub.matchAll(/href="(\d+)-after-tax\.html"/g)].map(m=>Number(m[1]));
 assert.ok(salaries.length>=20);
 for(const g of salaries){
  const page=readPage(g+'-after-tax.html'),r=ukPay(g,0);
  for(const v of [r.net,r.net/12,r.tax,r.ni]) assert.ok(page.includes('£'+money(v)),g+': £'+money(v));
  assert.ok(page.includes('<link rel="canonical" href="https://toolsbravo.com/'+g+'-after-tax.html">'));
  assert.ok(page.includes('id="sg" inputmode="decimal" value="'+g+'"'),'calculator prefilled for '+g);
  assert.ok(sm.includes('/'+g+'-after-tax.html</loc>'));
 }
});

test('every page has social image, icon and a single canonical',()=>{
 for(const p of ['index.html','about.html','privacy.html','automation-builder.html','salary-after-tax.html',...TOOL_CONTENT.map(c=>c.slug)]){
  const page=readPage(p);
  assert.equal(page.split('rel="canonical"').length-1,1,p);
  assert.ok(page.includes('og:image" content="https://toolsbravo.com/assets/og.png"'),p);
  assert.ok(page.includes('rel="icon" href="assets/icon.svg"'),p);
  assert.ok(!page.includes('abrar858.github.io'),p);
 }
 assert.ok(readPage('404.html').includes('<meta name="robots" content="noindex">'));
});

test('payoff calculator amortization examples and safety cap',()=>{
 const fn=vm.runInNewContext(script.match(/function payoff\(bal, r, pay\) \{[\s\S]*?\n\}/)[0]+';payoff');
 const free=fn(1200,0,100);
 assert.equal(free.months,12);
 assert.equal(free.interest,0);
 const charged=fn(1000,.01,100);
 assert.equal(charged.months,11);
 assert.ok(charged.interest>0);
 assert.equal(fn(1000,.1,1).months,1200);
});

test('HTML-escaping helper protects tool-generated markup',()=>{
 const fn=vm.runInNewContext(script.match(/const esc = [^\n]+/)[0]+';esc');
 assert.equal(fn('<img src="x" onerror="x">&'),'&lt;img src=&quot;x&quot; onerror=&quot;x&quot;&gt;&amp;');
});

test('custom domain and crawl configuration remain aligned',()=>{
 assert.equal(readPage('CNAME').trim(),'toolsbravo.com');
 assert.ok(html.includes('https://toolsbravo.com/'));
 assert.ok(readPage('robots.txt').includes('Sitemap: https://toolsbravo.com/sitemap.xml'));
});

test('every tool is present and mapped to a unique dedicated page',()=>{
 const tools=[...script.matchAll(/\{id:\s*"([^"]+)"\s*,\s*cat:\s*"([^"]+)"/g)];
 assert.ok(tools.length>=44,'Expected at least 44 tools');
 const count=tools.length;
 assert.ok(html.includes(count+' free online tools'),'Home page description should state the tool count ('+count+')');
 const ids=tools.map(m=>m[1]);
 assert.equal(new Set(ids).size,count,'Tool IDs must be unique');
 const contentIds=TOOL_CONTENT.map(t=>t.id);
 assert.deepEqual([...contentIds].sort(),[...ids].sort(),'Every tool must have a generated content page');
 const slugs=TOOL_CONTENT.map(t=>t.slug);
 assert.equal(new Set(slugs).size,count,'Tool page paths must be unique');
 for(const slug of slugs){
  assert.ok(readPage('sitemap.xml').includes('https://toolsbravo.com/'+slug),'Missing sitemap entry '+slug);
  assert.ok(html.includes('href="'+slug+'"'),'Missing homepage link '+slug);
 }
});

test('locally hosted PDF and document dependencies are nonempty',()=>{
 const assets=['pdf-lib.min.js','pdf.min.js','pdf.worker.min.js','mammoth.browser.min.js','fflate.min.js','xlsx.full.min.js'];
 for(const name of assets){
  const file=new URL('../assets/vendor/'+name,import.meta.url);
  assert.ok(statSync(file).size>10000,'Missing or truncated vendor library: '+name);
 }
});

test('homepage explains browser storage accurately',()=>{
 assert.match(html,/saved automation workflows may be stored locally/i);
 assert.match(readPage('privacy.html'),/local storage is used only/i);
});

test('pages load CSS and JS with a content version tag', async ()=>{
 const {createHash}=await import('node:crypto');
 const tag=p=>createHash('sha256').update(readPage(p).replace(/\r\n/g,'\n')).digest('hex').slice(0,10);
 for(const p of ['index.html','404.html','about.html','salary-after-tax.html',...TOOL_CONTENT.map(c=>c.slug)]){
  const page=readPage(p);
  assert.ok(page.includes('assets/tools.js?v='+tag('assets/tools.js')+'"'),'tools.js version tag in '+p);
  assert.ok(page.includes('assets/site.css?v='+tag('assets/site.css')+'"'),'site.css version tag in '+p);
 }
});
