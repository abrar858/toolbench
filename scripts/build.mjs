// Generates the static, indexable pages of ToolsBravo:
//   - one page per tool (copy in scripts/content.mjs, behaviour in assets/tools.js)
//   - "£X after tax" salary pages and their hub, computed with the site's own ukPay()
//   - 404.html, sitemap.xml and the crawlable tool directory on the home page
//   node scripts/build.mjs           write the files
//   node scripts/build.mjs --check   fail if any generated file is out of date
import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import vm from "node:vm";
import {createHash} from "node:crypto";
import {TOOL_CONTENT} from "./content.mjs";

const ROOT = new URL("../", import.meta.url);
const ORIGIN = "https://toolsbravo.com/";
const SITE = "ToolsBravo";
const TAX_YEAR = "2026/27";
const RATES_CHECKED = "15 November 2026"; // Re-check HMRC rates each spring and update this date.
const CATS = {files: "PDF & image", office: "Office & data", finance: "Finance", general: "General", advanced: "Developer"};
const SALARIES = [18000, 20000, 22000, 24000, 25000, 26000, 28000, 30000, 32000, 35000, 38000, 40000, 42000, 45000, 48000,
  50000, 55000, 60000, 65000, 70000, 75000, 80000, 90000, 100000, 110000, 120000, 125000, 150000];
const read = p => readFileSync(new URL(p, ROOT), "utf8").replace(/\r\n/g, "\n");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const gbp = (n, d = 2) => (n < 0 ? "−£" : "£") + Math.abs(n).toLocaleString("en-GB", {minimumFractionDigits: d, maximumFractionDigits: d});
const k = n => "£" + n.toLocaleString("en-GB");
const pct = n => (Math.round(n * 1000) / 10).toLocaleString("en-GB") + "%";
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

// Load the tool definitions (name, category, UI markup) and ukPay() from the live script.
const js = read("assets/tools.js");
const ctx = {document: {querySelector: () => null, querySelectorAll: () => []}, window: {}, navigator: {}};
vm.createContext(ctx);
vm.runInContext(js.slice(0, js.indexOf("const SLUGS")) + ";globalThis.T = TOOLS; globalThis.P = ukPay;", ctx);
const TOOLS = ctx.T, ukPay = ctx.P;
const slugsInJs = vm.runInNewContext("(" + js.match(/const SLUGS = (\{[\s\S]*?\});/)[1] + ")");

const byId = new Map(TOOL_CONTENT.map(c => [c.id, c]));
for (const t of TOOLS) {
  const c = byId.get(t.id);
  if (!c) throw new Error(`No page content for tool "${t.id}" in scripts/content.mjs`);
  if (slugsInJs[t.id] !== c.slug) throw new Error(`Slug for "${t.id}" differs between assets/tools.js and content.mjs`);
}
const tool = id => TOOLS.find(t => t.id === id);
const salarySlug = g => `${g}-after-tax.html`;

/* ---------- shared page parts ---------- */
const head = ({title, description, url, ogTitle = title}) => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${url ? `<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">` : `<meta name="robots" content="noindex">`}
<meta name="theme-color" content="#0B2545">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:locale" content="en_GB">
${url ? `<meta property="og:url" content="${url}">\n` : ""}<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ORIGIN}assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${SITE}: free online tools and UK calculators">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/bricolage-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script>try{const t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>`;

// Footer: one link per category, to that category's tools on the home page.
// Supplementary pages: which category they belong to, and their address.
const EXTRA_PAGE = {salary: ["finance", "salary-after-tax.html"], automation: ["general", "automation-builder.html"]};
const catOf = current => EXTRA_PAGE[current]?.[0] || tool(current)?.cat;
const footCats = current => {
  const cur = catOf(current);
  return Object.entries(CATS).map(([cat, label]) => {
    const n = TOOLS.filter(t => t.cat === cat).length + (EXTRA_CARDS[cat] || []).length;
    return `<a href="./#${cat}"${cat === cur ? ' class="is-current"' : ""}>${esc(label)} tools <small>${n}</small></a>`;
  }).join("");
};

// Tool icons and the category menu shown in every page header.
const ICONS = vm.runInNewContext("(" + js.match(/const ICONS = (\{[\s\S]*?\});/)[1] + ")");
// Extra homepage cards (salary table, automation builder) also appear in their category menu.
const EXTRA_CARDS = vm.runInNewContext("(" + js.match(/const EXTRA_CARDS = (\{[\s\S]*?\n\});/)[1] + ")");
const CAT_BLURB = {
  files: "Merge, split, sign, compress and convert PDFs and images.",
  office: "Convert, merge and tidy Word, Excel and CSV files.",
  finance: "UK take-home pay, VAT, loans, savings and budgets.",
  general: "Everyday calculators, converters and text tools.",
  advanced: "Formatters, encoders and generators for developers.",
};
const CHEVRON = '<svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const menuItem = (href, icon, name, desc, current) =>
  `<li><a href="${href}"${current ? ' aria-current="page"' : ""}><span class="mm-ico" aria-hidden="true">${esc(icon)}</span><span class="mm-text"><strong>${esc(name)}</strong><small>${esc(desc)}</small></span></a></li>`;
function siteMenu(current) {
  const currentCat = catOf(current);
  return `<nav class="mega" id="site-menu" aria-label="Tool categories">${Object.entries(CATS).map(([cat, label]) => {
    const list = TOOLS.filter(t => t.cat === cat);
    const items = list.map(t => menuItem(byId.get(t.id).slug, ICONS[t.id] || "•", t.name, t.desc, t.id === current)).join("")
      + (EXTRA_CARDS[cat] || []).map(x => menuItem(x.href, x.icon, x.name, x.desc, x.href === EXTRA_PAGE[current]?.[1])).join("");
    const count = list.length + (EXTRA_CARDS[cat] || []).length;
    return `<details class="mm${cat === currentCat ? " is-current" : ""}" data-cat="${cat}"><summary>${esc(label)}${CHEVRON}</summary><div class="mm-panel"><div class="mm-intro"><p class="mm-count">${count} tools</p><p class="mm-title">${esc(label)}</p><p class="mm-blurb">${CAT_BLURB[cat]}</p><a class="mm-all" href="./#${cat}">All ${esc(label)} tools <span aria-hidden="true">→</span></a></div><ul class="mm-list" aria-label="${esc(label)} tools">${items}</ul></div></details>`;
  }).join("")}<a class="mm-link" href="automation-builder.html"${current === "automation" ? ' aria-current="page"' : ""}>Automations</a></nav>`;
}
const MENU_BTN = '<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path class="l1" d="M4 7h16"/><path class="l2" d="M4 12h16"/><path class="l3" d="M4 17h16"/></svg></button>';
const headerBar = current => `<header class="top">
    <a class="logo" href="./" aria-label="ToolsBravo home"><img src="assets/icon.svg" alt="" width="32" height="32"><span id="siteName">${SITE}</span></a>
    ${siteMenu(current)}<button class="search-btn" type="button" aria-label="Search tools" aria-expanded="false" aria-controls="site-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button><button class="theme-btn" type="button" aria-label="Switch theme">☾</button>${MENU_BTN}
  </header>`;
