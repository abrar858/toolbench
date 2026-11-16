# Toolbench — free deployment and release checklist

ToolsBravo is a static website: no paid server is required. GitHub Pages serves the committed files as they are; the only build step (`node scripts/build.mjs`) is run locally before committing.

## Publish using GitHub Pages
1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **main** and **/(root)**, then save.
4. Wait for GitHub Pages to report a published URL. For this repository, the usual address is https://abrar858.github.io/toolbench/ — **verify it in Pages settings** before sharing.
5. Test the home page and every tool on mobile and desktop, including light/dark mode and keyboard navigation.

## Tool pages and SEO
Every tool has its own static page (for example `vat-calculator.html`) so search engines can index it.
These pages, `sitemap.xml` and the tool list in the home page footer are **generated**:

- Tool behaviour and form markup live in `assets/tools.js`; shared styles in `assets/site.css`.
- Page titles, descriptions, how-to steps, explanations and FAQs live in `scripts/content.mjs`.
- After changing either, run `node scripts/build.mjs` and commit the regenerated `.html` files.
  `node --test tests/site.test.mjs` fails if you forget.
- To add a tool: add it to `TOOLS` and `SLUGS` in `assets/tools.js`, add its content to `scripts/content.mjs`, then build.
- Old `/#tool-id` links redirect to the tool's page.
- PDF, Word and image tools use self-hosted libraries in `assets/vendor` (pdf-lib, pdf.js, mammoth, fflate; licences in `assets/vendor/LICENSES.txt`). They load only on the pages that need them, and files never leave the visitor's browser.
- Avoid claiming that no external requests are made: Google Fonts is loaded externally.

See `SEO-PLAN.md` for the growth plan.

## Functional checks before public promotion
- Password generator uses Web Crypto; test on HTTPS.
- Verify UK salary calculations against HMRC for the applicable tax year, region, pension scheme and tax code.
- Check invalid inputs, negative numbers, zero interest, leap years, overnight shifts, date handling and copy actions.
- Run automated HTML/JavaScript validation, accessibility checks, and browser smoke tests.

## Monetisation
- Keep the core tools free and useful. Build organic traffic and measure real usage before applying for advertising.
- Clearly disclose any future adverts, affiliate relationships or analytics and update the privacy notice accordingly.
- Do not add tracking scripts or advertising without assessing UK privacy/cookie requirements.

## Release note
The 2026-11-14 initial main-branch commit improves metadata, mobile CSS and accessibility without removing tool definitions. Deployment is **not** enabled by committing code alone.
