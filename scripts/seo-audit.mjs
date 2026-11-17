// Technical SEO audit of a deployed ToolsBravo site (or a local server).
//
//   node scripts/seo-audit.mjs                      # audits https://toolsbravo.com
//   node scripts/seo-audit.mjs http://127.0.0.1:4173 # audits a local build
//   node scripts/seo-audit.mjs --json > audit.json  # machine-readable output
//
// Reads robots.txt and sitemap.xml, fetches every sitemap URL and every internal link found on those
// pages, and reports: HTTP status and content type, canonical consistency, robots directives, titles,
// descriptions, H1s, JSON-LD validity (and BreadcrumbList), broken internal links, orphan pages,
// pages linked but missing from the sitemap, and duplicate titles or descriptions.
// It only reads public pages. No credentials, no third-party services. Exit code 1 on errors.
const args = process.argv.slice(2), asJson = args.includes("--json");
const BASE = (args.find(a => /^https?:\/\//.test(a)) || "https://toolsbravo.com").replace(/\/$/, "");
const CANONICAL_ORIGIN = "https://toolsbravo.com";
const UA = "ToolsBravo-SEO-audit/1.0";

const errors = [], warnings = [];
const err = (url, msg) => errors.push({url, msg}), warn = (url, msg) => warnings.push({url, msg});
const get = async url => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {redirect: "manual", headers: {"user-agent": UA}});
      return {status: r.status, type: r.headers.get("content-type") || "", location: r.headers.get("location"), body: r.status === 200 ? await r.text() : ""};
    } catch (e) { if (attempt === 2) return {status: 0, type: "", body: "", error: e.message}; await new Promise(r => setTimeout(r, 500 * (attempt + 1))); }
  }
};
// Maps a production URL to the server being audited (lets the same sitemap drive a local audit).
const local = u => u.startsWith(CANONICAL_ORIGIN) ? BASE + u.slice(CANONICAL_ORIGIN.length) : u;
const canonicalPath = u => { const x = new URL(u, CANONICAL_ORIGIN + "/"); return x.pathname === "/index.html" ? "/" : x.pathname; };
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i")) || [])[1];
const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = s => decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