const headerFor = (current = null, skip = "Skip to content") => `<a class="skip-link" href="#app">${skip}</a>
<div class="site-head"><div class="wrap">
  ${headerBar(current)}
  <div class="site-search" id="site-search" hidden><label class="sr-only" for="site-q">Search tools</label><input id="site-q" type="search" placeholder="Search all tools, e.g. merge PDF, VAT, JSON" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="site-results" aria-expanded="true"><ul id="site-results" role="listbox" aria-label="Matching tools"></ul></div>
</div></div>`;
const header = headerFor();
const hid = s => strip(s).toLowerCase().replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const h2 = text => `<h2 id="${hid(text)}">${esc(text)}</h2>`;
const toc = titles => `<nav class="aside-card toc" aria-label="On this page"><h2>On this page</h2><ul>${titles.map(t => `<li><a href="#${hid(t)}">${esc(t)}</a></li>`).join("")}</ul></nav>`;
const asideLinks = (title, links) => `<div class="aside-card"><h2>${esc(title)}</h2><ul>${links.map(([n, h]) => `<li><a href="${h}">${esc(n)}</a></li>`).join("")}</ul></div>`;
const toolHead = ({eyebrow, h1, lede, meta}) => `<header class="tool-head">
    <span class="eyebrow">${eyebrow}</span>
    <h1>${h1}</h1>
    <p class="lede">${lede}</p>
    ${meta ? `<ul class="tool-meta">${meta.map(m => `<li>${m}</li>`).join("")}</ul>` : ""}
  </header>`;

const footer = current => `<footer class="site-foot"><div class="wrap">
  <div class="foot-brand">
    <a class="logo" href="./" aria-label="${SITE} home"><img src="assets/icon.svg" alt="" width="28" height="28" loading="lazy"><span>${SITE}</span></a>
    <p>Free browser tools for PDFs, Office files, money and code. Tool inputs stay in your browser; your theme and saved automation workflows may be stored locally. Optional feedback is sent securely for review; see our privacy notice.</p>
  </div>
  <nav class="foot-cats" aria-label="Tool categories">${footCats(current)}</nav>
  <div class="foot-bar">
    <p>© <span id="yr">2026</span> <span class="sn">${SITE}</span> · Finance results are estimates for guidance only, not financial advice.</p>
    <p class="foot-links"><a href="about.html">About</a><a href="privacy.html">Privacy</a><a href="automation-builder.html">Automations</a></p>
  </div>
</div></footer>`;

const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, href], i) =>
  i === items.length - 1 ? `<span aria-current="page">${esc(name)}</span>` : `<a href="${href}">${esc(name)}</a>`).join(" › ")}</nav>`;
const crumbsLd = items => ({"@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) =>
  ({"@type": "ListItem", position: i + 1, name, item: ORIGIN + href.replace(/^\.\//, "")}))});
const faqLd = faqs => ({"@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) =>
  ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: strip(a)}}))});
const faqHtml = faqs => `<div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}</div>`;
// Sources for a finance page, with when the figures and rules were last reviewed.
const REVIEWED = "22 November 2026";
// Who wrote and checks the money pages (named on the About page).
const AUTHOR_NAME = "Bisma Zainab";
const AUTHOR_LD = {"@type": "Person", name: AUTHOR_NAME, url: "https://toolsbravo.com/about.html", jobTitle: "Software developer"};
const byline = (date = "2026-11-22", text = REVIEWED) => `<p class="byline">By <a href="about.html" rel="author">${AUTHOR_NAME}</a><span class="bl-extra">, developer of ToolsBravo · Figures checked against official sources</span> · Reviewed <time datetime="${date}">${text}</time></p>`;
const sourcesNote = c => `<p class="checked">${c.id === "take-home-pay" ? `Rates last checked against HMRC guidance on <time datetime="2026-11-15">${RATES_CHECKED}</time> for the ${TAX_YEAR} tax year.` : `Formulas and rules last reviewed on <time datetime="2026-11-22">${REVIEWED}</time>. Results are estimates, not financial advice.`} Sources: ${c.sources.map(([n, u]) => `<a href="${u}" rel="noopener">${esc(n)}</a>`).join(", ")}.</p>`;
const EMBEDS = {"take-home-pay": 740, "vat-calculator": 400, "loan-calculator": 700, "mortgage-overpayment": 860, "savings-calculator": 1040, "budget-planner": 520, "percentage-calculator": 420};
const embedCode = (t, c) => `<iframe src="${ORIGIN}embed/${c.slug}" title="${t.name}" width="100%" height="${EMBEDS[t.id]}" style="border:0;max-width:680px" loading="lazy"></iframe>\n<p><a href="${ORIGIN}${c.slug}">${t.name}</a> by ToolsBravo</p>`;
const embedBox = (t, c) => EMBEDS[t.id] ? `<details class="embed-box"><summary>Add this calculator to your website</summary><p>Free to use on your own website or blog. Copy this code into your page and keep the credit link.</p><label class="sr-only" for="embed-code">Embed code</label><textarea id="embed-code" readonly rows="4">${esc(embedCode(t, c))}</textarea><div class="btns"><button type="button" class="embed-copy">Copy code</button></div></details>` : "";
// A bare copy of a calculator for iframes: not indexed, canonical to the real page, root-relative links.
function embedPage(id) {
  const t = tool(id), c = byId.get(id), url = ORIGIN + c.slug;
  return `${head({title: `${t.name} | ${SITE}`, description: c.description})}
