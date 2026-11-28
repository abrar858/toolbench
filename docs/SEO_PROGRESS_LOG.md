# ToolsBravo SEO progress log

Newest first. Record what changed, how it was tested, and what Search Console showed — including "no data yet".

## 2026-11-28 — Indexing jump; car finance settlement

**Search Console:** page indexing (report of 23 Nov) 80 indexed, up from 39; crawled-not-indexed 17 → 0; 5 discovered-not-indexed (£45k, £48k, £125k, £150k, URL encoder; £45k since indexed). 23–27 Nov: about 470 impressions a day (from about 300), 528 queries, 0 clicks, average position 59.6. New pages: mortgage overpayment 498 impressions (51.8), early loan settlement 466 (54.5). New query cluster: car finance settlement ("car finance settlement calculator" 65.3, "paying off car finance early calculator uk" 66.5, "pcp early settlement calculator" 84.5, "personal loan settlement calculator" 31.7). Indexing requested: £125k, £48k, £150k, URL encoder, budget planner, hours calculator.

**Changed:** settlement calculator takes a PCP final (balloon) payment in both modes, includes it in the settlement figure, deferral, compensation and "settle later" table, and explains voluntary termination. Page retitled "Loan & Car Finance Settlement Calculator UK" with a PCP/HP section, worked example (£20,000, 7.9%, 48 months, £8,000 balloon, settle after 24: £14,539.89) and FAQs. CCA ss99–100 cited.

## 2026-11-22 — Pages near page 1, and an early loan settlement calculator

**Search Console (16–21 Nov, per page):** hours calculator position 16.3 ("labor time calculator", "time calculator timesheet", "calculate payroll time", "work hours calculator with break" 7–9); Excel to CSV 19.3 ("excel to csv converter" 10.8, "xls to csv", "convert xlsx to csv"); budget planner 24.9 ("budget calculator", "budget calculator monthly", "20 30 50 calculator", "monthly bills calculator"); Word to PDF 25.5 (all "docx to pdf" variants). Loan page: 680 of 1,290 impressions at 57.1, with "early loan settlement calculator" at 21.8 and "loan early repayment calculator" at 79.2.

**Changed:**
- New `/early-loan-settlement-calculator.html`: settlement figure by the statutory method (remaining payments discounted at the APR to a settlement date 28 days after the request), the one-month deferral when more than a year is left, and section 95A compensation (1% / 0.5%, over £8,000, agreements from 1 Feb 2011, capped at the interest saved). Works from the loan details or from a statement (payment and payments left). Rules checked against legislation.gov.uk (SI 2004/1483 regs 4–6; CCA 1974 s95A). Figures asserted against an independent calculation.
- Hours calculator: payroll rounding (5, 6 or 15 minutes per day), timesheet CSV download, "Work hours" in title and H1, payroll/labour-time FAQs.
- Budget planner: compare real spending with the 50/30/20 targets (over/under, unallocated money); title leads with "Budget Calculator UK"; 20/30/50 and monthly-budget FAQs.
- Excel to CSV: XLS/XLSX/ODS section and FAQs; H1 names XLSX and XLS.
- Word to PDF: H1 and description lead with DOCX to PDF; other ways (Word, Google Docs, Pages, phones); watermark FAQ.

**Measure:** positions for these queries in the 28-day review (mid-December), against the figures above.

## 2026-11-22 — Phase A: Extract PDF pages, mortgage overpayments, embeds, sources

**Search Console (16–21 Nov, first export):** 1,212 impressions, 0 clicks, average position 52–59; 92% of impressions at position > 20, 13 on page 1. Zero clicks is expected at these positions.

**Evidence → change:**
- "extract pages from pdf", "extract pdf pages", "pdf extract", "pdf extractor": about 100 impressions at positions 80–95, landing on Split PDF. → New `/extract-pdf-pages.html` with a thumbnail page picker (click pages, or type ranges; all/odd/even/invert; one PDF or one per page). Split PDF retitled to target splitting.
- Mortgage searches ("how to pay off mortgage in 10 years calculator" 37, "calculate repayments on home loan" 50) landing on the general loan page. → New `/mortgage-overpayment-calculator.html`: monthly overpayments, lump sum (shorter term or lower payment), mortgage-free-in-N-years, 10% allowance check, year-by-year balances. Figures asserted against closed-form maths.
- Authority is the main gap for a 1-week-old domain. → Embeddable calculators (7) with copy-paste code and a credit link; embed pages are noindex with a canonical to the real page.
- Trust on finance pages. → Each finance page cites its own sources (GOV.UK, legislation.gov.uk, Bank of England) with a review date; the generic income-tax note no longer appears on unrelated pages.

