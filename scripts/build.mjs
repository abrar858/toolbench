// Generates the static, indexable pages of ToolsBravo:
//   - one page per tool (copy in scripts/content.mjs, behaviour in assets/tools.js)
//   - "£X after tax" salary pages and their hub, computed with the site's own ukPay()
//   - 404.html, sitemap.xml and the crawlable tool directory on the home page
//   node scripts/build.mjs           write the files
//   node scripts/build.mjs --check   fail if any generated file is out of date
import {readFileSync, writeFileSync, existsSync} from "node:fs";
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

const directory = current => Object.entries(CATS).map(([cat, label]) =>
  `<div><h2>${label} tools</h2><ul>${TOOLS.filter(t => t.cat === cat).map(t =>
    `<li><a href="${byId.get(t.id).slug}"${t.id === current ? ' aria-current="page"' : ""}>${esc(t.name)}</a></li>`).join("")}${
    cat === "finance" ? `<li><a href="salary-after-tax.html"${current === "salary" ? ' aria-current="page"' : ""}>Salary after tax table</a></li>` : ""}</ul></div>`).join("");

const header = `<a class="skip-link" href="#app">Skip to content</a>
<div class="site-head"><div class="wrap">
  <header class="top">
    <a class="logo" href="./" aria-label="ToolsBravo home"><img src="assets/icon.svg" alt="" width="32" height="32"><span id="siteName">${SITE}</span></a>
    <nav aria-label="Categories"><a href="./#files">PDF &amp; image</a><a href="./#office">Office</a><a href="./#finance">Finance</a><a href="./#general">General</a><a href="./#advanced">Developer</a><a href="automation-builder.html">Automations</a></nav><button class="search-btn" type="button" aria-label="Search tools" aria-expanded="false" aria-controls="site-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button><button class="theme-btn" type="button" aria-label="Switch theme">☾</button>
  </header>
  <div class="site-search" id="site-search" hidden><label class="sr-only" for="site-q">Search tools</label><input id="site-q" type="search" placeholder="Search all tools, e.g. merge PDF, VAT, JSON" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="site-results" aria-expanded="true"><ul id="site-results" role="listbox" aria-label="Matching tools"></ul></div>
</div></div>`;
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

const footer = current => `<footer><div class="wrap">
  <nav class="tool-directory" aria-label="All tools">${directory(current)}</nav>
  <p>Every tool runs in your browser. Nothing you type is uploaded or stored.</p>
  <p>Finance results are estimates for guidance only, not financial advice.</p>
  <p><a href="privacy.html">Privacy</a> · <a href="about.html">About ${SITE}</a></p>
  <p>© <span id="yr">2026</span> <span class="sn">${SITE}</span></p>
</div></footer>`;

