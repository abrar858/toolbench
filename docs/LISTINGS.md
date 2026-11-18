# ToolsBravo — listings, profiles and owner checklist

Ready-to-paste text for directories and communities. Everything here is accurate as of 18 November 2026; update the tool count if it changes. Don't buy links, don't post the same text everywhere on the same day, and follow each site's rules.

## Owner checklist (things only the owner can do)

| # | Task | Where | Time |
|---|---|---|---|
| 1 | Resubmit `sitemap.xml` once (Google last read 69 URLs; there are now 80) | Search Console → Sitemaps | 2 min |
| 2 | Request indexing for the home page, Sign PDF, Compress PDF and the new guide `electronic-vs-digital-signature.html` (once each) | Search Console → URL Inspection | 5 min |
| 3 | Add the site to Bing: **Import from Google Search Console** | bing.com/webmasters | 5 min |
| 4 | If `https://www.toolsbravo.com` still shows a security error 24 hours after the DNS change: Settings → Pages → remove the custom domain, save, add `toolsbravo.com` back, save, then tick **Enforce HTTPS** when offered | GitHub repository settings | 5 min |
| 5 | Create brand profiles (same name, logo and link): X, LinkedIn page, Reddit user. Send the profile URLs so they can be added to the site's structured data | Each site | 30 min |
| 6 | Submit to AlternativeTo, then SaaSHub, using the text below | Each site | 20 min each |
| 7 | Product Hunt launch (one day; pick a Tuesday–Thursday) | producthunt.com | 1 hour on the day |
| 8 | Show HN post (one only) | news.ycombinator.com | 15 min + replying to comments |
| 9 | Answer genuine questions in communities where a tool solves the problem (see guidance below) | Reddit, Stack Exchange, forums | ongoing |
| 10 | Mid-December: send Search Console screenshots (28-day performance: queries and pages; Pages report) | Search Console | 10 min |

After the PR is merged, IndexNow runs automatically on every deploy. To submit every page once (Bing and others), open **Actions → IndexNow ping → Run workflow**, tick **Submit every URL in sitemap.xml**.

## Core description

**Name:** ToolsBravo
**URL:** https://toolsbravo.com
**Tagline (60 characters):** Free PDF, Office and UK money tools that never upload files

**Short (160 characters):**
49 free browser tools: edit, sign, merge and compress PDFs, convert Word and Excel, UK salary and VAT calculators. Files stay on your device. No account.

**Long:**
ToolsBravo is a free collection of 49 everyday tools that run entirely in your web browser. Edit PDFs (change or remove text, white out, redact for real, fill in forms), sign, merge, split and compress them (including to a size limit such as 200 KB for upload forms), convert between PDF, Word, Excel, CSV and images, work out UK take-home pay and VAT, and use developer tools such as a JSON formatter and UUID generator.

Unlike most online PDF sites, nothing is uploaded: files are processed on your own device with open-source libraries, so private documents never leave your computer or phone. There's no account and no watermark. It works on Windows, Mac, Chromebook, iPhone and Android.

**Key features:**
- Edit PDFs: change or remove existing text, whiteout, true redaction, add text, images and drawings, fill in forms
- Sign PDFs: draw, type or upload a signature, add initials and dates, place them on any page
- Compress PDFs and images to a size limit (for example under 200 KB or 20 KB)
- PDF ↔ Word, Excel, JPG; merge Word or Excel files; remove duplicate rows
- UK take-home pay for 2026/27, salary tables, VAT, loans, savings
- No upload, no account, no watermark, free

**Categories / tags:** PDF tools, PDF editor, e-signature, file converter, image compressor, Excel tools, calculator, developer tools, privacy

## AlternativeTo

Add ToolsBravo as an alternative to: **iLovePDF**, **Smallpdf**, **Adobe Acrobat online**, **PDF24 Tools**, **Sejda**.
- Platform: Online (web)
- License: Free
- Use the short and long descriptions and features above.
- Feature tags if offered: tick "No registration required" and "Privacy focused". Don't tick "Works offline": the site has to load from the internet first.

## SaaSHub

Same text as AlternativeTo. Category: PDF tools / File conversion. Pricing: Free.

## Product Hunt

**Name:** ToolsBravo
**Tagline:** PDF and Office tools that never upload your files
**Description (260 characters):** Sign, merge and compress PDFs, convert Word, Excel and images, and work out UK pay, all inside your browser. Your files never leave your device. 49 free tools, no account, no watermark.
**Topics:** Productivity, Privacy, Developer Tools
**First comment (from the maker):**
> I built ToolsBravo because most "free PDF" sites upload your documents to their servers, which isn't great for contracts, payslips or ID scans. Everything here runs in your browser using open-source libraries (pdf-lib, pdf.js), so files stay on your device. My favourite bits: compress a PDF to a specific size for upload forms, and sign a PDF on your phone. It's free with no account. I'd love feedback on what's missing.

## Show HN

**Title:** Show HN: Browser-only PDF tools – sign, merge, compress without uploading
**Text:**
> ToolsBravo (https://toolsbravo.com) is a set of 49 tools that run client-side: PDF editing (including redaction that rasterises affected pages so the text is really gone), signing, merging, splitting and compression (including binary-searching render settings to hit a size limit like 200 KB), PDF/Word/Excel/image conversion, and some UK finance calculators.
>
> It's a static site on GitHub Pages. PDF work uses pdf-lib and pdf.js; Word uses mammoth; spreadsheets use SheetJS. No server, no analytics, no accounts. Source: https://github.com/abrar858/toolbench
>
> Things I learned: signed PDFs have to be rewritten carefully for Acrobat (generation numbers on incrementally updated files), and "compress to X KB" is mostly a page-count problem once pages are rasterised. Happy to answer questions.

## Brand profiles

**Bio (160 characters):** Free browser tools for PDFs, Word, Excel, images and UK money. Files never leave your device. No account, no watermark. toolsbravo.com
**LinkedIn page description:** ToolsBravo makes free, private online tools: sign, merge and compress PDFs, convert Word and Excel files, and calculate UK take-home pay and VAT, all processed in your browser so files are never uploaded.
**Use:** the logo from `assets/icon-512.png`, and the same name everywhere.

## Community answers: how to do it well

- Only answer when a ToolsBravo tool genuinely solves the question asked, and answer the question fully in the reply itself; the link is a bonus, not the answer.
- Say you made it ("I built a free tool for this…"); undisclosed self-promotion breaks most communities' rules.
- Good fits: "how do I get my PDF under 200 KB for this form?", "sign a PDF without Adobe", "merge Excel files into one", "how much is £35k after tax?".
- Check each subreddit's rules first (for example r/excel and r/UKPersonalFinance restrict self-promotion).
- One helpful answer a week beats twenty links in a day.
