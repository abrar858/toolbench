# ToolsBravo rotating functional audit register

Last run: **2026-11-19 03:03 UTC**. Base: `main` commit `5ca0ab8f8537ae2a49913e798b8667a12fbd5ada`. This register distinguishes **source inspection** from **executed tests**. No tool is considered functionally passed until real input/output and download/browser checks succeed.

## Rotation

| Tool | Last inspected | Source checks | Actual I/O | Edge cases | Mobile/a11y | Download | Status | Next |
|---|---|---|---|---|---|---|---|---|
| Loan repayment calculator | 2026-11-19 | Input validation, schedule, settlement and CSV paths reviewed | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED; APR label/nominal rate assumption to review | Independent amortisation and early settlement examples |
| Savings calculator | 2026-11-19 | AER-to-monthly compounding and gross/AER converter reviewed | BLOCKED | Not executed | Not executed | N/A | UNVERIFIED | 0%, 4%, negative AER, end-of-month deposit timing |
| CSV to Excel | 2026-11-19 | Multi-file, separators, text preservation and XLSX generation reviewed | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED | Quoted commas, UTF-8, leading zeroes, workbook round-trip |
| Excel to CSV | 2026-11-19 | Sheet selection, separator, UTF-8 BOM and CSV generation reviewed | BLOCKED | Not executed | Not executed | Not executed | KNOWN DEFECT IN MAIN: stale workbook after invalid replacement; PR #22 | Browser valid→invalid replacement, ZIP contents, special characters |
| Excel to JSON | Previous run | Stale replacement defect reported in PR #23 | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED; fix proposed | Browser replacement regression |
| Remove Duplicate Rows | Previous run | Stale replacement defect reported in PR #23 | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED; fix proposed | Browser replacement regression |
| Excel Viewer | Previous run | Stale replacement defect reported in PR #23 | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED; fix proposed | Browser replacement regression |
| Password Generator | Previous run | Stale copied password defect reported in PR #26 | BLOCKED | Not executed | Not executed | N/A | UNVERIFIED; fix proposed | Generate→deselect→copy regression |
| Budget Planner | Previous run | New salary modes in draft PR #27 | BLOCKED | Not executed | Not executed | Not executed | UNVERIFIED | Check current main; avoid PR #27 overlap |

**All other sitemap tool URLs:** not yet covered in this register; inventory from `scripts/content.mjs` and `scripts/content-files.mjs` must be expanded before claiming full-site coverage. Do not mark untouched tools as passed.

## Evidence / limitations

- GitHub connector: `assets/tools.js` on main, blob SHA `1b8f3c5427efd3e31c66f9fe04d755b4bc0bce1d`; `scripts/content.mjs` blob SHA `2d777e9de80078f64b7891954d69461624395d74`.
- Commit search shows latest main commit above. Open PRs include #22, #23, #26, #27, #30, #31; do not duplicate their work.
- Combined commit statuses: empty. Pull-request workflow runs associated with main SHA: empty. **Neither result proves CI passed.**
- Execution container `getent hosts github.com toolsbravo.com` returned no DNS resolution; `git ls-remote https://github.com/abrar858/toolbench.git HEAD` failed `Could not resolve host: github.com`. Repository test suite, real production HTTP/browser checks, mobile and download checks were **not run**.
- Source-confirmed Excel-to-CSV stale-state path on main: `pickOneFile(... async f => { try { wb = await readBook(f); ... } catch (e) { say(msg,e.message,true); } })`. Failure leaves previous `wb` and enabled Convert button. Existing PR #22 addresses this; await browser verification and approval, no duplicate fix.
- Loan calculator currently labels rate APR while using `r = apr / 1200`; check nominal vs representative APR and fees before changing calculations or explanatory text.

## Next rotation

1. Recheck latest main commit, open PRs, workflow runs.
2. Retry checkout and live DNS/HTTP access. Run `node scripts/build.mjs --check`, repository Node and Playwright suites, plus `node scripts/seo-audit.mjs` where supported.
3. Verify Excel-to-CSV stale-state bug against PR #22 and CSV/XLSX round-trip, then Password Generator against PR #26.
4. Execute loan/savings independent numerical cases and CSV file validity; mobile 360px/768px, keyboard and accessibility, console errors.
5. Expand inventory to every sitemap tool URL and rotate oldest unverified tools first.
6. Record actual fixtures, observed results, browser versions, and PR URLs. Never merge/deploy automatically.