<link rel="canonical" href="${url}">
<style>body.embed{margin:0;padding:12px;background:var(--bg)}body.embed .panel{margin:0}.embed-credit{margin:10px 2px 0;font-size:.85rem;color:var(--muted)}</style>
</head>
<body class="embed" data-tool="${id}">
<main id="app"><section class="panel" aria-label="${esc(t.name)}">${t.ui}</section>
<p class="embed-credit"><a href="${url}" target="_blank" rel="noopener">${esc(t.name)}</a> by <a href="${ORIGIN}" target="_blank" rel="noopener">ToolsBravo</a> · free, no sign-up</p></main>
<script src="assets/tools.js"></script>
</body>
</html>
`.replace(/(href|src)="(?!https?:|\/|#|data:)(?:\.\/)?([^"]*)"/g, '$1="/$2"');
}
const ratesNote = `<p class="checked">Rates last checked against HMRC guidance on <time datetime="2026-11-15">${RATES_CHECKED}</time> for the ${TAX_YEAR} tax year. Sources: <a href="https://www.gov.uk/income-tax-rates" rel="noopener">GOV.UK income tax rates</a>, <a href="https://www.gov.uk/national-insurance-rates-letters" rel="noopener">National Insurance rates</a>.</p>`;

/* ---------- tool pages ---------- */
function toolPage(c) {
  const t = tool(c.id), url = ORIGIN + c.slug, cat = CATS[t.cat];
  const trail = [[SITE, "./"], [`${cat} tools`, `./#${t.cat}`], [t.name, c.slug]];
  const related = c.related.map(tool).filter(Boolean);
  const howTo = c.howTo || `How to use the ${/^[A-Z][a-z]/.test(t.name) ? t.name.charAt(0).toLowerCase() + t.name.slice(1) : t.name}`, salaryHeading = "Take-home pay for common salaries";
  return `${head({title: `${c.title} | ${SITE}`, description: c.description, url, ogTitle: c.title})}
${ld({"@context": "https://schema.org", "@type": "WebApplication", name: tool(c.id).name, url, description: c.description,
    applicationCategory: t.cat === "finance" ? "FinanceApplication" : t.cat === "advanced" ? "DeveloperApplication" : "UtilitiesApplication",
    operatingSystem: "Any modern web browser", isAccessibleForFree: true, inLanguage: "en-GB",
    offers: {"@type": "Offer", price: "0", priceCurrency: "GBP"}, publisher: {"@type": "Organization", name: SITE, url: ORIGIN},
    ...(t.cat === "finance" ? {author: AUTHOR_LD, dateModified: "2026-11-22"} : {})})}
${ld(crumbsLd(trail))}
${ld(faqLd(c.faqs.map(([q, a]) => [q, esc(a)])))}
</head>
<body data-tool="${t.id}">
${headerFor(c.id)}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: `${cat.toUpperCase()} TOOLS`, h1: esc(c.h1), lede: esc(c.lede),
    meta: ["Free, no sign-up", "Runs privately in your browser", t.cat === "finance" ? `Updated for ${TAX_YEAR}` : "Instant results"]})}
  ${t.cat === "finance" ? byline() : ""}
  <div class="tool-cols">
  <div class="tool-main">
  <section class="panel" aria-label="${esc(t.name)}">${t.ui}</section>
  ${embedBox(t, c)}
  <article class="guide">
    ${h2(howTo)}
    <ol>${c.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    ${c.sections.map(([h, body]) => `${h2(h)}\n    ${body.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tablewrap"><table>$1</table></div>')}`).join("\n    ")}
    ${c.id === "take-home-pay" ? `${h2(salaryHeading)}\n    <p>See the full breakdown for a specific salary, from ${k(SALARIES[0])} to ${k(SALARIES.at(-1))}, in the <a href="salary-after-tax.html">UK salary after tax table</a>.</p>` : ""}
    ${h2("Frequently asked questions")}
    ${faqHtml(c.faqs.map(([q, a]) => [q, esc(a)]))}
    ${c.sources ? sourcesNote(c) : ""}
  </article>
  <div class="related related-bottom"><h2>Related tools</h2><ul>${related.map(r => `<li><a href="${byId.get(r.id).slug}">${esc(r.name)}</a></li>`).join("")}</ul></div>
  </div>
  <aside class="tool-aside"><div class="tool-aside-inner">
    ${toc([howTo, ...c.sections.map(s => s[0]), ...(c.id === "take-home-pay" ? [salaryHeading] : []), "Frequently asked questions"])}
    ${asideLinks("Related tools", related.map(r => [r.name, byId.get(r.id).slug]))}
  </div></aside>
  </div>
</div>
<div class="wrap"><div data-feedback-widget="${c.slug.replace(/\.html$/, "")}"></div></div>
</main>
${footer(t.id)}
<script src="assets/tools.js"></script><script defer src="assets/feedback.js"></script>${c.script ? `\n<script src="${c.script}"></script>` : ""}
</body>
</html>
`;
}

/* ---------- salary pages ---------- */
function bands(g) {
  const r = ukPay(g, 0), pa = g > 100000 ? Math.max(0, 12570 - (g - 100000) / 2) : 12570, ti = Math.max(0, g - pa);
  const b = {pa, ti, basic: Math.min(ti, 37700), higher: Math.max(0, Math.min(ti - 37700, 87440)), additional: Math.max(0, ti - 125140),
    niMain: Math.max(0, Math.min(g, 50270) - 12570), niUpper: Math.max(0, g - 50270)};
  const tax = b.basic * .2 + b.higher * .4 + b.additional * .45;
  if (Math.abs(tax - r.tax) > .005) throw new Error(`Band breakdown for ${g} does not match ukPay`);
  const next = ukPay(g + 100, 0);
  return {...r, ...b, marginal: 1 - (next.net - r.net) / 100, effective: (r.tax + r.ni) / g,
    band: b.additional > 0 ? "additional rate (45%)" : b.higher > 0 ? "higher rate (40%)" : b.basic > 0 ? "basic rate (20%)" : "personal allowance (0%)"};
}

// 2026/27 student loan repayment thresholds (GOV.UK): 9% above the threshold, 6% for postgraduate loans.
const STUDENT_LOANS = [["Plan 1", 26900, .09], ["Plan 2", 29385, .09], ["Plan 4 (Scotland)", 33795, .09], ["Plan 5", 25000, .09], ["Postgraduate Loan", 21000, .06]];
const studentLoan = (g, [, threshold, rate]) => Math.max(0, g - threshold) * rate;
// 2026/27 Scottish income tax (gov.scot): band widths on taxable income after the personal allowance.
const SCOT_BANDS = [[3967, .19, "starter"], [16956, .20, "basic"], [31092, .21, "intermediate"], [62430, .42, "higher"], [125140, .45, "advanced"], [Infinity, .48, "top"]];
function scotTax(g) {
  const pa = g > 100000 ? Math.max(0, 12570 - (g - 100000) / 2) : 12570, ti = Math.max(0, g - pa);
  let tax = 0, lo = 0, band = "personal allowance";
  for (const [hi, rate, name] of SCOT_BANDS) { if (ti > lo) { tax += (Math.min(ti, hi) - lo) * rate; band = name; } lo = hi; }
  return {tax, band};
}
const SALARY_SOURCES = `<p class="checked">Student loan thresholds from <a href="https://www.gov.uk/repaying-your-student-loan/what-you-pay" rel="noopener">GOV.UK: what you pay</a>. Scottish rates from <a href="https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/" rel="noopener">gov.scot: Scottish income tax 2026 to 2027</a>.</p>`;

function salaryPage(g, i) {
  const r = bands(g), p5 = ukPay(g, 5), url = ORIGIN + salarySlug(g);
  const prev = SALARIES[i - 1], next = SALARIES[i + 1];
  const hourly = g / 52 / 37.5, netHourly = r.net / 52 / 37.5, daily = g / 260, netDaily = r.net / 260;
  const loans = STUDENT_LOANS.map(p => [p[0], studentLoan(g, p), p[1]]), plan2 = loans[1][1];
  const loanRows = loans.map(([name, pay, threshold]) => `<tr><th scope="row">${name}</th><td>${k(threshold)}</td><td>${pay ? gbp(pay / 12) : "Nothing"}</td><td>${gbp((r.net - pay) / 12)}</td></tr>`).join("");
  const scot = scotTax(g), scotNet = g - scot.tax - r.ni, scotDiff = scotNet - r.net;
  const loanText = plan2 > 0 ? `On Plan 2, the most common plan for students from England who started university between 2012 and 2023, you repay ${gbp(plan2)} a year (${gbp(plan2 / 12)} a month), so take-home pay falls to ${gbp((r.net - plan2) / 12)} a month.` : `On Plan 2, the most common plan for students from England who started university between 2012 and 2023, you repay nothing at ${k(g)}, because it's below the ${k(29385)} threshold.`;
  const title = `${k(g)} After Tax UK ${TAX_YEAR}: ${gbp(r.net / 12)} a Month`;
  const description = `On a ${k(g)} salary you take home ${gbp(r.net)} a year, ${gbp(r.net / 12)} a month or ${gbp(r.net / 52)} a week after income tax and National Insurance in ${TAX_YEAR}.`;
  const trail = [[SITE, "./"], ["Finance tools", "./#finance"], ["Salary after tax", "salary-after-tax.html"], [`${k(g)} after tax`, salarySlug(g)]];
  const row = (label, v, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><th scope="row">${label}</th><td>${gbp(v)}</td><td>${gbp(v / 12)}</td><td>${gbp(v / 52)}</td></tr>`;
  const taper = g > 100000 ? `<p>Because income is over £100,000, the personal allowance is reduced by £1 for every £2 above that level. At ${k(g)} the allowance is ${gbp(r.pa, 0)}${r.pa === 0 ? ", so it has been removed completely" : ""}. Between £100,000 and £125,140 this creates an effective income tax rate of 60%, plus 2% National Insurance. Pension contributions that bring income back below £100,000 can restore the allowance.</p>` : "";
  const nearby = SALARIES.filter((_, j) => Math.abs(j - i) <= 3).map(s => { const x = ukPay(s, 0);
    return `<tr${s === g ? ' class="total"' : ""}><th scope="row">${s === g ? k(s) : `<a href="${salarySlug(s)}">${k(s)}</a>`}</th><td>${gbp(x.net)}</td><td>${gbp(x.net / 12)}</td></tr>`; }).join("");
  const faqs = [
    [`How much is ${k(g)} a month after tax?`, `In the ${TAX_YEAR} tax year, ${k(g)} a year is ${gbp(r.net / 12)} a month after income tax and National Insurance, assuming a standard tax code, no pension contribution and no student loan, in England, Wales or Northern Ireland.`],
    [`What tax band is a ${k(g)} salary in?`, `${k(g)} falls in the ${r.band} band. Each extra £1 earned is taxed at a combined rate of about ${pct(r.marginal)} including National Insurance.`],
    [`How much is ${k(g)} an hour?`, `At 37.5 hours a week for 52 weeks, ${k(g)} is about ${gbp(hourly)} an hour before tax and ${gbp(netHourly)} an hour after tax and National Insurance.`],
    [`How much tax do I pay on ${k(g)}?`, `${gbp(r.tax)} income tax and ${gbp(r.ni)} employee National Insurance a year: ${gbp(r.tax + r.ni)} in total, or ${pct(r.effective)} of your salary.`],
    [`How much is ${k(g)} after tax in Scotland?`, `In ${TAX_YEAR}, ${gbp(scotNet)} a year or ${gbp(scotNet / 12)} a month, because Scotland has its own income tax bands. National Insurance is the same across the UK.`],
    [`How much is ${k(g)} after tax with a student loan?`, plan2 > 0 ? `On Plan 2, ${gbp((r.net - plan2) / 12)} a month after repaying ${gbp(plan2 / 12)} a month. Plan 1, Plan 4, Plan 5 and postgraduate loans have different thresholds: see the table above.` : `On Plan 2 you repay nothing at ${k(g)}, so take-home stays ${gbp(r.net / 12)} a month. Plan 1, Plan 5 and postgraduate loans have lower thresholds: see the table above.`],
    [`How much is ${k(g)} a day?`, `Over 260 working days a year, ${gbp(daily)} a day before tax and ${gbp(netDaily)} a day after income tax and National Insurance.`],
  ];
  const panel = tool("take-home-pay").ui.replace('id="sg" inputmode="decimal" value="30000"', `id="sg" inputmode="decimal" value="${g}"`)
    .replace('id="sp" inputmode="decimal" value="5"', 'id="sp" inputmode="decimal" value="0"');
  return `${head({title: `${title} | ${SITE}`, description, url, ogTitle: title})}
${ld(crumbsLd(trail))}
${ld(faqLd(faqs))}
</head>
<body data-tool="take-home-pay">
${headerFor("salary")}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: `SALARY AFTER TAX ${TAX_YEAR}`, h1: `${k(g)} after tax in the UK`,
    lede: `On a ${k(g)} salary you take home <strong>${gbp(r.net)}</strong> a year, <strong>${gbp(r.net / 12)}</strong> a month or <strong>${gbp(r.net / 52)}</strong> a week in the ${TAX_YEAR} tax year.`})}
  ${byline()}
  <div class="kpis">
    <div class="kpi kpi-main"><span>Take-home per month</span><b>${gbp(r.net / 12)}</b></div>
    <div class="kpi"><span>Per year</span><b>${gbp(r.net)}</b></div>
    <div class="kpi"><span>Per week</span><b>${gbp(r.net / 52)}</b></div>
    <div class="kpi"><span>Tax and NI</span><b>${pct(r.effective)}</b></div>
  </div>
  <div class="tool-cols">
  <div class="tool-main">
  <article class="guide guide-first">
    ${h2(`${k(g)} salary breakdown`)}
    <div class="tablewrap"><table><tr><th></th><th>Year</th><th>Month</th><th>Week</th></tr>
    ${row("Gross salary", g)}${row("Income tax", -r.tax)}${row("National Insurance", -r.ni)}${row("Take-home pay", r.net, "total")}</table></div>
    <p>Figures are for England, Wales and Northern Ireland with a standard 1257L tax code, no pension contribution and no student loan. You keep ${pct(r.net / g)} of your salary; ${pct(r.effective)} goes on income tax and National Insurance.</p>
    ${h2("How the tax is worked out")}
    <ul>
      <li>Tax-free personal allowance: ${gbp(r.pa, 0)}.</li>
      <li>Basic rate at 20% on ${gbp(r.basic, 0)}: ${gbp(r.basic * .2)}.</li>
      ${r.higher ? `<li>Higher rate at 40% on ${gbp(r.higher, 0)}: ${gbp(r.higher * .4)}.</li>` : ""}
      ${r.additional ? `<li>Additional rate at 45% on ${gbp(r.additional, 0)}: ${gbp(r.additional * .45)}.</li>` : ""}
      <li>National Insurance at 8% on ${gbp(r.niMain, 0)} of earnings between £12,570 and £50,270: ${gbp(r.niMain * .08)}.</li>
      ${r.niUpper ? `<li>National Insurance at 2% on ${gbp(r.niUpper, 0)} above £50,270: ${gbp(r.niUpper * .02)}.</li>` : ""}
    </ul>
    <p>A pay rise of £100 at this level would leave you about ${gbp(100 * (1 - r.marginal))} better off, because the next pound is taxed at a combined ${pct(r.marginal)}.</p>
    ${taper}
    ${h2("With a 5% workplace pension")}
    <p>Paying 5% of salary (${gbp(p5.pen)} a year) into a net pay pension scheme reduces income tax to ${gbp(p5.tax)} and leaves take-home pay of ${gbp(p5.net)} a year, or ${gbp(p5.net / 12)} a month. The pension costs you ${gbp(r.net - p5.net)} a year in take-home pay because tax relief makes up the rest. Salary sacrifice schemes also save National Insurance.</p>
    ${h2("Hourly and daily rate")}
    <p>On a 37.5-hour week, ${k(g)} works out at about ${gbp(hourly)} an hour before tax, or ${gbp(netHourly)} an hour after tax and National Insurance. Over 260 working days a year, that's ${gbp(daily)} a day before tax and ${gbp(netDaily)} a day after.</p>
    ${h2(`${k(g)} after tax with a student loan`)}
    <p>Student loan repayments are 9% of earnings above your plan's threshold (6% for a postgraduate loan), taken through payroll. ${loanText}</p>
    <div class="tablewrap"><table><tr><th>Plan</th><th>Threshold</th><th>Repayment a month</th><th>Take-home a month</th></tr>${loanRows}</table></div>
    <p>If you have a postgraduate loan as well as an undergraduate plan, you repay both. Repayments are based on pay before pension contributions, unless you use salary sacrifice.</p>
    ${h2(`${k(g)} after tax in Scotland`)}
    <p>Scotland sets its own income tax bands, and National Insurance is the same across the UK. On ${k(g)} a Scottish taxpayer pays ${gbp(scot.tax)} income tax and takes home <strong>${gbp(scotNet)}</strong> a year, or <strong>${gbp(scotNet / 12)}</strong> a month. That's ${Math.abs(scotDiff) < 0.5 ? "about the same as" : `${gbp(Math.abs(scotDiff))} a year ${scotDiff > 0 ? "more" : "less"} than`} in England, Wales and Northern Ireland, with the top slice of income in the Scottish ${scot.band} rate band.</p>
    ${h2("Compare nearby salaries")}
    <div class="tablewrap"><table><tr><th>Salary</th><th>Take-home per year</th><th>Per month</th></tr>${nearby}</table></div>
    ${h2("Try your own figures")}
    <p>Change the salary or add your pension contribution:</p>
  </article>
  <section class="panel" aria-label="UK take-home pay calculator">${panel}</section>
  <article class="guide">
    ${h2("Frequently asked questions")}
    ${faqHtml(faqs)}
    ${ratesNote}
    ${SALARY_SOURCES}
  </article>
  <div class="related related-bottom"><h2>Other salaries</h2><ul>${prev ? `<li><a href="${salarySlug(prev)}">← ${k(prev)} after tax</a></li>` : ""}${next ? `<li><a href="${salarySlug(next)}">${k(next)} after tax →</a></li>` : ""}<li><a href="salary-after-tax.html">All salaries</a></li><li><a href="budget-planner.html">50/30/20 budget planner</a></li></ul></div>
  </div>
  <aside class="tool-aside"><div class="tool-aside-inner">
    ${toc([`${k(g)} salary breakdown`, "How the tax is worked out", "With a 5% workplace pension", "Hourly and daily rate", `${k(g)} after tax with a student loan`, `${k(g)} after tax in Scotland`, "Compare nearby salaries", "Try your own figures", "Frequently asked questions"])}
    ${asideLinks("Other salaries", [...(prev ? [[`← ${k(prev)} after tax`, salarySlug(prev)]] : []), ...(next ? [[`${k(next)} after tax →`, salarySlug(next)]] : []), ["All salaries", "salary-after-tax.html"], ["UK take-home pay calculator", "uk-take-home-pay-calculator.html"], ["50/30/20 budget planner", "budget-planner.html"]])}
  </div></aside>
  </div>
