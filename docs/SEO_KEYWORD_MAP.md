# ToolsBravo keyword-to-page map

Source: Google autocomplete (`hl=en-GB`, `gl=gb`), collected 17 November 2026, plus the live pages' titles and content.
**No search volumes, difficulty scores or rankings are given, because none were measured.** Autocomplete only shows that a phrasing is commonly searched. Replace this with Search Console query data (Performance → Queries, 28 days and 3 months) once there are enough impressions.

Rules: one primary query per page; don't target the same primary query on two pages; only target what the page can actually do.

Competition note: brand names of large incumbents (for example "i love pdf", "adobe") appear in most PDF suggestions, so head terms like "merge pdf" are very competitive. The realistic edge is **privacy and no sign-up** ("no account", "no sign up", "offline", "without uploading") and **specific needs** (file-size targets, UK-specific calculators).

## PDF and image

| Primary query | Secondary phrasings seen | Intent | Page | Coverage / action |
|---|---|---|---|---|
| edit pdf | edit pdf online free (no sign up), edit pdf text (with the same font), remove / delete / replace / change text in pdf, white out pdf, redact pdf, black out text, add text to pdf, write on pdf, highlight, annotate, draw on pdf, add image to pdf, fill pdf form, edit scanned pdf (autocomplete, 19 Nov) | Do | `/edit-pdf.html` | New tool: edit text in a matching standard font, whiteout, true redaction, text, images, drawing, highlight, forms. Competitors upload files (deleted after 1–2 h) and limit free use |
| redact pdf meaning, whiteout vs redaction | — | Learn | `/edit-pdf.html` (section) | Covered in "Whiteout or redaction?" |
| sign pdf online free | sign pdf online free no account, no sign up, add signature to pdf, sign pdf on iphone | Do | `/sign-pdf.html` | Covered (no account, phone, privacy). Keep. |
| electronic vs digital signature | is an electronic signature legal uk, digital signature pdf | Learn | `/electronic-vs-digital-signature.html` | Guide; links to Sign PDF |
| merge pdf | merge pdf files, merge pdf online free, merge pdf and jpg | Do | `/merge-pdf.html` | Covered; images-into-PDF via JPG to PDF is linked. |
| compress pdf | **compress pdf to 200kb / 100kb / 500kb / 1mb** | Do, to a size limit | `/compress-pdf.html` | **Gap → add "fit under a size" option and guidance** |
| pdf to jpg | pdf to jpg converter free | Do | `/pdf-to-jpg.html` | Covered |
| jpg to pdf | jpg to pdf 200kb / 300kb, jpg to pdf merge | Do | `/jpg-to-pdf.html` | Multiple images covered; size limits → link to Compress PDF |
| pdf to excel | pdf to excel converter free offline | Do | `/pdf-to-excel.html` | Covered; "runs in your browser" answers the offline/privacy angle |
| pdf to word | pdf to word converter free | Do | `/pdf-to-word.html` | Covered |
| split pdf | split pdf pages | Do | `/split-pdf.html` | Covered |
| image compressor | **compress image to 20kb / 50kb / 100kb / 200kb** | Do, to a size limit | `/image-compressor.html` | 50 KB–2 MB covered; **gap → add 20 KB** |
| resize image | resize image to 20kb / 50kb (size, not pixels) | Mixed | `/image-resizer.html` | Pixel resizing; point KB intent to Image compressor |

## Office

| Primary query | Secondary | Intent | Page | Coverage / action |
|---|---|---|---|---|
| word to pdf | word to pdf converter free | Do | `/word-to-pdf.html` | Covered |
| merge word documents | merge word documents into one, into one pdf | Do | `/merge-word-documents.html` | Covered |
| excel to pdf | excel to pdf converter free | Do | `/excel-to-pdf.html` | Covered |
| csv to excel | csv to excel converter online | Do | `/csv-to-excel.html` | Covered (keeps leading zeros) |
| merge excel files | into one sheet, into one workbook | Do | `/merge-excel-files.html` | Covered |
| excel to json | excel to json converter online | Do | `/excel-to-json.html` | Covered. Ignore "for gst / gstr1" (Indian tax filing format, not supported) |
| remove duplicates excel | **shortcut, formula, column, based on two columns, mac** | Learn | `/remove-duplicate-rows.html` | **Gap → add how to do it in Excel itself** |

## Finance (UK)

| Primary query | Secondary | Intent | Page | Coverage / action |
|---|---|---|---|---|
| take home pay calculator uk | salary after tax uk calculator | Do | `/uk-take-home-pay-calculator.html` | Covered for England, Wales, NI. **Scotland not supported** — needs verified 2026/27 Scottish rates |
| salary after tax uk | salary after tax uk table, monthly | Know | `/salary-after-tax.html` | Covered (table) |
| £30,000 after tax uk | per month, and NI | Know | `/30000-after-tax.html` (and 27 others) | Covered; one page per salary, distinct figures |
| vat calculator uk | — | Do | `/vat-calculator.html` | Covered |
| 50 30 20 budget calculator | **weekly** (Search Console) | Do | `/budget-planner.html` | Pay frequency incl. weekly and fortnightly |
| savings calculator uk | **aer calculator**, compound interest (Search Console) | Do | `/savings-calculator.html` | Gross ↔ AER converter |
| loan repayment calculator uk | with extra payments; **loan early repayment calculator, estimate early loan payoff, 30000 loan over 10 years** (Search Console) | Do | `/loan-repayment-calculator.html` | Overpayments, lump sum, settlement estimate, £30k example |
| working days calculator uk | 2026, bank holidays | Do | `/date-difference-calculator.html` | Covered |

## General and developer

| Primary query | Secondary | Intent | Page | Coverage / action |
|---|---|---|---|---|
| hours calculator | with break, with lunch, with pay | Do | `/time-duration-calculator.html` | Covered (breaks, pay, overtime) |
| json formatter | json formatter and validator | Do | `/json-formatter.html` | Covered |
| base64 decode | to image, to pdf, to file | Do | `/base64-encoder-decoder.html` | Covered |
| uuid generator | v4, v7 | Do | `/uuid-generator.html` | Covered |
| unix timestamp converter | to date, milliseconds, **discord** | Do | `/unix-timestamp-converter.html` | Covered: Discord `<t:…>` codes with previews and copy buttons |
| password generator | 12 / 16 characters, words | Do | `/password-generator.html` | Covered (length, passphrases) |
| word counter | — | Do | `/word-counter.html` | Covered |
| age calculator | by date of birth | Do | `/age-calculator.html` | Covered |
| percentage calculator | increase, difference, of marks | Do | `/percentage-calculator.html` | Covered |
