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

## Rotation update — 2026-11-19 04:05 UTC

- Rechecked main: `5ca0ab8f8537ae2a49913e798b8667a12fbd5ada` (unchanged). Open PRs include #22, #23, #26, #27, #30, #31 and this coverage PR #32; no overlapping fixes attempted.
- **New verified CI evidence:** GitHub Actions on this exact main SHA report success for [static checks](https://github.com/abrar858/toolbench/actions/runs/44419315993), [browser smoke tests](https://github.com/abrar858/toolbench/actions/runs/44419315941), and [Pages build/deployment](https://github.com/abrar858/toolbench/actions/runs/44419316167). This supersedes the earlier ambiguous empty combined-status response. Workflow success does **not** prove every tool or download was exercised.
- Reviewed Password Generator main source and PR #26 diff. The main implementation's invalid-character-selection branch clears visible output but retains `last`; the PR adds reset and disabled-copy behavior and three source-pattern tests. **Source-confirmed stale-copy bug, browser reproduction still pending.** No competing fix.
- Reviewed PR #32 register against live GitHub Actions results; documentation only. Production direct HTTP and repository checkout still blocked by DNS failures: `curl` cannot resolve `toolsbravo.com` and `git ls-remote` cannot resolve `github.com` in the execution container. A separate public fetch of the password-generator page was also inaccessible. No fresh browser interaction, downloadable output or mobile/accessibility test was performed in this run; do not mark as passed.
- Next: validate Password Generator PR #26 Generate→deselect all→Copy and passphrase-fetch failure in a real browser; Excel to CSV PR #22 valid→invalid replacement, then CSV/XLSX round trip and loan APR examples. If environment DNS remains blocked, seek evidence from targeted GitHub Actions tests rather than inferring production behavior.

## Rotation update — 2026-11-19 05:04 UTC

- Confirmed `main` still points to `5ca0ab8f8537ae2a49913e798b8667a12fbd5ada` (commit dated 18 Nov 23:16 UTC). Reviewed current open PRs #17, #21, #22, #23, #26, #27, #30, #31, #32. Existing PRs already cover Excel-to-CSV stale upload (#22), three other spreadsheet stale-upload paths (#23), Password Generator stale Copy (#26); **do not duplicate**.
- Re-fetched `assets/tools.js` from main, blob SHA `1b8f3c5427efd3e31c66f9fe04d755b4bc0bce1d`. Reconfirmed Excel-to-CSV replacement error leaves `wb` and Convert state unchanged, while successful path updates them. This is a source-level regression finding, **not a completed browser test**.
- Loan calculator source rechecked: user-facing `Interest rate (APR %)` input and `r = apr / 1200`. This is a terminology/calculation-assumption risk; **not classified as a confirmed arithmetic defect** until effective-vs-nominal interest semantics are established.
- Attempted fresh production `https://toolsbravo.com/` and GitHub Actions HTTP checks via public fetch: inaccessible. Execution container again failed DNS for `toolsbravo.com` and `github.com`, including `git ls-remote`. No fresh live browser, real file downloads, mobile/accessibility or repository tests were possible; all remain **UNVERIFIED**. Prior successful GitHub Actions URLs on this main SHA remain recorded above, not rerun here.
- Partial inventory extraction found 38 distinct tool slugs matching the strict `id`-then-`slug` source pattern across `scripts/content.mjs` and `scripts/content-files.mjs`; this is **not** a complete inventory because source objects have varying field order and some tools are defined elsewhere. Do not use 38 as total site coverage.
- **Next batch:** Password Generator and Excel-to-CSV regression tests on the existing PR branches when browser access works; CSV-to-Excel Unicode/leading-zero round trip; loan and savings independent numeric cases; then expand inventory using the generated sitemap and verify every URL. No production changes, merge, or new fix PR in this run.

## Rotation update — 2026-11-19 06:00 UTC

- Rechecked recent repository commits and open pull requests before testing. Latest visible main SHA remains `5ca0ab8f8537ae2a49913e798b8667a12fbd5ada`. Open work includes audit register PR #32, SEO PR #31, admin PR #30, budget PR #27, password PR #26, spreadsheet fixes #22/#23. No duplicate code changes attempted.
- Fetched current main `assets/tools.js` (blob `1b8f3c5427efd3e31c66f9fe04d755b4bc0bce1d`) and inspected the **actual source** for loan repayment, Password Generator and Excel-to-CSV. Excel-to-CSV still does not clear `wb` or disable Convert in its replacement-read catch branch; existing PR #22 addresses this. Loan APR terminology risk remains unresolved. Password Generator stale-copy fix is in existing PR #26. These are source checks, **not** interactive pass results.
- Rechecked combined statuses and commit-associated pull-request workflows; both endpoints returned empty lists. Existing direct Actions links from the 04:05 run are the only previously verified CI evidence. Do not treat empty lists as failed checks or infer new CI results.
- Tried `git ls-remote https://github.com/abrar858/toolbench.git HEAD` and Python HTTPS GETs to production and GitHub: DNS lookup failed for both hosts. Public page fetch also failed. **No new actual input/output, download validity, mobile, accessibility, browser-console or repository suite test was executed**; coverage remains unverified. This is a recurring environmental access blocker, not evidence of site downtime.
- Next rotation: prioritize real browser tests for PR #22 Excel-to-CSV replacement upload and PR #26 Password Generator stale Copy; run independent numerical fixtures for loan/savings, then Unicode/quoted CSV-to-XLSX round trips. Continue expanding complete tool inventory from sitemap when repository checkout becomes available.
- No deployment, merge, DNS/payment/user-data change, paid service or test disabling. No new defect fix PR because known fixes already exist and runtime verification remains blocked.