</div>
</main>
${footer("salary")}
<script src="assets/tools.js"></script>
</body>
</html>
`;
}

function salaryHub() {
  const url = ORIGIN + "salary-after-tax.html", title = `UK Salary After Tax Table ${TAX_YEAR}`;
  const description = `Take-home pay after income tax and National Insurance for UK salaries from ${k(SALARIES[0])} to ${k(SALARIES.at(-1))} in ${TAX_YEAR}, per year, month, fortnight and week.`;
  const trail = [[SITE, "./"], ["Finance tools", "./#finance"], ["Salary after tax", "salary-after-tax.html"]];
  const rows = SALARIES.map(g => { const r = ukPay(g, 0);
    return `<tr><th scope="row"><a href="${salarySlug(g)}">${k(g)}</a></th><td>${gbp(r.tax)}</td><td>${gbp(r.ni)}</td><td>${gbp(r.net)}</td><td>${gbp(r.net / 12)}</td><td>${gbp(r.net / 26)}</td><td>${gbp(r.net / 52)}</td></tr>`; }).join("\n");
  return `${head({title: `${title} | ${SITE}`, description, url, ogTitle: title})}
${ld(crumbsLd(trail))}
</head>
<body>
${headerFor("salary")}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: "FINANCE TOOLS", h1: `UK salary after tax table ${TAX_YEAR}`,
    lede: "Take-home pay for common UK salaries after income tax and employee National Insurance. Choose a salary for a full breakdown.",
    meta: ["England, Wales and Northern Ireland", `Updated for ${TAX_YEAR}`]})}
  <article class="guide guide-wide">
    <div class="tablewrap"><table><tr><th>Salary</th><th>Income tax</th><th>National Insurance</th><th>Take-home per year</th><th>Per month</th><th>Per fortnight</th><th>Per week</th></tr>
