# ToolsBravo

**Free online tools that run entirely in your browser: [toolsbravo.com](https://toolsbravo.com)**

52 tools for PDFs, images, Word and Excel files, UK money questions, everyday calculations and developer tasks. No account, no watermark, no upload: files and text you add are processed on your own device and never sent to a server.

## Tools

| Category | Tools |
|---|---|
| **PDF & image** | [Edit PDF](https://toolsbravo.com/edit-pdf.html) (change or remove text, whiteout, real redaction, forms), [Extract PDF pages](https://toolsbravo.com/extract-pdf-pages.html), [Sign PDF](https://toolsbravo.com/sign-pdf.html), [Merge PDF](https://toolsbravo.com/merge-pdf.html), [Split PDF](https://toolsbravo.com/split-pdf.html), [Compress PDF](https://toolsbravo.com/compress-pdf.html) (including to a size limit such as 200 KB), [Rotate PDF](https://toolsbravo.com/rotate-pdf.html), [Delete PDF pages](https://toolsbravo.com/delete-pdf-pages.html), [PDF to Word](https://toolsbravo.com/pdf-to-word.html), [Word to PDF](https://toolsbravo.com/word-to-pdf.html), [PDF to JPG](https://toolsbravo.com/pdf-to-jpg.html), [JPG to PDF](https://toolsbravo.com/jpg-to-pdf.html), [Image compressor](https://toolsbravo.com/image-compressor.html), [Image converter](https://toolsbravo.com/image-converter.html), [Image resizer](https://toolsbravo.com/image-resizer.html) |
| **Office & data** | [PDF to Excel](https://toolsbravo.com/pdf-to-excel.html), [Excel to PDF](https://toolsbravo.com/excel-to-pdf.html), [CSV to Excel](https://toolsbravo.com/csv-to-excel.html), [Excel to CSV](https://toolsbravo.com/excel-to-csv.html), [Excel to JSON](https://toolsbravo.com/excel-to-json.html), [Merge Excel files](https://toolsbravo.com/merge-excel-files.html), [Merge Word documents](https://toolsbravo.com/merge-word-documents.html), [Remove duplicate rows](https://toolsbravo.com/remove-duplicate-rows.html), [Excel viewer](https://toolsbravo.com/excel-viewer.html) |
| **Finance (UK)** | [Take-home pay calculator](https://toolsbravo.com/uk-take-home-pay-calculator.html), [Salary after tax table](https://toolsbravo.com/salary-after-tax.html), [VAT calculator](https://toolsbravo.com/vat-calculator.html), [Loan repayment](https://toolsbravo.com/loan-repayment-calculator.html), [Mortgage overpayment](https://toolsbravo.com/mortgage-overpayment-calculator.html), [Savings](https://toolsbravo.com/savings-calculator.html), [Debt payoff](https://toolsbravo.com/debt-payoff-calculator.html), [50/30/20 budget](https://toolsbravo.com/budget-planner.html) |
| **General** | Time and timesheet, working days, age, percentage, BMI, aspect ratio, unit converter, word counter, case converter, line sorter, password generator, [automation builder](https://toolsbravo.com/automation-builder.html) |
| **Developer** | JSON formatter, Base64, URL encoder, hash generator, UUID generator, Unix timestamp (with Discord codes), colour converter |

Guide: [Electronic vs digital signatures](https://toolsbravo.com/electronic-vs-digital-signature.html).

## Privacy

- Everything runs client-side with self-hosted libraries (pdf-lib, pdf.js, mammoth, fflate, SheetJS) and self-hosted fonts. Pages make no third-party requests.
- No accounts, adverts, analytics or tracking cookies. Local storage holds only the light/dark theme choice and saved automation workflows.
- Edit PDF's Redact tool flattens redacted pages to images so the content is removed from the file; Whiteout only covers.
- Sign PDF adds a simple electronic signature; it is not a certificate-based digital signature and doesn't verify identity.

## How the site is built

A static site on GitHub Pages, served from `main`. There is no server.

| Path | What it is |
|---|---|
| `assets/tools.js` | Tool behaviour and form markup (`TOOLS`, `SLUGS`) |
| `assets/site.css` | Shared styles (light and dark themes) |
| `assets/sign-pdf.js`, `assets/edit-pdf.js`, `assets/automation.*` | Page-specific code, loaded only where needed |
| `scripts/content*.mjs` | Titles, descriptions, how-to steps, guides and FAQs for each tool page |
| `scripts/build.mjs` | Generates every tool page, salary pages, guides, header menu, footer, `sitemap.xml` and the pre-rendered home page; adds content-hash `?v=` tags to shared assets |
| `scripts/seo-audit.mjs` | Technical SEO audit of the live or local site |
| `scripts/indexnow.mjs` | Notifies IndexNow search engines of changed pages (run by `.github/workflows/indexnow.yml`) |
| `docs/` | SEO audit, keyword map, action plan, progress log, listing texts |

### Making a change

```bash
node scripts/build.mjs           # regenerate pages after editing assets/ or scripts/
node scripts/build.mjs --check   # fails if any generated file is out of date (CI runs this)
node --test tests/site.test.mjs  # static checks: metadata, sitemap, links, calculators
```

Browser tests (Playwright, Chromium) run against a local server, as CI does:

```bash
npm install --no-save @playwright/test && npx playwright install chromium
python3 -m http.server 8765 --bind 127.0.0.1 &
npx playwright test tests/browser.spec.mjs --config=playwright.config.mjs
```

Pull requests run both suites in GitHub Actions. More detail on releasing: [`DEPLOYMENT.md`](DEPLOYMENT.md).
