# Toolbench — free deployment and release checklist

Toolbench is a static website: no build step or paid server is required.

## Publish using GitHub Pages
1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **main** and **/(root)**, then save.
4. Wait for GitHub Pages to report a published URL. For this repository, the usual address is https://abrar858.github.io/toolbench/ — **verify it in Pages settings** before sharing.
5. Test the home page and every tool on mobile and desktop, including light/dark mode and keyboard navigation.

## SEO follow-up
- Verify the actual Pages URL before adding canonical URLs, a sitemap, robots.txt or Search Console property.
- Current tools use #fragment URLs. Search engines generally cannot index each fragment as a separate page. Consider dedicated static routes/pages for the most searched tools.
- Add unique educational explanations, worked examples and limitations to calculator pages.
- Avoid claiming that no external requests are made: Google Fonts is loaded externally.

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
