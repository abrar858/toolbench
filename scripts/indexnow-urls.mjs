// Select only canonical, publicly indexable URLs for IndexNow.
// Usage: node scripts/indexnow-urls.mjs [--all] [changed file paths...]
import {readFileSync} from 'node:fs';
const origin='https://toolsbravo.com/';
const xml=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const canonical=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!canonical.length||new Set(canonical).size!==canonical.length||canonical.some(u=>!u.startsWith(origin)))throw Error('Invalid sitemap');
const known=new Set(canonical);
const paths=process.argv.slice(2);
const selected=paths.includes('--all')?canonical:paths.map(p=>{
 p=p.replace(/^\.\//,'');
 if(p==='index.html')return origin;
 if(!/^[a-z0-9-]+\.html$/.test(p))return null;
 return origin+p;
}).filter(u=>u&&known.has(u));
process.stdout.write(JSON.stringify([...new Set(selected)])+'\n');
