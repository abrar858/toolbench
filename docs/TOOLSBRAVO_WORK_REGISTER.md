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

## Verification at 02:52 UK\n- Confirmed draft PR #8 branch `fix/home-popular-link-and-work-register` exists and contains `index.html`, `assets/tools.js`, and this register.\n- Added a source-level Node regression test for unique Popular links and explicit 45 core tools plus two supplementary cards. Not executed: the branch still has stale asset-version tags.\n- Live website and GitHub PR browser fetch were unavailable in this runtime; this is not evidence of a website outage.\n- Latest main commit observed remains `e7bfd0f`; CI conclusions are still unverified.\n- PR #8 must remain draft until generated HTML and tests are verified.\n\n## Change log
- 2026-11-17 02:52: Added `tests/site.test.mjs` regression coverage (commit `1735f908`).\n- 2026-11-17: Inspected current source, workflows, generated homepage and sitemap. Removed duplicate Popular PDF-to-Excel link in source and pre-rendered index on isolated branch; pending full regeneration and CI. No changes made to main.
