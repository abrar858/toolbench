# ToolsBravo SEO progress log

Newest first. Record what changed, how it was tested, and what Search Console showed — including "no data yet".

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
