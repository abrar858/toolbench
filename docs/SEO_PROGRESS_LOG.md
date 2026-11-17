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

**Changed (PR: search intent):**
- Compress PDF: new *Size limit* option (100 KB to 5 MB) that searches settings from sharpest to smallest and keeps the best quality that fits, or says plainly when the limit can't be reached. Measured: a deliberately hard 4-page noisy scan (4.2 MB) → 156 KB under the 200 KB limit; a 10-page one (10.4 MB) → 389 KB under 500 KB; a 12-page one can't reach 100 KB and the tool says so. Title, description, guidance and FAQs updated; older advice ("choose Strong to get under 1 MB") replaced.
- Image compressor: 20 KB target added (for passport-style photos and signatures); outdated manual "under 100 KB" FAQ replaced.
- Image resizer: FAQ pointing "resize to 20 KB / 50 KB" searches to the compressor.
- Remove duplicate rows: how to do it in Excel itself (Data › Remove Duplicates, Alt-A-M, two columns, Duplicate Values highlighting, `UNIQUE`), plus matching FAQs.

**Tests:** build `--check` up to date; static and browser suites — results recorded in each PR.

**Next check:** when Search Console's page-indexing report is ready, and a 28-day performance review in mid-December 2026.