## 2026-11-19 — New tool: Edit PDF

**Research:** Google autocomplete (en-GB) for 22 PDF-editing phrasings: the dominant needs are changing existing text (often "with the same font"), removing it (remove/delete/erase, white out, hide), redaction (redact, black out), adding content (text, images, drawing, highlights), filling forms, and "no sign up / without login". Competitors (iLovePDF, Sejda, Smallpdf, PDF24) upload files and delete them after 1–2 hours; Sejda limits free use; Smallpdf's free plan has no redaction. Vendor sources agree that a box over selectable text is not redaction.

**Built:** `/edit-pdf.html` with `assets/edit-pdf.js`. Edit text (click a line; cover with the sampled background colour and redraw in the closest standard font at the same size, colour and weight), add text, whiteout, true redaction (affected pages redrawn as images with boxes burned in, old content and annotations dropped, file rebuilt from its pages), highlight, box, freehand drawing, images, form filling (editable or flattened). All in the browser.

**Verified:** redacted words are absent from every decoded stream and from text extraction; text and drawings land in place on 0/90/180/270° pages with a crop box; outputs pass MuPDF with no repairs and the strict structure checks (generation 0, one object per number, classic xref), including the previously-edited fixture.

## 2026-11-19 — Finance pages: early repayment, weekly budgets, AER

**Search Console (owner export, last 24 hours, 18 Nov):** 159 impressions, 0 clicks, average position about 45; 77% UK, 91% desktop. Loan repayment calculator 78 impressions (position 52.8), savings 24 (45.0), CSV to Excel 12 (33.0), Excel to CSV 9 (16.2), budget planner 6 (15.8). Breadcrumbs valid: 24 → 38. The six salary pages missing from the breadcrumb export have the same valid markup as listed ones (processing lag, no change).

**Gaps found (page vs query):** "loan early repayment calculator" / "estimate early loan payoff": no lump sum or settlement. "50 30 20 budget calculator weekly": monthly only. "aer calculator": no gross ↔ AER conversion.

**Changed (PR: finance search intent):**
- Loan: one-off lump sum after a chosen month; "settle in full after month N" with the balance left, a settlement estimate including up to 58 days of interest, and the minimum interest saved; £30,000 over 10 years example; early-settlement guidance (Early Settlement Regulations 2004). Title "Loan Repayment & Early Payoff Calculator UK".
- Budget: pay frequency (weekly, fortnightly, 4-weekly, monthly, yearly) with monthly and weekly equivalents; weekly worked example. Title names weekly pay.
- Savings: gross rate ↔ AER converter (monthly, quarterly, twice yearly, yearly, daily); AER explanation with examples. Title names AER.
- Every figure quoted on these pages was computed with closed-form formulas and is asserted against the tools in browser tests.

**Measure:** 28-day positions for these pages and queries against the 18 Nov baseline (loan 52.8, budget 15.8, savings 45.0). Not before mid-December.

## 2026-11-18 — Guide, Automation builder, Discord codes, IndexNow

**Search Console (owner):** live URL test of the home page passed (indexable, all resources loaded). 16 impressions, 0 clicks in 24 hours. Page-indexing report still processing. `https://www.toolsbravo.com` still fails TLS: DNS now correct (`www` CNAME → `abrar858.github.io`), but the GitHub Pages certificate covers `toolsbravo.com` only — waiting for GitHub to reissue it.

**Changed:**
- New guide `/electronic-vs-digital-signature.html` (Article, BreadcrumbList, FAQPage markup matching visible content), linked from Sign PDF.
- Automation builder now generated in the site template: header menu (marked current), breadcrumbs, footer, light/dark theme. Its app code moved to `assets/automation.js` / `assets/automation.css` (versioned). Audit warnings: 1 → 0.
- Unix timestamp converter: Discord timestamp codes.
- IndexNow: key file and a workflow that notifies IndexNow engines (Bing and others) of changed pages after each deploy.
- README, and ready-to-paste directory listings in `docs/LISTINGS.md`.

**Tests:** see the PRs.

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