${rows}
    </table></div>
    <p>Figures are for England, Wales and Northern Ireland with a standard 1257L tax code, no pension contribution and no student loan. For other salaries or to include a pension, use the <a href="uk-take-home-pay-calculator.html">UK take-home pay calculator</a>.</p>
    ${ratesNote}
  </article>
</div>
</main>
${footer("salary")}
<script src="assets/tools.js"></script>
</body>
</html>
`;
}

const notFound = `${head({title: `Page not found | ${SITE}`, description: "The page you were looking for could not be found."})}
</head>
<body>
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${toolHead({eyebrow: "ERROR 404", h1: "Page not found", lede: `That page doesn't exist or has moved. Try one of the popular tools below, or <a href="./">browse all tools</a>.`})}
  <div class="related"><h2>Popular tools</h2><ul>${["take-home-pay", "loan-calculator", "vat-calculator", "word-counter", "password-generator", "percentage-calculator"]
    .map(id => `<li><a href="${byId.get(id).slug}">${esc(tool(id).name)}</a></li>`).join("")}</ul></div>
</div>
</main>
${footer(null)}
<script src="assets/tools.js"></script>
</body>
</html>
`.replace(/(href|src)="(?!https?:|\/|#|data:)(?:\.\/)?([^"]*)"/g, '$1="/$2"'); // GitHub Pages serves 404.html at any depth, so links must be root-relative.

/* ---------- About and Privacy ---------- */
function prosePage({slug, title, description, h1, lede, html, data}) {
  const trail = [[SITE, "./"], [h1, slug]];
  return `${head({title, description, url: ORIGIN + slug})}
