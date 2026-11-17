# ToolsBravo SEO action plan

Prioritised by expected usefulness to searchers and evidence, not by tool score. Status as of 17 November 2026.
Evidence: `SEO_AUDIT.md`. Query research: `SEO_KEYWORD_MAP.md`. Results: `SEO_PROGRESS_LOG.md`.

## Phase 1 — Technical integrity

| # | Action | Owner | Status |
|---|---|---|---|
| 1.1 | Audit sitemap, robots, canonicals, indexability, links, metadata, structured data | Claude | ✅ Done — no blocking defects |
| 1.2 | Trim titles over 65 characters (4 pages) | Claude | ✅ PR (technical audit) |
| 1.3 | `WebApplication.name` = tool name | Claude | ✅ PR (technical audit) |
| 1.4 | Repeatable audit script `scripts/seo-audit.mjs` + site-wide crawl test in CI | Claude | ✅ PR (technical audit) |
| 1.5 | **Fix `https://www.toolsbravo.com` certificate**: `www` CNAME → `abrar858.github.io` | Owner (DNS) | ⏳ |
| 1.6 | Resubmit sitemap once (79 URLs vs 69 last read) | Owner (Search Console) | ⏳ |
| 1.7 | Request indexing for home and Sign PDF | Owner (Search Console) | ⏳ |
| 1.8 | Bring Automation builder into the shared template (header menu, footer, breadcrumbs) | Claude | Proposed |

## Phase 2 — Search opportunities (from autocomplete; refine with Search Console)

| # | Action | Status |
|---|---|---|
| 2.1 | Compress PDF: "fit under a size" option (100 KB, 200 KB, 500 KB, 1 MB, 2 MB) and guidance on size limits | PR (search intent) |
| 2.2 | Image compressor: add 20 KB target | PR (search intent) |
| 2.3 | Remove duplicate rows: how to do it in Excel itself (Remove Duplicates, shortcut, UNIQUE, Mac) | PR (search intent) |
| 2.4 | Unix timestamp: Discord timestamp codes | Proposed (small feature) |
| 2.5 | Scottish income tax in take-home pay and salary pages | Blocked until 2026/27 Scottish rates are verified from gov.scot / HMRC |
| 2.6 | Category landing pages (e.g. PDF tools) to replace `/#category` breadcrumb targets — only if each gives real guidance on choosing a tool | Proposed, decide after Search Console data |

## Phase 3 — Content

Editorial ideas, each must teach something and link to the tool that does it. One at a time, reviewed for accuracy:

1. How to get a PDF under 200 KB (or any upload limit) — after 2.1 ships.
2. Electronic vs digital signatures: what an e-signature does and doesn't prove (no legal claims beyond general guidance).
3. Converting PDF tables to Excel: what works, what doesn't (scans, merged cells).
4. CSV vs Excel: keeping leading zeros, dates and long numbers intact.
5. How UK take-home pay is calculated in 2026/27 (already partly on the calculator page — extend there rather than a separate thin page).

Don't mass-produce near-identical pages.

## Phase 4 — Indexing review (when Search Console finishes processing)

1. Pages → "Why pages aren't indexed": note each reason and count.
2. For "Discovered – currently not indexed" / "Crawled – currently not indexed": usually time or perceived value. Check the page's unique value before changing anything; don't rewrite for the sake of it.
3. "Alternate page with proper canonical tag" is expected for `/index.html` and extensionless URLs — no action.
4. "Duplicate, Google chose different canonical" for salary pages → compare the two pages; make the distinct figures more prominent if needed.
5. URL Inspection on home, Sign PDF, Merge PDF, Compress PDF, UK take-home pay, £30,000 after tax.

## Phase 5 — Measurement

Monthly (`SEO_PROGRESS_LOG.md`):

- Search Console Performance (28 days and 3 months): impressions, clicks, CTR, average position, top queries, top pages.
- Pages report: indexed count and exclusion reasons.
- Sitemaps: status, discovered count, last read.
- Enhancements: breadcrumb valid/invalid.
- Core Web Vitals once data exists.
- `node scripts/seo-audit.mjs` — paste the summary line and any errors.

Don't draw conclusions from hours or a handful of impressions.
