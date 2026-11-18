// Run with: node --test tests/site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync, readdirSync, existsSync} from 'node:fs';
const require_fs={readdirSync,existsSync};
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

test('popular homepage links are unique and supplemental pages do not inflate core tool count',()=>{
 const quick=html.match(/<nav class="quick"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(quick,'Popular tools navigation missing');
 const links=[...quick.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(links.length>0,'Popular navigation should not be empty');
 assert.equal(new Set(links).size,links.length,'Duplicate links in Popular tools navigation');
 const core=[...script.matchAll(/\{id:\s*"([^"]+)"\s*,\s*cat:\s*"([^"]+)"/g)];
 const cards=[...html.matchAll(/class="tcard tcard-/g)];
 assert.equal(core.length,46,'Update the published core tool count deliberately if the catalog changes');
 assert.equal(cards.length,core.length+2,'Homepage should show the core tools plus the salary table and automation builder');
 // The counts people read must match the cards they can see.
 assert.match(html,new RegExp(`<p class="lede">${cards.length} fast, simple tools`),'hero count matches the cards');
 assert.match(html,new RegExp(`<meta name="description" content="${cards.length} free online tools`),'meta description count matches the cards');
 const chips=[...html.matchAll(/href="#\w+"[^>]*>[^<]*<small>(\d+)/g)].reduce((t,m)=>t+ +m[1],0);
 assert.equal(chips,cards.length,'category counts add up to the cards');
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
 // The published count is every tool card: core tools plus the salary table and automation builder.
 assert.ok(html.includes((count+2)+' free online tools'),'Home page description should state the tool count ('+(count+2)+')');
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

test('home page is pre-rendered so it does not shift when the script runs', ()=>{
 const main=html.match(/<main id="app"[^>]*>([\s\S]*?)<\/main>/)[1];
 assert.match(main,/class="home-hero"/);
 assert.match(main,/<input id="q" type="search"/);
 for(const c of TOOL_CONTENT) assert.ok(main.includes('href="'+c.slug+'"'),'Pre-rendered card missing for '+c.slug);
});

test('pages make no third-party font requests and preload self-hosted fonts', ()=>{
 for(const p of ['index.html','404.html','about.html','privacy.html',...TOOL_CONTENT.map(c=>c.slug)]){
  const page=readPage(p);
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(page),'Third-party font request in '+p);
  assert.match(page,/<link rel="preload" href="\/?assets\/fonts\/figtree-latin\.woff2" as="font" type="font\/woff2" crossorigin>/,p);
  assert.match(page,/<a class="logo" href="[^"]*" aria-label="ToolsBravo home">/,'Logo link needs a name: '+p);
 }
 for(const f of ['figtree-latin','figtree-latin-ext','bricolage-latin','bricolage-latin-ext']) assert.ok(statSync(new URL('../assets/fonts/'+f+'.woff2',import.meta.url)).size>5000,f);
 assert.match(readPage('assets/fonts/OFL.txt'),/SIL OPEN FONT LICENSE/);
 assert.ok(!/googleapis|gstatic/.test(css),'site.css must not load remote fonts');
 assert.match(css,/font-display:optional/);
});

test('every url() in site.css points to a file that exists', ()=>{
 const urls=[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]).filter(u=>!/^(data:|https?:|#)/.test(u));
 assert.ok(urls.length>=4);
 for(const u of urls) assert.ok(statSync(new URL('../assets/'+u,import.meta.url)).size>0,'Missing file for url('+u+') in site.css');
});

test('the highest-value pages keep in-depth guides (500+ words)', async ()=>{
 const {DEPTH}=await import('../scripts/content-depth.mjs');
 const strip=s=>s.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\s+/g,' ').trim();
 assert.ok(Object.keys(DEPTH).length>=15);
 for(const c of TOOL_CONTENT.filter(c=>DEPTH[c.id])){
  const page=readPage(c.slug), words=strip([...page.matchAll(/<article class="guide[^"]*">([\s\S]*?)<\/article>/g)].map(m=>m[1]).join(' ')).split(' ').length;
  assert.ok(words>=500,c.slug+' guide has only '+words+' words');
 }
});

test('finance figures in the in-depth guides match the calculators', ()=>{
 const ukPay=vm.runInNewContext(script.match(/function ukPay\(gross, pct\) \{[\s\S]*?\n\}/)[0]+';ukPay');
 const money=n=>'£'+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 const pay=readPage('uk-take-home-pay-calculator.html');
 for(const [a,b] of [[45000,50000],[50000,55000],[100000,110000]]) assert.ok(pay.includes(money(ukPay(b,0).net-ukPay(a,0).net)),'pay rise '+a+'→'+b);
 const cost=ukPay(35000,0).net-ukPay(35000,5).net;
 const whole='£'+Math.round(cost).toLocaleString('en-GB');
 assert.ok(Math.abs(cost-Math.round(cost))<0.005&&new RegExp(whole.replace(/[.£]/g,'\\$&')+'(?![\\d.])').test(pay)||pay.includes(money(cost)),'pension cost on £35,000 ('+money(cost)+')');
 const loan=readPage('loan-repayment-calculator.html'), m=(P,apr,n)=>{const r=apr/1200;return P*r/(1-Math.pow(1+r,-n));};
 for(const y of [3,5,7]){const p=m(10000,6.9,y*12);assert.ok(loan.includes(money(p))&&loan.includes(money(p*y*12-10000)),'loan '+y+' years');}
 assert.ok(loan.includes(money(m(200000,4.5,360))),'30-year mortgage');
});

test('every page header carries the full category menu, built into the HTML',()=>{
 const pages=['index.html','about.html','privacy.html','404.html','salary-after-tax.html','30000-after-tax.html',...TOOL_CONTENT.map(c=>c.slug)];
 for(const p of pages){
  // 404.html is served at any depth, so its links are root-relative.
  const page=readPage(p).replace(/href="\//g,'href="'), nav=page.match(/<nav class="mega" id="site-menu"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,`${p}: header menu missing`);
  assert.equal([...nav.matchAll(/<details class="mm/g)].length,5,`${p}: five category menus`);
  for(const c of TOOL_CONTENT)assert.ok(nav.includes(`href="${c.slug}"`),`${p}: menu link to ${c.slug}`);
  assert.ok(nav.includes('href="salary-after-tax.html"')&&nav.includes('href="automation-builder.html"'),`${p}: salary table and automations`);
  assert.ok(page.includes('class="menu-btn"')&&page.includes('aria-controls="site-menu"'),`${p}: menu button`);
  assert.ok(!page.includes('category-dropdowns.js'),`${p}: old runtime dropdown script`);
 }
 for(const c of TOOL_CONTENT){
  const nav=readPage(c.slug).match(/<nav class="mega"[\s\S]*?<\/nav>/)[0];
  assert.ok(nav.includes(`href="${c.slug}" aria-current="page"`),`${c.slug}: marks itself in the menu`);
  assert.equal((nav.match(/aria-current="page"/g)||[]).length,1,`${c.slug}: one current item`);
  assert.equal((nav.match(/class="mm is-current"/g)||[]).length,1,`${c.slug}: one current category`);
 }
});

test('footer links each category (not every tool) plus About and Privacy',()=>{
 for(const p of ['index.html','about.html','404.html','salary-after-tax.html',...TOOL_CONTENT.map(c=>c.slug)]){
  const page=readPage(p).replace(/href="\//g,'href="'), foot=page.match(/<footer class="site-foot">([\s\S]*?)<\/footer>/)?.[1];
  assert.ok(foot,`${p}: footer missing`);
  const cats=[...foot.matchAll(/<nav class="foot-cats"[^>]*>([\s\S]*?)<\/nav>/g)][0]?.[1]||'';
  assert.deepEqual([...cats.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),['#files','#office','#finance','#general','#advanced'].map(h=>(p==='404.html'?'':'./')+h).map(h=>h.replace(/^\.\//,p==='404.html'?'':'./')),`${p}: five category links`);
  for(const c of TOOL_CONTENT)assert.ok(!foot.includes(`href="${c.slug}"`),`${p}: footer should not list ${c.slug}`);
  for(const h of ['about.html','privacy.html','automation-builder.html'])assert.ok(foot.includes(`href="${h}"`),`${p}: footer link to ${h}`);
  assert.equal((page.match(/<footer/g)||[]).length,1,`${p}: one footer`);
 }
});

test('site-wide crawl: every page is in the sitemap, every internal link resolves, one H1, titles fit',()=>{
 const {readdirSync,existsSync}=require_fs;
 const root=new URL('../',import.meta.url);
 const htmlFiles=readdirSync(root).filter(f=>f.endsWith('.html'));
 const sitemap=readPage('sitemap.xml'), locs=[...sitemap.matchAll(/<loc>https:\/\/toolsbravo\.com\/([^<]*)<\/loc>/g)].map(m=>m[1]||'index.html');
 assert.equal(new Set(locs).size,locs.length,'duplicate sitemap URLs');
 for(const l of locs)assert.ok(existsSync(new URL(l,root)),`sitemap lists missing file ${l}`);
 for(const f of htmlFiles){
  const h=readPage(f), noindex=/<meta name="robots" content="[^"]*noindex/.test(h);
  if(f!=='404.html'&&!noindex)assert.ok(locs.includes(f),`${f} is indexable but not in the sitemap`);
  if(f==='404.html')continue;
  assert.equal((h.match(/<h1\b/g)||[]).length,1,`${f}: exactly one H1`);
  const title=(h.match(/<title>([^<]*)<\/title>/)||[])[1].replace(/&amp;/g,'&');
  assert.ok(title.length<=65,`${f}: title ${title.length} chars: ${title}`);
  for(const [,href] of h.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)){
   if(/^(https?:|mailto:|tel:|#)/.test(href))continue;
   const [path,hash]=href.replace(/^\.\//,'').split('#'), target=path||'index.html';
   assert.ok(existsSync(new URL(target,root)),`${f}: broken link ${href}`);
   if(hash&&target==='index.html')assert.ok(readPage('index.html').includes(`id="${hash}"`),`${f}: link ${href} has no target on the home page`);
  }
 }
});