${ld(crumbsLd(trail))}
${data ? ld(data) : ""}
</head>
<body>
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: SITE.toUpperCase(), h1: esc(h1), lede})}
  <article class="guide prose">
    ${html}
  </article>
</div>
</main>
${footer(null)}
<script src="assets/tools.js"></script>
</body>
</html>
`;
}
const OWNER = "Bisma Zainab", CONTACT = "bismaibrar@icloud.com", MAILTO = `<a href="mailto:${CONTACT}">${CONTACT}</a>`;
const PROSE_UPDATED = {text: "22 November 2026", iso: "2026-11-22"};
const linkTo = (id, text) => { const c = byId.get(id); if (!c) throw new Error("about page: unknown tool " + id); return `<a href="${c.slug}">${text || esc(tool(id).name)}</a>`; };
const catList = () => `<ul>${Object.entries(CATS).map(([cat, label]) => {
  const n = TOOLS.filter(t => t.cat === cat).length + (EXTRA_CARDS[cat] || []).length;
  return `<li><a href="./#${cat}">${esc(label)} tools</a> (${n}): ${esc(CAT_BLURB[cat])}</li>`;
}).join("")}</ul>`;
const ORG_LD = {"@type": "Organization", "@id": ORIGIN + "#organization", name: SITE, url: ORIGIN, logo: ORIGIN + "assets/icon-512.png", email: CONTACT,
  founder: {"@type": "Person", name: OWNER, jobTitle: "Software developer"}};
const PROSE = [
  {slug: "about.html", title: `About ${SITE} – Free Private Online Tools by ${OWNER}`, h1: `About ${SITE}`,
    description: `${TOOLS.length + Object.values(EXTRA_CARDS).flat().length} free, private online tools for PDFs, Office files, UK finance and everyday tasks, built by professional developer ${OWNER}. No sign-up or uploads.`,
    lede: `Free, private online tools for PDFs, Office files, UK money questions and everyday tasks. Built by professional developer ${OWNER}.`,
    data: {"@context": "https://schema.org", "@type": "AboutPage", "@id": ORIGIN + "about.html", url: ORIGIN + "about.html", name: `About ${SITE}`, inLanguage: "en-GB",
      dateModified: PROSE_UPDATED.iso, mainEntity: ORG_LD},
    html: `<h2>Who makes ${SITE}</h2>
    <p>${SITE} is designed, built and maintained by <strong>${OWNER}</strong>, a professional developer. Every tool is written to do one job well: open the page, use it straight away and get a clear result, on a phone or a computer.</p>
    <p>The idea is simple. Everyday tasks like signing a PDF, shrinking a file for an upload limit or working out take-home pay shouldn't need an account, a subscription or handing your documents to a stranger's server.</p>
    <h2>What you can do here</h2>
    ${catList()}
    <p>Popular tools include ${linkTo("sign-pdf", "Sign PDF")}, ${linkTo("edit-pdf", "Edit PDF")}, ${linkTo("compress-pdf", "Compress PDF")}, ${linkTo("take-home-pay", "the UK take-home pay calculator")} and ${linkTo("mortgage-overpayment", "the mortgage overpayment calculator")}.</p>
    <h2>Private by design</h2>
    <ul>
      <li><strong>Your files stay on your device.</strong> PDFs, images, spreadsheets and the figures you type are processed by your own browser. They are never uploaded to a ${SITE} server.</li>
      <li><strong>No account or sign-up.</strong> Every tool is free to use, with no trial or watermark.</li>
      <li><strong>No adverts, analytics or tracking cookies.</strong> Fonts and libraries are served from ${SITE} itself, so using a tool doesn't contact other companies.</li>
    </ul>
    <p>The <a href="privacy.html">privacy policy</a> explains exactly what is and isn't collected.</p>
    <h2>How accuracy is checked</h2>
    <p>Every change to the site goes through automated tests before it is published. They load every tool, check that it runs without errors, and confirm that the worked examples quoted on each page match what the tool actually calculates. Tax and National Insurance figures are tested against worked examples for the stated tax year.</p>
    <p>Finance pages list the official sources they rely on, such as GOV.UK, legislation.gov.uk and the Bank of England, with the date they were last checked. UK rates are reviewed every spring before the new tax year starts on 6 April.</p>
    <h2>Limits of the calculators</h2>
    <p>Finance results are estimates for guidance, not financial, tax or legal advice. Pay estimates use stated assumptions and may not reflect your tax code, region, pension, student loan or other deductions. Check important figures against official guidance, your payslip or a qualified professional. Health tools such as the BMI calculator are screening estimates, not a diagnosis.</p>
    <h2>Contact and feedback</h2>
    <p>Found a wrong result, a broken page or a missing tool? Use the <em>Help improve this tool</em> form at the bottom of any tool page, or email ${OWNER} at ${MAILTO}.</p>
    <p class="checked">Last updated: ${PROSE_UPDATED.text}.</p>`},
  {slug: "privacy.html", title: `Privacy Policy | ${SITE} – Your Files Stay in Your Browser`, h1: "Privacy policy",
    description: `How ${SITE} protects your privacy: files and tool inputs are processed in your browser and never uploaded. No accounts, adverts or tracking cookies.`,
    lede: `Your files and the figures you type stay in your browser. This policy explains the little that ${SITE} does process, and why.`,
    data: {"@context": "https://schema.org", "@type": "WebPage", "@id": ORIGIN + "privacy.html", url: ORIGIN + "privacy.html", name: `Privacy policy | ${SITE}`, inLanguage: "en-GB",
      dateModified: PROSE_UPDATED.iso, publisher: ORG_LD},
    html: `<h2>The short version</h2>
    <ul>
      <li>Files you open and values you enter in the tools are processed on your device and are <strong>not uploaded</strong>.</li>
      <li>There are <strong>no accounts, adverts, analytics or tracking cookies</strong>.</li>
      <li>The only information sent to ${SITE} is feedback you choose to submit.</li>
      <li>Your data is never sold or shared for marketing.</li>
    </ul>
    <h2>Who is responsible</h2>
    <p>${SITE} is run by ${OWNER}, who is responsible for how personal information is handled on this site. Contact: ${MAILTO}.</p>
    <h2>Files and tool inputs</h2>
    <p>PDFs, images, Word and Excel files, text and calculator values are read and processed by your own browser. They are not sent to ${SITE} or anyone else, and nothing is kept once you close the page, apart from the optional settings described under <em>Storage on your device</em>. The PDF and spreadsheet libraries the tools use are served from ${SITE} itself.</p>
    <h2>Optional feedback</h2>
    <p>If you submit a review, bug report or feature request, we receive the tool it is about, the category, an optional rating, your message and the time it was sent. The feedback form does not ask for your name or email. To limit abuse, a temporary hash derived from connection information is used; it is not intended to identify you. Please don't include personal, medical or financial details in your message. Submissions are private and are not published automatically.</p>
    <p>Feedback is used to fix problems, improve the tools and moderate reviews, on the basis of our legitimate interest in running a reliable service. It is kept while it is needed for those purposes and reviewed periodically; a fixed automatic deletion schedule is not yet in place.</p>
    <h2>Service providers</h2>
    <ul>
      <li><strong>Hosting:</strong> the website is hosted on GitHub Pages, which, like any web host, may process IP addresses and connection logs to deliver pages and keep them secure.</li>
      <li><strong>Feedback:</strong> submitted feedback is stored with Supabase, our database provider. Your browser contacts Supabase only if you send feedback.</li>
      <li><strong>Administration:</strong> the private feedback dashboard, used only by the site administrator, signs in with Supabase Authentication and loads a script from esm.sh. Visitors never need an account.</li>
    </ul>
    <h2>Storage on your device</h2>
    <p>${SITE} does not set cookies on its public pages. Your browser's local storage is used only to remember your light or dark theme choice and any workflows you save in the <a href="automation-builder.html">Automation builder</a>. You can clear these at any time in your browser settings.</p>
    <h2>Your rights</h2>
    <p>Under UK data protection law you can ask to access, correct or delete personal information, or object to how it is used. Because feedback is not linked to your name or email, tell us roughly when you sent it and what it said so we can find it. Email ${MAILTO} and please don't post sensitive details publicly. You can also complain to the <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner's Office</a>.</p>
    <h2>Changes to this policy</h2>
    <p>If how ${SITE} handles information changes, this page will be updated and the date below revised.</p>
    <p class="checked">Last updated: ${PROSE_UPDATED.text}.</p>`},
];

/* ---------- Automation builder (its app lives in assets/automation.js and assets/automation.css) ---------- */
function automationPage() {
  const slug = "automation-builder.html", url = ORIGIN + slug;
  const trail = [[SITE, "./"], ["General tools", "./#general"], ["Automation builder", slug]];
  return `${head({title: "Free Text Automation Builder – No-code Workflows | ToolsBravo", ogTitle: "Free Text Automation Builder | ToolsBravo",
    description: "Chain text steps like find and replace, case changes, JSON formatting, URL and Base64 encoding into a reusable workflow. Free, private, no account.", url})}