async function main() {
  const robots = await get(BASE + "/robots.txt");
  if (robots.status !== 200) err("/robots.txt", `HTTP ${robots.status}`);
  else {
    if (!/^sitemap:\s*https:\/\/toolsbravo\.com\/sitemap\.xml\s*$/im.test(robots.body)) err("/robots.txt", "does not reference https://toolsbravo.com/sitemap.xml");
    if (/^disallow:\s*\/\s*$/im.test(robots.body)) err("/robots.txt", "disallows the whole site");
  }
  const sm = await get(BASE + "/sitemap.xml");
  if (sm.status !== 200) { err("/sitemap.xml", `HTTP ${sm.status}`); return finish({}); }
  if (!/xml/.test(sm.type)) warn("/sitemap.xml", `content type ${sm.type}`);
  const locs = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => decode(m[1]));
  const lastmods = [...sm.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
  const dupLocs = locs.filter((u, i) => locs.indexOf(u) !== i);
  dupLocs.forEach(u => err(u, "listed twice in sitemap"));
  locs.filter(u => !u.startsWith(CANONICAL_ORIGIN + "/")).forEach(u => err(u, "sitemap URL is not on https://toolsbravo.com"));
  const future = lastmods.filter(d => new Date(d) > new Date(Date.now() + 864e5));
  if (future.length) warn("/sitemap.xml", `${future.length} lastmod dates are in the future`);

  const pages = new Map(); // canonical path -> info
  const inbound = new Map(); // path -> set of pages linking to it
  const linked = new Set();
  const fetchPage = async (path, fromSitemap) => {
    if (pages.has(path)) return pages.get(path);
    const url = BASE + (path === "/" ? "/" : path), r = await get(url);
    const info = {path, fromSitemap, status: r.status, type: r.type, location: r.location};
    pages.set(path, info);
    if (r.status !== 200) return info;
    const h = r.body;
    info.title = text((h.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1]);
    const metas = [...h.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
    info.description = decode(attr(metas.find(m => /name="description"/i.test(m)) || "", "content") || "");
    info.robots = (attr(metas.find(m => /name="robots"/i.test(m)) || "", "content") || "").toLowerCase();
    const links = [...h.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
    info.canonical = attr(links.find(l => /rel="canonical"/i.test(l)) || "", "href") || "";
    info.h1 = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => text(m[1]));
    info.ld = [];
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      try { const j = JSON.parse(m[1]); (Array.isArray(j) ? j : j["@graph"] || [j]).forEach(x => info.ld.push(x)); }
      catch (e) { err(path, "invalid JSON-LD: " + e.message); }
    }
    info.words = text(h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, "")).split(" ").length;
    info.links = [...new Set([...h.matchAll(/<a\b[^>]*\shref="([^"#][^"]*|#[^"]*)"/gi).map(m => m[1])])];
    for (const href of info.links) {
      if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;
      const u = new URL(href, CANONICAL_ORIGIN + path);
      if (u.origin !== CANONICAL_ORIGIN) continue;
      const target = canonicalPath(u.href);
      linked.add(target);
      if (target !== path) { if (!inbound.has(target)) inbound.set(target, new Set()); inbound.get(target).add(path); }
    }
    return info;
  };

  const sitemapPaths = locs.map(canonicalPath);
  const queue = [...sitemapPaths];
  await pool(queue, 8, p => fetchPage(p, true));
  // Every internal link target that isn't in the sitemap: fetch it too (catches broken links and missing pages).
  const extra = [...linked].filter(p => !pages.has(p));
  await pool(extra, 8, p => fetchPage(p, false));

  const titles = new Map(), descs = new Map();
  for (const info of pages.values()) {
    const {path} = info;
    if (info.status !== 200) {
      const from = [...(inbound.get(path) || [])].slice(0, 3).join(", ");
      (info.fromSitemap ? err : err)(path, `HTTP ${info.status}${info.location ? " → " + info.location : ""}${info.fromSitemap ? " (in sitemap)" : ""}${from ? " linked from " + from : ""}`);
      continue;
    }
    if (!/text\/html/.test(info.type)) err(path, `content type ${info.type}`);
    const expected = CANONICAL_ORIGIN + path;
    if (!info.canonical) err(path, "no canonical link");
    else if (info.canonical !== expected) (info.fromSitemap ? err : warn)(path, `canonical ${info.canonical} differs from ${expected}`);
    if (/noindex/.test(info.robots)) (info.fromSitemap ? err : warn)(path, `robots meta "${info.robots}"${info.fromSitemap ? " but listed in sitemap" : ""}`);
    if (info.fromSitemap === false && !/noindex/.test(info.robots) && path !== "/404.html") warn(path, "indexable page linked internally but missing from sitemap");
    if (!info.title) err(path, "missing title");
    else if (info.title.length > 65) warn(path, `title ${info.title.length} chars (may be truncated): ${info.title}`);
    if (!info.description) err(path, "missing meta description");
    else if (info.description.length > 160) warn(path, `description ${info.description.length} chars`);
    else if (info.description.length < 70) warn(path, `description only ${info.description.length} chars`);
    if (info.h1.length !== 1) err(path, `${info.h1.length} H1 elements`);
    const crumbs = info.ld.find(x => x["@type"] === "BreadcrumbList");
    if (path !== "/" && path !== "/404.html" && !crumbs) warn(path, "no BreadcrumbList");
    if (crumbs) crumbs.itemListElement?.forEach((it, i) => {
      if (it.position !== i + 1) err(path, "breadcrumb positions not sequential");
      if (it.item && !String(it.item).startsWith(CANONICAL_ORIGIN)) err(path, `breadcrumb item not absolute: ${it.item}`);
    });
    if (info.fromSitemap && path !== "/" && !(inbound.get(path)?.size)) err(path, "orphan: no internal links point here");
    if (info.title) { if (!titles.has(info.title)) titles.set(info.title, []); titles.get(info.title).push(path); }
    if (info.description) { if (!descs.has(info.description)) descs.set(info.description, []); descs.get(info.description).push(path); }
  }
  for (const [t, ps] of titles) if (ps.length > 1) err(ps.join(", "), `duplicate title: ${t}`);
  for (const [d, ps] of descs) if (ps.length > 1) warn(ps.join(", "), `duplicate description: ${d.slice(0, 60)}…`);
  const notInSitemap = [...pages.values()].filter(p => !p.fromSitemap && p.status === 200 && !/noindex/.test(p.robots || "") && p.path !== "/404.html").map(p => p.path);
  finish({sitemapCount: locs.length, pagesChecked: pages.size, notInSitemap, pages: [...pages.values()].map(({links, ld, ...p}) => ({...p, ldTypes: (ld || []).map(x => x["@type"]), inbound: inbound.get(p.path)?.size || 0}))});
}

async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({length: n}, async () => { while (i < items.length) await fn(items[i++]); })); }

function finish(summary) {
  if (asJson) { console.log(JSON.stringify({base: BASE, date: new Date().toISOString(), ...summary, errors, warnings}, null, 2)); }
  else {
    console.log(`SEO audit of ${BASE} — ${new Date().toISOString()}`);
    if (summary.sitemapCount !== undefined) console.log(`Sitemap URLs: ${summary.sitemapCount} · pages fetched (incl. linked): ${summary.pagesChecked}`);
    const pages = summary.pages || [];
    if (pages.length) {
      const ok = pages.filter(p => p.status === 200);
      console.log(`HTTP 200: ${ok.length}/${pages.length} · with BreadcrumbList: ${ok.filter(p => p.ldTypes.includes("BreadcrumbList")).length} · median main-content words: ${median(ok.map(p => p.words))}`);
    }
    console.log(`\nErrors (${errors.length})`); errors.forEach(e => console.log(`  ✗ ${e.url}: ${e.msg}`));
    console.log(`\nWarnings (${warnings.length})`); warnings.forEach(w => console.log(`  ! ${w.url}: ${w.msg}`));
  }
  process.exitCode = errors.length ? 1 : 0;
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
main().catch(e => { console.error(e); process.exitCode = 2; });
