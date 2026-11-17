# ToolsBravo SEO audit

Audit date: 17 November 2026 (UK). Live site: https://toolsbravo.com, `main` at `6fd3a60`.
Re-run any time with `node scripts/seo-audit.mjs` (live) or `node scripts/seo-audit.mjs http://127.0.0.1:4173` (local build).

This file records what was inspected, the evidence, and what it means. It does not predict rankings or traffic.

## 1. Summary

| Area | Result | Status |
|---|---|---|
| Sitemap | 79 URLs, all HTTP 200, `text/html`, no duplicates, all on `https://toolsbravo.com` | ✅ |
| robots.txt | `Allow: /`, references `https://toolsbravo.com/sitemap.xml` | ✅ |
| Canonicals | Every page has one canonical that equals its own URL | ✅ |
| Indexability | No `noindex` on any sitemap page; every indexable page is in the sitemap | ✅ |
| Internal links | No broken internal links; no orphan pages; every tool linked from all 79 pages via the header menu | ✅ |
| Titles / descriptions | All unique; 4 titles were 66–67 characters (fixed, now ≤ 65) | ✅ fixed |
| H1 | Exactly one per page | ✅ |
| Structured data | Valid JSON-LD everywhere; BreadcrumbList on 77/79 (home and Automation builder lack it) | ✅ / ⚠️ |
| `WebApplication` name | Used the page H1 sentence instead of the tool name | ✅ fixed |
| HTTPS | `http://` and `http://www.` redirect (301) to `https://toolsbravo.com/` | ✅ |
| `https://www.toolsbravo.com` | **TLS handshake fails** — certificate covers `toolsbravo.com` only | ❌ owner action |
| Duplicate URL variants | `/index.html` and extensionless `/merge-pdf` return 200 but declare the correct canonical | ✅ (handled by canonical) |
| Missing pages | Unknown paths return a real HTTP 404 (not a soft 404) | ✅ |
| Performance (lab) | See §5 | ✅ |

## 2. Sitemap

- Repository and live sitemap: **79** `<loc>` entries (46 tools, home, salary hub, 28 salary pages, automation builder, about, privacy).
- Search Console reported **69 discovered** pages, last read 16 November 2026.
- **Explanation (verified from git history of `sitemap.xml`):**

  | Commit | Time (UK) | URLs |
  |---|---|---:|
  | `c5a3515` | 15 Nov 22:39 | 7 |
  | `efa477c` | 16 Nov 00:00 | **69** |
  | `4253516` | 16 Nov 22:15 | 77 |
  | `2acf5c1` | 16 Nov 22:38 | 78 |
  | `4df2f14` | 17 Nov 19:49 | 79 |

  Google's 69 matches the version live when it last read the file. The 10 URLs added since (including Sign PDF) will be picked up on the next read. This is not a defect. An earlier recollection of 33–34 discovered pages does not match any committed sitemap version and remains unverified.
- No `lastmod`, `changefreq` or `priority` is emitted. Google ignores the latter two; `lastmod` is only used when consistently accurate. Every page is regenerated when shared assets change, so file dates would not reflect content changes — leave it out until a content-based date is available (action plan).

## 3. Indexing

Search Console's page-indexing report was still "Processing data". Indexed counts and exclusion reasons are **unknown**. Nothing on the site would block indexing:

- every sitemap URL returns 200 HTML with a self-referencing canonical and `index,follow`;
- no page is blocked by robots.txt;
- missing URLs return a real 404.

What to check once the report is ready is in `SEO_ACTION_PLAN.md` (Phase 4).

## 4. Structured data

| Type | Where | Notes |
|---|---|---|
| `WebSite`, `Organization` | Home | Accurate; `sameAs` points to the public GitHub repository |
| `WebApplication` | Each tool page | Free, `offers` price 0 GBP, no ratings or reviews. `name` now the tool name |
| `BreadcrumbList` | Tool, salary, about, privacy pages | Search Console: 24 valid, 0 invalid. Level 2 points to `/#category` fragments on the home page |
| `FAQPage` | Tool and salary pages | Every question is visible on the page. Note: Google shows FAQ rich results only for well-known government and health sites since 2023, so expect no FAQ snippets; the markup is still accurate |

No fake ratings, reviews or unsupported types were found.

## 5. Performance (lab data)

Verified from the raw logs of Actions run [44183574517](https://github.com/abrar858/toolbench/actions/runs/44183574517) (Lighthouse mobile, 17 Nov 21:48 UTC; this predates the header/footer redesign in PRs #15–#16):

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Home | 99 | not run | not run | not run | 1.7 s | 0 ms | 0 |
| Sign PDF | 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 0 |

Lab results, not field Core Web Vitals (Search Console: "no data" yet). The repository's browser tests also assert CLS < 0.05 on tool pages and < 0.1 on the home page.

## 6. Content depth

Median main-content length (excluding header, nav and footer) is about 545 words. Thinnest pages: privacy (185), salary hub (254), about (272), case converter (273), automation builder (286), delete PDF pages (293). Short is fine where the task is simple; see the keyword map for where search intent is not yet covered.

## 7. Search-intent gaps (from Google autocomplete, 17 Nov 2026)

Autocomplete shows how people phrase searches; it gives **no volumes** and none are claimed. Patterns that pages did not yet serve:

- **File-size targets:** "compress pdf to 200kb / 100kb / 500kb / 1mb", "compress image to 20kb / 50kb / 100kb", "jpg to pdf 200kb". Compress PDF had no target-size option; the image compressor had no 20 KB option.
- **"remove duplicates excel"** is mostly how-to intent (shortcut, formula, two columns). The page only described the tool.
- "sign pdf online free no account / no sign up" — already answered on the page.
- Scotland ("30000 after tax scotland", "take home pay calculator scotland") — not supported; needs verified 2026/27 Scottish rates before any change.

See `SEO_KEYWORD_MAP.md`.

## 8. Owner actions (outside the repository)

1. **Fix `https://www.toolsbravo.com`.** In DNS, make `www` a CNAME to `abrar858.github.io` (not to `toolsbravo.com`). GitHub Pages then issues a certificate covering both names and redirects `www` to the apex. Check in repository Settings → Pages.
2. **Resubmit the sitemap once** in Search Console (Sitemaps → `sitemap.xml`): it has changed since Google's last read (69 → 79 URLs). Do not resubmit repeatedly.
3. **URL Inspection → Request indexing** for the home page and Sign PDF (new page), once each.
