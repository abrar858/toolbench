# ToolsBravo development work register

Updated: 17 November 2026, 02:52 UK

## Current state
- Main baseline inspected: e7bfd0f85e4f472af4a3a45902624aa4f142105e (merged content-depth PR #7).
- Source has 45 core tool definitions. The homepage shows 47 cards because it additionally links the salary-after-tax hub and automation builder; these are supplementary pages, not additional core tools. Retain the 45-core-tools wording, and clarify this distinction in future UI copy if necessary.
- The homepage Popular section repeats PDF to Excel. This branch removes the duplicate in assets/tools.js and index.html.
- Static tests: .github/workflows/checks.yml runs node --test tests/site.test.mjs.
- Browser tests: .github/workflows/browser.yml runs Playwright Chromium.
- robots.txt allows crawling and links https://toolsbravo.com/sitemap.xml. Sitemap has 78 loc entries at inspection.
- Latest CI run outcomes: not verified. GitHub Actions run history was not accessible through the available connector.
- Live website fetch: unavailable in the browsing environment; this does not establish an outage.

## Important build blocker on this branch
The build script embeds a 10-character SHA-256 digest of assets/tools.js into every generated HTML page. Changing assets/tools.js therefore requires running `node scripts/build.mjs` and committing **all** regenerated HTML files before CI's `node scripts/build.mjs --check` can pass. The connector can update files but this run does not have a checked-out, network-connected repository environment for safely regenerating and pushing the full build. Do **not** merge this branch until generation and tests pass. The index.html update alone is insufficient because its asset version tag is now stale.

## Next actions
1. On this branch, run `node scripts/build.mjs`, then `node scripts/build.mjs --check` and `node --test tests/site.test.mjs`. Commit all regenerated files.
2. Run the Playwright browser workflow and verify both GitHub Actions checks on the pull request.
3. Confirm deployment revision, sitemap, robots.txt, and browser-only privacy using a working live browser/network environment.
4. Regression coverage for unique Popular links and 45 core tools versus two supplementary homepage cards added in commit 1735f908; execution pending full build regeneration.
5. Recheck accessibility on salary pages, UUID generator, duplicate-row remover and automation builder.
6. Review Google Search Console indexing evidence before building more tools.

## Verification at 02:52 UK
- Confirmed draft PR #8 branch `fix/home-popular-link-and-work-register` exists and contains `index.html`, `assets/tools.js`, and this register.
- Added a source-level Node regression test for unique Popular links and explicit 45 core tools plus two supplementary cards. Not executed: the branch still has stale asset-version tags.
- Live website and GitHub PR browser fetch were unavailable in this runtime; this is not evidence of a website outage.
- Latest main commit observed remains `e7bfd0f`; CI conclusions are still unverified.
- PR #8 must remain draft until generated HTML and tests are verified.

## Change log
- 2026-11-17 02:52: Added `tests/site.test.mjs` regression coverage (commit `1735f908`).
- 2026-11-17: Inspected current source, workflows, generated homepage and sitemap. Removed duplicate Popular PDF-to-Excel link in source and pre-rendered index on isolated branch; pending full regeneration and CI. No changes made to main.

## 2026-11-17 03:53 UTC — CI guard added
- Commit b6c3d9f on PR #8 branch adds `node scripts/build.mjs --check` to the static GitHub Actions workflow before the Node tests, detecting stale generated pages and asset hashes.
- Main remains at e7bfd0f. PR #8 contains the duplicate Popular-link fix and regression coverage; generated pages still need rebuilding.
- Live-site fetch is unavailable in this environment. PR-triggered run lookup did not return a verified CI outcome.
- Release blocker: regenerate and commit HTML on the PR branch, then verify static and Playwright workflows. Do not merge PR #8 before both pass.

## 2026-11-17 04:53 UTC — independent verification attempt
- Re-read main and PR branch from the connected GitHub repository. Main remains `e7bfd0f`; the duplicate PDF-to-Excel Popular link remains on main and is removed on PR #8.
- Confirmed the PR branch has the `node scripts/build.mjs --check` CI guard and the duplicate-link regression test. Source review does not substitute for executed tests.
- Confirmed `scripts/build.mjs` calculates a 10-character SHA-256 version for `assets/tools.js` and rewrites generated HTML. The pending JS change makes a full rebuild mandatory.
- Attempted public web access to the homepage and GitHub Actions; both were unavailable (`DisabledError`). Attempted direct GitHub checkout in the execution container; DNS resolution of github.com failed. No CI success or live deployment verification is claimed.
- Required release sequence in a network-enabled checkout: `git checkout fix/home-popular-link-and-work-register`; `node scripts/build.mjs`; `node scripts/build.mjs --check`; `node --test tests/site.test.mjs`; `npm install --no-save @playwright/test`; `npx playwright install --with-deps chromium`; run the configured Playwright tests with the local server. Commit regenerated HTML and inspect both GitHub Actions workflows. Do not merge before verified green checks.
- No production changes or unverified generated HTML edits in this run.

## 2026-11-17 05:50 UTC — release readiness check
- Re-read `main` and the PR #8 branch through the connected GitHub API. `main/index.html` still has two Popular links to `pdf-to-excel.html`; the PR branch has one. The PR branch retains the CI `node scripts/build.mjs --check` guard.
- Inspected `scripts/build.mjs`: `--check` compares generated outputs byte-for-byte and exits nonzero for stale files. The PR branch modifies `assets/tools.js` but its generated pages have not been rebuilt, so the new guard is expected to flag stale asset-version references until regeneration. This is a source-based expectation, not an executed test result.
- Attempted a direct checkout using `git ls-remote https://github.com/abrar858/toolbench.git HEAD`; it failed with `Could not resolve host: github.com`. Thus no checkout, rebuild, Playwright execution, CI success, or live deployment is verified in this run.
- Do not merge PR #8. Next action in a network-enabled runner: regenerate the branch, commit the generated files, then inspect both PR checks and browser smoke tests. No paid services or tracking changes.

## 2026-11-17 — rebuilt, tested and released
- Merged current `main` into this branch (it had moved on with PR #9, the CSV fix); no conflicts.
- Ran `node scripts/build.mjs`: all generated pages rebuilt with current asset version tags. `node scripts/build.mjs --check` passes.
- `node --test tests/site.test.mjs`: 27 passed, 0 failed, including the new unique-Popular-links test.
- Playwright browser suite run locally against the built site before pushing; GitHub Actions static and browser checks inspected on the PR before merging.
- Homepage Popular navigation now has a single PDF to Excel link.
