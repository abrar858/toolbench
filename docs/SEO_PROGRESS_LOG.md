# ToolsBravo SEO progress log

Newest first. Record what changed, how it was tested, and what Search Console showed — including "no data yet".

## 2026-11-17 — Baseline and technical audit

**Search Console (owner screenshots, 16–17 Nov):** 14 impressions, 0 clicks in the latest 24 hours (too little data to judge CTR). 33 HTTPS URLs, 0 non-HTTPS. Breadcrumbs: 24 valid, 0 invalid. Sitemap: success, 69 discovered, last read 16 Nov. Page indexing: processing. Core Web Vitals: no data.

**Audit (`node scripts/seo-audit.mjs`, live):** 79 sitemap URLs, 79 × HTTP 200, 0 errors. Warnings: 4 titles over 65 characters, Automation builder without breadcrumbs. Details in `SEO_AUDIT.md`.

**Found:**
- Search Console's 69 vs repository 79: Google last read the sitemap when it had 69 URLs (git history). Not a defect.
- `https://www.toolsbravo.com` fails TLS (certificate covers apex only) — owner DNS action.

**Changed (PR: technical audit):**
- 4 titles trimmed to ≤ 65 characters (Word counter, Hash generator, Loan repayment, Excel viewer).
- `WebApplication.name` uses the tool name.
- Added `scripts/seo-audit.mjs` and a static test that crawls the generated site (sitemap ↔ files, broken links, one H1, title length).
- Added the four SEO documents.

**Changed (PR: search intent):** see that PR — Compress PDF target size, 20 KB image target, Excel duplicate-removal guidance.

**Tests:** build `--check` up to date; static and browser suites — results recorded in each PR.

**Next check:** when Search Console's page-indexing report is ready, and a 28-day performance review in mid-December 2026.