<link rel="stylesheet" href="assets/automation.css">
${ld(crumbsLd(trail))}
${ld({"@context": "https://schema.org", "@type": "WebApplication", name: "Automation builder", url, description: "Chain text transformation steps into a reusable workflow that runs in your browser.",
  applicationCategory: "UtilitiesApplication", operatingSystem: "Any modern web browser", isAccessibleForFree: true, inLanguage: "en-GB",
  offers: {"@type": "Offer", price: "0", priceCurrency: "GBP"}, publisher: {"@type": "Organization", name: SITE, url: ORIGIN}})}
</head>
<body data-tool="automation">
${headerFor("automation")}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: "GENERAL TOOLS", h1: "Automation builder", lede: "Build a workflow from text steps, connect them and run it in your browser. No account, server or subscription."})}
  <div class="ab">
${read("scripts/pages/automation-builder.body.html").trim()}
  </div>
</div>
</main>
${footer("automation")}
<script src="assets/tools.js"></script>
<script src="assets/automation.js"></script>
</body>
</html>
`;
}

/* ---------- Guides: practical explainers that link to the tool that does the job ---------- */
const GUIDES = [{
  slug: "electronic-vs-digital-signature.html",
  title: "Electronic vs Digital Signatures Explained | ToolsBravo",
  description: "What an electronic signature is, how a certificate-based digital signature differs, when each is accepted in the UK, and how to sign a PDF for free.",
  h1: "Electronic vs digital signatures",
  lede: "An electronic signature is any signature added to a document electronically. A digital signature is one particular kind that uses a certificate and cryptography to show who signed and that nothing changed afterwards. Here's what each one does, and when a simple electronic signature is enough.",
  updated: "2026-11-18", updatedText: "18 November 2026",
  trail: [["Sign PDF", "sign-pdf.html"]],
  related: ["sign-pdf", "merge-pdf", "compress-pdf"],
  sections: [
    ["The short answer", `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Electronic signature</th><th scope="col">Digital signature</th></tr></thead><tbody>
<tr><th scope="row">What it is</th><td>A typed name, a drawn or uploaded signature image, a tick box or an “I agree” click</td><td>A cryptographic seal made with a private key and a certificate issued to the signer</td></tr>
<tr><th scope="row">Shows who signed</th><td>Only through surrounding evidence, such as the email it came from</td><td>The certificate links the signature to an identity, checked to the level the certificate provider promises</td></tr>
<tr><th scope="row">Shows later changes</th><td>No</td><td>Yes: PDF readers flag the signature as invalid if the document changes after signing</td></tr>
<tr><th scope="row">What you need</th><td>Any e-signing tool, including <a href="sign-pdf.html">Sign PDF</a></td><td>A digital ID or a signing service that issues certificates</td></tr>
<tr><th scope="row">Cost</th><td>Usually free</td><td>Often paid, through a certificate or signing-service provider</td></tr>
</tbody></table></div>`],
    ["Is an electronic signature valid in the UK?", `<p>For most everyday documents, yes. In England and Wales the Law Commission confirmed in its 2019 report on the <a href="https://www.lawcom.gov.uk/project/electronic-execution-of-documents/">electronic execution of documents</a> that an electronic signature is capable of validly signing a document, including a deed, as long as the person signing intends to authenticate it and any other formalities for that kind of document are met. The Electronic Communications Act 2000 lets electronic signatures be used as evidence, and under UK eIDAS a <em>qualified</em> electronic signature has the same legal effect as a handwritten one.</p><p>Scotland and Northern Ireland have their own rules, and other countries differ, so check if the document is for use elsewhere.</p>`],
    ["When a simple electronic signature may not be enough", `<ul><li><strong>Wills.</strong> In England and Wales a will must still be signed and witnessed in person. The temporary rule allowing video witnessing ended on 31 January 2024 (<a href="https://www.gov.uk/guidance/guidance-on-making-wills-using-video-conferencing">GOV.UK guidance</a>).</li><li><strong>Deeds that need a witness</strong>, such as some property documents. HM Land Registry only accepts electronic signatures that follow its <a href="https://www.gov.uk/government/publications/electronic-signatures-accepted-by-hm-land-registry-pg82">practice guide 82</a>, usually arranged through a conveyancer.</li><li><strong>The recipient's own rules.</strong> Banks, courts, government departments and overseas organisations may insist on a handwritten signature or a particular kind of digital signature.</li></ul><p>If you're unsure, ask whoever you're sending it to which kind of signature they accept. This page is general information, not legal advice.</p>`],
    ["What ToolsBravo's Sign PDF does", `<p><a href="sign-pdf.html">Sign PDF</a> adds a simple electronic signature: your drawn, typed or uploaded signature, plus your name, initials or the date, placed onto the pages of the PDF in your browser. The document isn't uploaded anywhere.</p><p>It doesn't create a certificate-based digital signature and it doesn't check who you are. That suits tenancy and consent forms, school forms, quotes, job offers and similar documents, where the other side accepts electronic signatures.</p>`],
    ["Making a signed PDF more trustworthy", `<ul><li>Send it from your usual email address, so there's a record of who sent it and when.</li><li>Add the date next to your signature.</li><li>Keep a copy of exactly what you sent.</li><li>Remember that anyone with PDF-editing software can change a PDF signed with a picture of a signature. If the other side needs proof that nothing changed, ask them to send it through a service that adds a digital signature.</li></ul>`],
    ["How to tell if a PDF has a digital signature", `<p>Open it in Adobe Acrobat Reader. A digitally signed PDF shows a banner such as “Signed and all signatures are valid” and lists each signature in the Signatures panel, with the certificate behind it. A signature that is only an image on the page doesn't appear there.</p>`],
  ],
  faqs: [
    ["Is a typed name a legal signature?", "In England and Wales it generally can be, for most everyday documents, if you type it intending to sign. Some documents, such as wills, have stricter rules."],
    ["Can I sign a PDF without a digital ID?", "Yes. Draw, type or upload your signature with Sign PDF and download the signed copy. You only need a digital ID if the recipient asks for a certificate-based digital signature."],
    ["Is ToolsBravo's signature a digital signature?", "No. It's a simple electronic signature placed on the page. It doesn't use a certificate or verify your identity."],
    ["Do I need a witness?", "Only if the document itself requires one, for example a deed or a will. Check with whoever asked you to sign."],
  ],
}];
function guidePage(g) {
  const url = ORIGIN + g.slug, trail = [[SITE, "./"], ...g.trail, [g.h1, g.slug]], titles = g.sections.map(([t]) => t).concat("Frequently asked questions");
  return `${head({title: g.title, description: g.description, url})}
${ld(crumbsLd(trail))}
${ld({"@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.description, url, inLanguage: "en-GB", dateModified: g.updated, datePublished: g.updated,
  author: AUTHOR_LD, publisher: {"@type": "Organization", name: SITE, url: ORIGIN, logo: {"@type": "ImageObject", url: ORIGIN + "assets/icon-512.png"}}, image: ORIGIN + "assets/og.png"})}
${ld(faqLd(g.faqs.map(([q, a]) => [q, esc(a)])))}
</head>
<body>
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: "GUIDE", h1: esc(g.h1), lede: g.lede, meta: [`Updated ${g.updatedText}`]})}
  <div class="tool-cols">
    <article class="guide prose">
      ${g.sections.map(([t, body]) => h2(t) + body).join("\n      ")}
      ${h2("Frequently asked questions")}
      <div class="faq">${g.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      <p class="guide-cta"><a class="btn-primary" href="sign-pdf.html">Sign a PDF now →</a></p>
    </article>
    <aside class="tool-aside">${toc(titles)}${asideLinks("Related tools", g.related.map(id => [tool(id).name, byId.get(id).slug]))}</aside>
  </div>
</div>
</main>
${footer(null)}
<script src="assets/tools.js"></script>
</body>
</html>
`;
}