const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, href], i) =>
  i === items.length - 1 ? `<span aria-current="page">${esc(name)}</span>` : `<a href="${href}">${esc(name)}</a>`).join(" › ")}</nav>`;
const crumbsLd = items => ({"@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) =>
  ({"@type": "ListItem", position: i + 1, name, item: ORIGIN + href.replace(/^\.\//, "")}))});
const faqLd = faqs => ({"@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) =>
  ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: strip(a)}}))});
const faqHtml = faqs => `<div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}</div>`;
const ratesNote = `<p class="checked">Rates last checked against HMRC guidance on <time datetime="2026-11-15">${RATES_CHECKED}</time> for the ${TAX_YEAR} tax year. Sources: <a href="https://www.gov.uk/income-tax-rates" rel="noopener">GOV.UK income tax rates</a>, <a href="https://www.gov.uk/national-insurance-rates-letters" rel="noopener">National Insurance rates</a>.</p>`;

/* ---------- tool pages ---------- */
function toolPage(c) {
  const t = tool(c.id), url = ORIGIN + c.slug, cat = CATS[t.cat];
  const trail = [[SITE, "./"], [`${cat} tools`, `./#${t.cat}`], [t.name, c.slug]];
  const related = c.related.map(tool).filter(Boolean);
  const howTo = c.howTo || `How to use the ${/^[A-Z][a-z]/.test(t.name) ? t.name.charAt(0).toLowerCase() + t.name.slice(1) : t.name}`, salaryHeading = "Take-home pay for common salaries";
  return `${head({title: `${c.title} | ${SITE}`, description: c.description, url, ogTitle: c.title})}
${ld({"@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url, description: c.description,
    applicationCategory: t.cat === "finance" ? "FinanceApplication" : t.cat === "advanced" ? "DeveloperApplication" : "UtilitiesApplication",
    operatingSystem: "Any modern web browser", isAccessibleForFree: true, inLanguage: "en-GB",
    offers: {"@type": "Offer", price: "0", priceCurrency: "GBP"}, publisher: {"@type": "Organization", name: SITE, url: ORIGIN}})}
${ld(crumbsLd(trail))}
${ld(faqLd(c.faqs.map(([q, a]) => [q, esc(a)])))}
</head>
<body data-tool="${t.id}">
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: `${cat.toUpperCase()} TOOLS`, h1: esc(c.h1), lede: esc(c.lede),
    meta: ["Free, no sign-up", "Runs privately in your browser", t.cat === "finance" ? `Updated for ${TAX_YEAR}` : "Instant results"]})}
  <div class="tool-cols">
  <div class="tool-main">
  <section class="panel" aria-label="${esc(t.name)}">${t.ui}</section>
  <article class="guide">
    ${h2(howTo)}
    <ol>${c.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    ${c.sections.map(([h, body]) => `${h2(h)}\n    ${body.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tablewrap"><table>$1</table></div>')}`).join("\n    ")}
    ${c.id === "take-home-pay" ? `${h2(salaryHeading)}\n    <p>See the full breakdown for a specific salary, from ${k(SALARIES[0])} to ${k(SALARIES.at(-1))}, in the <a href="salary-after-tax.html">UK salary after tax table</a>.</p>` : ""}
    ${h2("Frequently asked questions")}
    ${faqHtml(c.faqs.map(([q, a]) => [q, esc(a)]))}
    ${t.cat === "finance" ? ratesNote : ""}
  </article>
  <div class="related related-bottom"><h2>Related tools</h2><ul>${related.map(r => `<li><a href="${byId.get(r.id).slug}">${esc(r.name)}</a></li>`).join("")}</ul></div>
  </div>
  <aside class="tool-aside"><div class="tool-aside-inner">
    ${toc([howTo, ...c.sections.map(s => s[0]), ...(c.id === "take-home-pay" ? [salaryHeading] : []), "Frequently asked questions"])}
    ${asideLinks("Related tools", related.map(r => [r.name, byId.get(r.id).slug]))}
  </div></aside>
  </div>
</div>
</main>
${footer(t.id)}
<script src="assets/tools.js"></script>${c.script ? `\n<script src="${c.script}"></script>` : ""}
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

function salaryPage(g, i) {
  const r = bands(g), p5 = ukPay(g, 5), url = ORIGIN + salarySlug(g);
  const prev = SALARIES[i - 1], next = SALARIES[i + 1];
  const hourly = g / 52 / 37.5, netHourly = r.net / 52 / 37.5;
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
    [`Is this right if I live in Scotland?`, `No. Scotland has its own income tax bands, so your income tax will differ. National Insurance is the same across the UK.`],
  ];
  const panel = tool("take-home-pay").ui.replace('id="sg" inputmode="decimal" value="30000"', `id="sg" inputmode="decimal" value="${g}"`)
    .replace('id="sp" inputmode="decimal" value="5"', 'id="sp" inputmode="decimal" value="0"');
  return `${head({title: `${title} | ${SITE}`, description, url, ogTitle: title})}
${ld(crumbsLd(trail))}
${ld(faqLd(faqs))}
</head>
<body data-tool="take-home-pay">
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: `SALARY AFTER TAX ${TAX_YEAR}`, h1: `${k(g)} after tax in the UK`,
    lede: `On a ${k(g)} salary you take home <strong>${gbp(r.net)}</strong> a year, <strong>${gbp(r.net / 12)}</strong> a month or <strong>${gbp(r.net / 52)}</strong> a week in the ${TAX_YEAR} tax year.`})}
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
    ${h2("Hourly rate")}
    <p>On a 37.5-hour week, ${k(g)} works out at about ${gbp(hourly)} an hour before tax, or ${gbp(netHourly)} an hour after tax and National Insurance.</p>
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
  </article>
  <div class="related related-bottom"><h2>Other salaries</h2><ul>${prev ? `<li><a href="${salarySlug(prev)}">← ${k(prev)} after tax</a></li>` : ""}${next ? `<li><a href="${salarySlug(next)}">${k(next)} after tax →</a></li>` : ""}<li><a href="salary-after-tax.html">All salaries</a></li><li><a href="budget-planner.html">50/30/20 budget planner</a></li></ul></div>
  </div>
  <aside class="tool-aside"><div class="tool-aside-inner">
    ${toc([`${k(g)} salary breakdown`, "How the tax is worked out", "With a 5% workplace pension", "Hourly rate", "Compare nearby salaries", "Try your own figures", "Frequently asked questions"])}
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
  const description = `Take-home pay after income tax and National Insurance for UK salaries from ${k(SALARIES[0])} to ${k(SALARIES.at(-1))} in ${TAX_YEAR}, per year, month and week.`;
  const trail = [[SITE, "./"], ["Finance tools", "./#finance"], ["Salary after tax", "salary-after-tax.html"]];
  const rows = SALARIES.map(g => { const r = ukPay(g, 0);
    return `<tr><th scope="row"><a href="${salarySlug(g)}">${k(g)}</a></th><td>${gbp(r.tax)}</td><td>${gbp(r.ni)}</td><td>${gbp(r.net)}</td><td>${gbp(r.net / 12)}</td><td>${gbp(r.net / 52)}</td></tr>`; }).join("\n");
  return `${head({title: `${title} | ${SITE}`, description, url, ogTitle: title})}
${ld(crumbsLd(trail))}
</head>
<body>
${header}
<main id="app" tabindex="-1">
<div class="wrap tool">
  ${crumbs(trail)}
  ${toolHead({eyebrow: "FINANCE TOOLS", h1: `UK salary after tax table ${TAX_YEAR}`,
    lede: "Take-home pay for common UK salaries after income tax and employee National Insurance. Choose a salary for a full breakdown.",
    meta: ["England, Wales and Northern Ireland", `Updated for ${TAX_YEAR}`]})}
  <article class="guide guide-wide">
    <div class="tablewrap"><table><tr><th>Salary</th><th>Income tax</th><th>National Insurance</th><th>Take-home per year</th><th>Per month</th><th>Per week</th></tr>
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
function prosePage({slug, title, description, h1, lede, html}) {
  const trail = [[SITE, "./"], [h1, slug]];
  return `${head({title, description, url: ORIGIN + slug})}
${ld(crumbsLd(trail))}
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
const PROSE = [
  {slug: "about.html", title: `About ${SITE} | Free, Private Online Tools`, h1: `About ${SITE}`,
    description: `Who makes ${SITE}, how its free calculators and tools work, how results are checked, and how to report a problem.`,
    lede: "Free everyday calculators, text tools, converters and developer utilities that work on phones and computers, with no account, subscription or app to install.",
    html: `<h2>Private by design</h2><p>The tools run in your browser. What you type into a calculator, text box or converter is processed on your own device and is not uploaded to a ${SITE} server. The site has no accounts, no adverts and no tracking cookies. Fonts and libraries are hosted on ToolsBravo itself, so your browser doesn't contact other companies to use the tools. Read the <a href="privacy.html">privacy notice</a> for details.</p>
    <h2>How results are checked</h2><p>The source code is public on <a href="https://github.com/abrar858/toolbench">GitHub</a>. Automated tests run on every change. They check the UK income tax and National Insurance figures against worked examples, test that every tool loads without errors, and confirm that worked examples quoted on each page match what the tool calculates.</p>
    <p>UK finance tools use the published rates for the stated tax year. Each finance page shows the date its rates were last checked against GOV.UK guidance. Rates are reviewed each spring before the new tax year starts on 6 April.</p>
    <h2>Limits of the calculators</h2><p>Finance results are estimates for guidance, not financial, tax or legal advice. UK pay estimates use stated assumptions and may not reflect your tax code, region, benefits, pension scheme, student loan or other deductions. Confirm important figures with official guidance, your payslip or a qualified professional. Health tools such as the BMI calculator are screening estimates, not a diagnosis.</p>
    <h2>Report a problem or suggest a tool</h2><p>Found a wrong result, a broken page or a missing tool? Open an issue in the <a href="https://github.com/abrar858/toolbench/issues">${SITE} GitHub repository</a>. Please do not include personal information in public issues.</p>`},
  {slug: "privacy.html", title: `Privacy | ${SITE}`, h1: "Privacy",
    description: `How ${SITE} handles your data: tools run in your browser, with no accounts, adverts or tracking cookies.`,
    lede: `${SITE} is designed so the calculations, conversions and text processing in its tools happen in your browser.`,
    html: `<p>The site does not use accounts, an application database, analytics scripts or advertising trackers.</p>
    <h2>External services</h2><p>Fonts and code libraries are served from toolsbravo.com itself, so using the tools doesn't connect your browser to Google or other third parties. The site is hosted on GitHub Pages, so GitHub may process technical connection data such as IP addresses and server logs under its policies.</p>
    <h2>Information you enter</h2><p>Tool inputs are processed in your browser and are not sent to a ${SITE} application server. Avoid entering sensitive information on shared devices. Browser extensions and the device you use may have their own access.</p>
    <h2>Cookies and local storage</h2><p>${SITE} does not set tracking cookies. Your browser's local storage is used only to remember your light or dark theme choice and, in the automation builder, your saved workflow. Both stay on your device. If advertising, analytics, accounts or other third-party services are introduced, this notice will be updated before launch.</p>
    <h2>Contact</h2><p>For enquiries, use the project's <a href="https://github.com/abrar858/toolbench">GitHub repository</a>. Do not post personal information in public issues.</p>
    <p class="checked">Last updated: November 2026.</p>`},
];

const pages = ["", ...TOOL_CONTENT.map(c => c.slug), "salary-after-tax.html", ...SALARIES.map(salarySlug), "automation-builder.html", "about.html", "privacy.html"];
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
const home = read("index.html")
  .replace(/<main id="app" tabindex="-1">[\s\S]*?<\/main>/, () => `<main id="app" tabindex="-1">${homeCtx.HOME}</main>`)
  .replace(/<!-- tool-directory:start -->[\s\S]*?<!-- tool-directory:end -->/,
    () => `<!-- tool-directory:start --><nav class="tool-directory" aria-label="All tools">${directory(null)}</nav><!-- tool-directory:end -->`);

const outputs = {"sitemap.xml": sitemap, "index.html": home, "404.html": notFound, "salary-after-tax.html": salaryHub()};
for (const c of TOOL_CONTENT) outputs[c.slug] = toolPage(c);
for (const p of PROSE) outputs[p.slug] = prosePage(p);
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
const VERSIONED = ["assets/tools.js", "assets/site.css", ...new Set(TOOL_CONTENT.map(c => c.script).filter(Boolean))];
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
  if (check) stale.push(path); else writeFileSync(new URL(path, ROOT), body);
}
if (check && stale.length) { console.error("Out of date, run node scripts/build.mjs:\n  " + stale.join("\n  ")); process.exit(1); }
console.log(check ? "Generated files are up to date." : `Wrote ${Object.keys(outputs).length} files.`);
