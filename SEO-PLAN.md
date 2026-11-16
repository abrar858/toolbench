# ToolsBravo SEO growth plan

The honest picture first. Tool keywords such as "word counter", "percentage calculator" and "VAT calculator"
are some of the most competitive searches on the web. Established sites with years of backlinks hold the top spots.
A new domain will not outrank them in weeks. What works is: indexable pages, genuinely useful content,
a fast and trustworthy site, steady growth into **long-tail and UK-specific searches** where competition is weaker,
then links and brand searches over 6 to 18 months.

## Done in the code (branch `seo-tool-pages`)

| Before | After |
|---|---|
| 20 of 24 tools only reachable as `/#tool` fragments, which Google does not index as separate pages | Every tool has its own static URL, for example `/vat-calculator.html` |
| 4 tool pages embedded the tool in an `<iframe>` of the home page, so the tool belonged to another URL | Tool form is in the page's own HTML; the shared script only adds behaviour |
| About 150 words per tool page | Each page has how-to steps, an explanation or formula, worked examples and FAQs |
| Generic titles ("Word counter: free online tool") | Keyword-led titles and descriptions, unique per page and tested |
| No structured data on tool pages | `WebApplication`, `BreadcrumbList` and `FAQPage` JSON-LD on every tool page |
| Sitemap listed 7 URLs | Sitemap lists all 24 tools plus core pages |
| Home page `<main>` empty without JavaScript | Static heading and a crawlable directory linking every tool, on every page |
| Mixed "Toolbench" and "ToolsBravo" branding | ToolsBravo throughout the tool pages and home page |
| Home page scrolled sideways on phones | Fixed (mobile-friendliness is a ranking factor) |
| No salary pages | 28 "£X after tax" pages (£18k–£150k) plus a salary table hub, computed with the same code as the calculator and checked by tests |
| Automation builder canonical pointed at `abrar858.github.io` (telling Google to index another domain) | Canonical, title, description and content fixed |
| No social image or real icons | 1200 × 630 `og:image`, SVG and PNG icons, web manifest on every page |
| No 404 page | `404.html` (noindex) linking popular tools |
| No visible accuracy date on finance pages | "Rates last checked" date with GOV.UK sources on every finance and salary page |
| Thin About page; About and Privacy text unreadable (light text on a white card) | About explains privacy, testing, limits and how to report problems; contrast fixed |
| 2 failing tests | All 14 static and 7 browser tests pass |

## Do this week (only you can)

1. **Enforce HTTPS.** GitHub → repo Settings → Pages → tick *Enforce HTTPS*. Right now `http://` and `https://` both serve the site, which splits signals between two copies.
2. **Google Search Console.** Add `toolsbravo.com` as a *Domain* property (DNS verification), then submit `https://toolsbravo.com/sitemap.xml`. Use *URL inspection → Request indexing* on the home page and the five finance pages.
3. **Bing Webmaster Tools.** Import from Search Console in one click. Bing also feeds DuckDuckGo, Yahoo and ChatGPT search.
4. **Analytics that respect the privacy promise.** If you want visitor numbers, use a cookie-free tool (for example Plausible, Fathom, Cloudflare Web Analytics or GoatCounter) and update `privacy.html`. Search Console alone already shows searches, clicks and positions.

## Keywords to win first (UK long tail)

Aim for searches where a small, accurate, fast UK site can rank. Each one deserves its own page or section:

- **Salary pages**: done for 28 salaries. Add more (for example every £1,000 from £20k to £60k) by editing `SALARIES` in `scripts/build.mjs`, but only once the first set is indexed and getting impressions.
- **Scottish tax**: "take home pay calculator Scotland". Add Scottish bands to the calculator, then a page.
- **Student loan**: "take home pay with student loan plan 2". Add plan 1, 2, 4, 5 and postgraduate deductions.
- **Hourly and pro-rata**: "£12.21 an hour annual salary", "pro rata salary calculator", "hourly to annual salary UK".
- **VAT and self-employed**: "reverse VAT calculator", "VAT on £1000", "self-employed tax calculator UK".
- **Mortgage**: "mortgage overpayment calculator UK", "remortgage calculator".
- **Shift work**: "timesheet calculator with breaks", "night shift hours calculator", "holiday pay calculator UK" (12.07% for irregular hours).

Rule of thumb: one page = one search intent. Don't publish thin near-duplicates; every salary page should show the full breakdown and differ by its numbers and explanation.

## Content and trust

- Show a **"Last checked against HMRC rates: date"** line on finance pages and update it each April. Freshness and accuracy matter most for money topics (Google treats them as "Your Money or Your Life").
- Link to official sources (GOV.UK income tax rates, NHS BMI, NCSC passwords) where relevant. Google values outbound links to authoritative sources.
- Add a real **About** page: who builds the site, how calculations are tested, contact address. Anonymous finance sites earn less trust.
- Write 1–2 helpful guides a month that link into tools, for example "How much tax will I pay on a pay rise?" → take-home pay calculator.

## Getting links and visitors (the part that moves rankings)

- Submit to tool directories and launch sites: Product Hunt, Hacker News "Show HN" (developer tools), Indie Hackers, AlternativeTo, BetaList.
- Answer real questions on Reddit (r/UKPersonalFinance, r/webdev), Quora and Stack Overflow, linking only where the tool genuinely answers the question.
- Offer an **embeddable widget** (an `<iframe>` snippet with a "Powered by ToolsBravo" link) for the take-home pay, VAT and BMI calculators. Bloggers and small businesses embedding tools is one of the best link sources for calculator sites.
- Publish the GitHub repo link and a short "how it's built, privately, with no tracking" write-up; developers link to open-source tools.

## Technical next steps (code)

- Self-host the two Google Fonts or switch to system fonts to speed up first paint (Core Web Vitals).
- Add Scottish income tax bands and student loan plans to the take-home pay calculator. Check the 2026/27 thresholds on GOV.UK first; they were not added here because accuracy matters more than coverage on money pages.
- Each April: update `ukPay` in `assets/tools.js`, `RATES_CHECKED` and `TAX_YEAR` in `scripts/build.mjs`, then rebuild.
- Consider extensionless URLs (`/vat-calculator`) only together with redirects; current `.html` URLs are fine, and changing them later costs rankings.

## How to measure

Check Search Console monthly: indexed pages (target 24/24 tools within a few weeks), impressions, average position per page.
Expect impressions first, then clicks as pages move from position 30+ to the first page.
Focus effort on pages whose position is 8–20, where small improvements bring the biggest jump in clicks.