const pages = ["", ...TOOL_CONTENT.map(c => c.slug), "salary-after-tax.html", ...SALARIES.map(salarySlug), "automation-builder.html", ...GUIDES.map(g => g.slug), "about.html", "privacy.html"];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}
</urlset>
`;

// Home page: pre-render the same markup homeHTML() builds in the browser, so the page is complete
// on first paint (no layout shift when the script runs) and readable without JavaScript.
const homeCtx = {document: {title: "", querySelector: () => ({content: "", textContent: "", dataset: {}}), querySelectorAll: () => []}, window: {}, navigator: {}};
vm.createContext(homeCtx);
vm.runInContext(js.slice(0, js.indexOf("function showHome(")) + ";globalThis.HOME = homeHTML();", homeCtx);
// Every tool card on the home page: core tools plus the extra cards (salary table, automation builder).
const TOOL_COUNT = TOOLS.length + Object.values(EXTRA_CARDS).flat().length;
const home = read("index.html")
  .replace(/content="\d+ free online tools/, () => `content="${TOOL_COUNT} free online tools`)
  .replace(/<header class="top">[\s\S]*?<\/header>/, () => headerBar(null))
  .replace(/<main id="app" tabindex="-1">[\s\S]*?<\/main>/, () => `<main id="app" tabindex="-1">${homeCtx.HOME}</main>`)
  .replace(/<footer[\s\S]*?<\/footer>/, () => footer(null));

const outputs = {"sitemap.xml": sitemap, "index.html": home, "404.html": notFound, "salary-after-tax.html": salaryHub()};
for (const c of TOOL_CONTENT) outputs[c.slug] = toolPage(c);
for (const p of PROSE) outputs[p.slug] = prosePage(p);
for (const g of GUIDES) outputs[g.slug] = guidePage(g);
outputs["automation-builder.html"] = automationPage();
for (const id of Object.keys(EMBEDS)) outputs["embed/" + byId.get(id).slug] = embedPage(id);
SALARIES.forEach((g, i) => { outputs[salarySlug(g)] = salaryPage(g, i); });

// Sanity checks that protect search snippets.
for (const [path, body] of Object.entries(outputs)) {
  if (!path.endsWith(".html") || path === "index.html") continue;
  const title = body.match(/<title>([^<]*)<\/title>/)[1].replace(/&amp;/g, "&"), desc = body.match(/name="description" content="([^"]*)"/)[1];
  if (title.length > 75) console.warn(`warn: long title (${path}, ${title.length})`);
  if (desc.length > 160) console.warn(`warn: long description (${path}, ${desc.length})`);
}
for (const c of TOOL_CONTENT) {
  const words = strip([...c.steps, ...c.sections.flat(), ...c.faqs.flat()].join(" ")).split(" ").length;
  if (words < 180) console.warn(`warn: thin content (${c.slug}, ${words} words)`);
}

// Cache busting: tag the shared CSS and JS with a hash of their content, so after every
// deploy browsers fetch the new files instead of pairing new pages with cached old code.
const VERSIONED = ["assets/tools.js", "assets/feedback.js", "assets/site.css", "assets/automation.js", "assets/automation.css", ...new Set(TOOL_CONTENT.map(c => c.script).filter(Boolean))];
const assetVersion = Object.fromEntries(VERSIONED.map(p => [p, createHash("sha256").update(read(p)).digest("hex").slice(0, 10)]));
const versionedRe = new RegExp(`(${VERSIONED.map(p => p.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})(?:\\?v=[0-9a-f]+)?"`, "g");
for (const [path, body] of Object.entries(outputs)) {
  if (path.endsWith(".html")) outputs[path] = body.replace(versionedRe, (m, p) => `${p}?v=${assetVersion[p]}"`);
}

const check = process.argv.includes("--check");
const stale = [];
for (const [path, body] of Object.entries(outputs)) {
  const current = existsSync(new URL(path, ROOT)) ? read(path) : null;
  if (current === body) continue;
  if (check) stale.push(path); else { mkdirSync(new URL(".", new URL(path, ROOT)), {recursive: true}); writeFileSync(new URL(path, ROOT), body); }
}
if (check && stale.length) { console.error("Out of date, run node scripts/build.mjs:\n  " + stale.join("\n  ")); process.exit(1); }
console.log(check ? "Generated files are up to date." : `Wrote ${Object.keys(outputs).length} files.`);
