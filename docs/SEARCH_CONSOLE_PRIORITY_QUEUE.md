# ToolsBravo: Google Search Console–led tool improvement queue

Baseline: user-provided Google Search Console export, **18 November 2026, last 24 hours**, Web search. All listed pages recorded **0 clicks**. These are observations, **not** evidence that Google has endorsed or promoted a page. Re-rank using a 28-day export as data accumulates.

## Work order (by observed impressions, with a near-page-one quick-win exception)

| Order | Public page | Impressions | Avg. position | Why now |
|---|---|---:|---:|---|
| 1 | loan-repayment-calculator.html | 114 | 53.82 | Most visible: ~59% of all 193 impressions |
| 2 | savings-calculator.html | 25 | 45.40 | Second-highest search demand |
| 3 | csv-to-excel.html | 11 | 34.36 | High-intent conversion query |
| 4 | excel-to-csv.html | 7 | 13.43 | Closest substantial utility page to page-one positions; prioritize snippet and task completion |
| 5 | budget-planner.html | 6 | 15.83 | Near page one; query asks for weekly 50/30/20 budgets |
| 6 | uuid-generator.html | 4 | 1.50 | High position but no clicks; inspect query intent/snippet before feature work |
| 7 | image-resizer.html | 4 | 29.25 | Improve export options and real-device usability |
| 8 | debt-payoff-calculator.html | 4 | 58.00 | Build on loan and savings work |
| 9 | 35000-after-tax.html | 3 | 49.33 | Check year-specific figures and query alignment |
| 10 | salary-after-tax.html | 2 | 23.00 | Check accuracy, links and result breakdown |
| 11 | time-duration-calculator.html | 2 | 23.00 | Improve input variants and clear outputs |

**Note:** 193 is total impressions across all pages, not the sum of the selected rows. The order follows observed impression volume except where high ranking suggests a targeted CTR opportunity. Update the queue as new evidence arrives.

## Acceptance criteria for every tool

1. Inspect the **existing** implementation first. Preserve working features; do not reimplement already-shipped options.
2. Map Search Console queries to user tasks. Do not add features just to repeat keywords.
3. Provide multiple useful input formats or modes **where relevant**, with keyboard-accessible labels, examples, validation and mobile layout.
4. Explain output and assumptions in plain language, including what it does **not** calculate.
5. Add original worked examples that have been independently checked against the tool; include limitations and relevant primary-source references for financial/health topics.
6. Unique, descriptive title, H1, meta description and canonical; accurate WebApplication and breadcrumb structured data; descriptive links to related tools. No invented ratings or FAQ rich-result promises.
7. Add unit tests for numerical edge cases, Playwright browser tests for user journeys and mobile; run generated-page checks and SEO audit.
8. Release a small PR per tool, verify live functionality, then measure 28-day impressions, clicks, CTR, average position and relevant queries. Do not claim SEO improvement from one day's movement.

## First page: loan repayment calculator

Existing implementation already includes monthly payment, annual/monthly schedule, CSV export, recurring overpayment, lump-sum and early settlement estimation. **Verify them before changing them.**

Search queries in this export include:
- `loan early repayment calculator` — 5 impressions, position 67.2
- `calculate loan repayments` — 4, position 56
- `early loan settlement calculator` — 3, position 19.67
- `10 000 loan over 5 years calculator` — 3, position 22
- `30000 loan over 10 years calculator` — 3, position 24.67
- `extra repayment calculator` — 3, position 33
- `overpayment calculator loan` — 3, position 38.67

First implementation audit:
- Verify the input's advertised **APR** versus nominal annual interest conversion; representative APR may include fees and should not be treated automatically as a nominal monthly rate.
- Verify month-end rounding, 0% rates, short terms, final-payment adjustments, CSV totals, monthly overpayments, lump sums and settlement assumptions.
- Make comparison of standard vs early-payoff scenarios explicit; separate interest savings from any lender charges.
- Add a clear `how to read your repayment results` section and scenario comparisons **only if not already present**.
- Cross-check legal early-settlement statements against current UK primary sources before changing the wording.

## Second page: savings calculator

Audit AER vs gross interest, compounding frequency, regular deposits, initial balance, contribution timing, inflation assumptions and CSV/export if useful. Preserve existing AER conversion if present.

## Third–fifth pages

- CSV to Excel: encoding, delimiters, quoted fields, leading zeroes, date interpretation, preview, multiple sheets and limits.
- Excel to CSV: sheet selection, encoding, delimiter, quote handling, formula-value output, large-file limits.
- Budget planner: weekly/fortnightly/4-weekly/monthly/yearly income normalization, 50/30/20 flexibility, zero-income and negative-surplus cases, useful export.

## Source of truth

Search Console workbook supplied by the site owner: `toolsbravo.com-Performance-on-Search-2026-11-18 (1).xlsx`. Recheck this queue against a 28-day Search Console export before interpreting performance trends.
