import {test,expect} from '@playwright/test';
import {TOOL_CONTENT} from '../scripts/content.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
test('every tool renders without uncaught browser errors', async ({page})=>{
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 expect(TOOL_CONTENT.length).toBeGreaterThanOrEqual(36);
 for(const {slug} of TOOL_CONTENT){
  await page.goto('/'+slug);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main .panel')).toBeVisible();
  await expect(page.locator('main .panel input,main .panel textarea,main .panel select').first()).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('search filters the tool list',async ({page})=>{
 await page.goto('/');
 await page.locator('#q').fill('password');
 await expect(page.locator('.tcards a[href="password-generator.html"]')).toBeVisible();
 await expect(page.locator('.tcards a[href="loan-repayment-calculator.html"]')).toBeHidden();
});
test('salary calculator displays a result and rejects invalid pension',async ({page})=>{
 await page.goto('/uk-take-home-pay-calculator.html');
 await expect(page.locator('#so')).toContainText('a month');
 await page.locator('#sp').fill('-5');
 await expect(page.locator('#so')).toContainText('valid salary');
});
test('old #tool links redirect to the tool page',async ({page})=>{
 await page.goto('/#word-counter');
 await expect(page).toHaveURL(/word-counter\.html$/);
 await expect(page.locator('main h1')).toContainText('Word counter');
});
test('mobile layout has no horizontal document overflow',async ({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(overflow).toBe(false);
});

test('automation builder runs connected transformations and exports workflows',async ({page})=>{
 await page.goto('/automation-builder.html');
 await expect(page.locator('#nodes .graph-node')).toHaveCount(2);
 await page.locator('#run').click();
 await expect(page.locator('#output')).toHaveText('HELLO FROM TOOLSBRAVO!');
 await expect(page.locator('#status')).toContainText('Success');
 await page.locator('#addType').selectOption('suffix');
 await page.locator('#add').click();
 await expect(page.locator('#nodes .graph-node')).toHaveCount(3);
 await page.locator('#editor input').fill(' TEST');
 await page.locator('#run').click();
 await expect(page.locator('#output')).toHaveText('HELLO FROM TOOLSBRAVO! TEST');
 await page.reload();
 await expect(page.locator('#nodes .graph-node')).toHaveCount(3);
});

test('salary pages show the calculator with the page salary',async ({page})=>{
 await page.goto('/45000-after-tax.html');
 await expect(page.locator('main h1')).toHaveText('£45,000 after tax in the UK');
 await expect(page.locator('#so')).toContainText('£2,993.30 a month');
});

/* ---------- PDF, Word and image tools, run end to end with real files ---------- */
const fixture = name => fileURLToPath(new URL('./fixtures/' + name, import.meta.url));
const readDownload = async d => readFileSync(await d.path());
// Counts pages and rotations with the site's own pdf-lib, already loaded by the tool.
const inspectPdf = (page, buf) => page.evaluate(async b64 => {
 const doc = await PDFLib.PDFDocument.load(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
 return doc.getPages().map(p => p.getRotation().angle);
}, buf.toString('base64'));
const download = async (page, click) => { const [d] = await Promise.all([page.waitForEvent('download'), click()]); return d; };

test('merge PDF combines files in order', async ({page}) => {
 await page.goto('/merge-pdf.html');
 await page.locator('#mp-in').setInputFiles([fixture('sample.pdf'), fixture('sample.pdf')]);
 await expect(page.locator('#mp-list li')).toHaveCount(2);
 const d = await download(page, () => page.locator('#mp-go').click());
 expect(d.suggestedFilename()).toBe('merged.pdf');
 expect(await inspectPdf(page, await readDownload(d))).toHaveLength(6);
});

test('split PDF extracts pages and splits every page', async ({page}) => {
 await page.goto('/split-pdf.html');
 await page.locator('#sp-in').setInputFiles(fixture('sample.pdf'));
 await expect(page.locator('#sp-file')).toContainText('3 pages');
 await page.locator('#sp-pages').fill('1, 3');
 await page.locator('#sp-go').click();
 const d = await download(page, () => page.locator('#sp-out [data-dl="0"]').click());
 expect(await inspectPdf(page, await readDownload(d))).toHaveLength(2);
 await page.locator('#sp-mode').selectOption('every');
 await page.locator('#sp-go').click();
 await expect(page.locator('#sp-out li')).toHaveCount(3);
 const z = await download(page, () => page.locator('#sp-out [data-zip]').click());
 expect((await readDownload(z)).subarray(0, 2).toString()).toBe('PK');
 await page.locator('#sp-mode').selectOption('extract');
 await page.locator('#sp-pages').fill('9');
 await page.locator('#sp-go').click();
 await expect(page.locator('#sp-msg')).toContainText('outside pages 1 to 3');
});

test('rotate and delete PDF pages', async ({page}) => {
 await page.goto('/rotate-pdf.html');
 await page.locator('#rp-in').setInputFiles(fixture('sample.pdf'));
 await expect(page.locator('#rp-go')).toBeEnabled();
 await page.locator('#rp-pages').fill('2');
 const r = await download(page, () => page.locator('#rp-go').click());
 expect(await inspectPdf(page, await readDownload(r))).toEqual([0, 90, 0]);
 await page.goto('/delete-pdf-pages.html');
 await page.locator('#dp-in').setInputFiles(fixture('sample.pdf'));
 await expect(page.locator('#dp-go')).toBeEnabled();
 await page.locator('#dp-pages').fill('2');
 const d = await download(page, () => page.locator('#dp-go').click());
 expect(await inspectPdf(page, await readDownload(d))).toHaveLength(2);
});

test('JPG to PDF and PDF to JPG', async ({page}) => {
 await page.goto('/jpg-to-pdf.html');
 await page.locator('#ip-in').setInputFiles([fixture('sample.png'), fixture('sample.png')]);
 const d = await download(page, () => page.locator('#ip-go').click());
 expect(await inspectPdf(page, await readDownload(d))).toHaveLength(2);
 await page.goto('/pdf-to-jpg.html');
 await page.locator('#pj-in').setInputFiles(fixture('sample.pdf'));
 await expect(page.locator('#pj-go')).toBeEnabled();
 await page.locator('#pj-go').click();
 await expect(page.locator('#pj-out img.fl-thumb')).toHaveCount(3);
 const j = await download(page, () => page.locator('#pj-out [data-dl="0"]').click());
 expect(j.suggestedFilename()).toBe('sample-page-1.jpg');
 expect([...(await readDownload(j)).subarray(0, 3)]).toEqual([0xFF, 0xD8, 0xFF]);
});

test('PDF to Word extracts paragraphs into a .docx', async ({page}) => {
 await page.goto('/pdf-to-word.html');
 await page.locator('#pw-in').setInputFiles(fixture('sample.pdf'));
 await page.locator('#pw-go').click();
 await expect(page.locator('#pw-text')).toHaveValue(/Sample page 1[\s\S]*first paragraph of the sample document\. It continues on a second line[\s\S]*A separate paragraph/);
 const d = await download(page, () => page.locator('#pw-dl').click());
 expect(d.suggestedFilename()).toBe('sample.docx');
 expect((await readDownload(d)).subarray(0, 2).toString()).toBe('PK');
});

test('Word to PDF previews the document', async ({page}) => {
 await page.goto('/word-to-pdf.html');
 await page.locator('#wp-in').setInputFiles(fixture('sample.docx'));
 await expect(page.frameLocator('#wp-frame').locator('body')).toContainText('Quarterly report');
 await expect(page.frameLocator('#wp-frame').locator('strong')).toHaveText('Quarterly report');
 await expect(page.locator('#wp-print')).toBeVisible();
});

test('compress PDF reports when a file is already small', async ({page}) => {
 await page.goto('/compress-pdf.html');
 await page.locator('#cp-in').setInputFiles(fixture('sample.pdf'));
 await page.locator('#cp-go').click();
 await expect(page.locator('#cp-msg')).toContainText(/already well compressed|Reduced by/);
});

test('image converter, compressor and resizer', async ({page}) => {
 await page.goto('/image-converter.html');
 await page.locator('#ic-in').setInputFiles(fixture('sample.png'));
 await page.locator('#ic-type').selectOption('image/webp');
 await page.locator('#ic-go').click();
 const w = await download(page, () => page.locator('#ic-out [data-dl="0"]').click());
 expect(w.suggestedFilename()).toBe('sample.webp');
 expect((await readDownload(w)).subarray(8, 12).toString()).toBe('WEBP');
 await page.goto('/image-compressor.html');
 await page.locator('#ix-in').setInputFiles(fixture('sample.png'));
 await page.locator('#ix-go').click();
 await expect(page.locator('#ix-out li')).toContainText('→');
 await page.goto('/image-resizer.html');
 await page.locator('#ir-in').setInputFiles(fixture('sample.png'));
 await page.locator('#ir-w').fill('100');
 await page.locator('#ir-go').click();
 await expect(page.locator('#ir-out li')).toContainText('100 × 100 px');
});

/* ---------- Excel, CSV and data tools, run end to end with real files ---------- */
// Reads a downloaded workbook with the site's own SheetJS, already loaded by the tool.
const inspectBook = (page, buf) => page.evaluate(b64 => {
 const wb = XLSX.read(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {type: 'array'});
 return {sheets: wb.SheetNames, rows: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: true, defval: ''})};
}, buf.toString('base64'));

test('PDF to Excel rebuilds table rows and numbers', async ({page}) => {
 await page.goto('/pdf-to-excel.html');
 await page.locator('#px-in').setInputFiles(fixture('table.pdf'));
 await page.locator('#px-go').click();
 await expect(page.locator('#px-out table.sheet')).toContainText('Coffee shop');
 const d = await download(page, () => page.locator('#px-out [data-dl="0"]').click());
 expect(d.suggestedFilename()).toBe('table.xlsx');
 const {rows} = await inspectBook(page, await readDownload(d));
 const salary = rows.find(r => r.includes('Salary'));
 expect(salary).toEqual(['10/03/2026', 'Salary', 2450, 3445.8]);
 expect(rows.find(r => r.includes('Opening balance'))).toEqual(['01/03/2026', 'Opening balance', '', 1000]);
});

test('Excel to PDF previews each sheet', async ({page}) => {
 await page.goto('/excel-to-pdf.html');
 await page.locator('#ep-in').setInputFiles(fixture('sample.xlsx'));
 await expect(page.frameLocator('#ep-frame').locator('table')).toContainText('Sam Patel');
 await page.locator('#ep-sheet').selectOption({label: 'Orders'});
 await expect(page.frameLocator('#ep-frame').locator('table')).toContainText('1001');
 await expect(page.locator('#ep-print')).toBeVisible();
});

test('CSV to Excel keeps leading zeros and detects semicolons', async ({page}) => {
 await page.goto('/csv-to-excel.html');
 await page.locator('#cx-in').setInputFiles(fixture('sample.csv'));
 await page.locator('#cx-text').check();
 await page.locator('#cx-go').click();
 const d = await download(page, () => page.locator('#cx-out [data-dl="0"]').click());
 expect(d.suggestedFilename()).toBe('sample.xlsx');
 const {rows} = await inspectBook(page, await readDownload(d));
 expect(rows.slice(0, 2)).toEqual([['Code', 'Product', 'Price'], ['00123', 'Tea, green', '3.50']]);
});

test('Excel to CSV exports with the chosen separator', async ({page}) => {
 await page.goto('/excel-to-csv.html');
 await page.locator('#xc-in').setInputFiles(fixture('sample.xlsx'));
 await page.locator('#xc-sep').selectOption(';');
 await page.locator('#xc-go').click();
 const d = await download(page, () => page.locator('#xc-out [data-dl="0"]').click());
 expect(d.suggestedFilename()).toBe('sample-Customers.csv');
 const text = (await readDownload(d)).toString('utf8');
 expect(text.startsWith('﻿Name;Email;Joined\nSam Patel;sam@example.com;2026-01-05')).toBe(true);
});

test('merge Excel files as tabs and as stacked rows', async ({page}) => {
 await page.goto('/merge-excel-files.html');
 await page.locator('#me-in').setInputFiles([fixture('sample.xlsx'), fixture('sample.csv')]);
 let d = await download(page, async () => { await page.locator('#me-go').click(); await page.locator('#me-out [data-dl="0"]').click(); });
 expect((await inspectBook(page, await readDownload(d))).sheets).toEqual(['sample - Customers', 'sample - Orders', 'sample']);
 await page.locator('#me-clear').click();
 await page.locator('#me-in').setInputFiles([fixture('sample.xlsx'), fixture('sample.xlsx')]);
 await page.locator('#me-mode').selectOption('stack');
 d = await download(page, async () => { await page.locator('#me-go').click(); await page.locator('#me-out [data-dl="0"]').click(); });
 const {rows} = await inspectBook(page, await readDownload(d));
 expect(rows).toHaveLength(11);
 expect(rows[0]).toEqual(['Source file', 'Name', 'Email', 'Joined']);
});

test('Excel to JSON uses the header row as keys', async ({page}) => {
 await page.goto('/excel-to-json.html');
 await page.locator('#xj-in').setInputFiles(fixture('sample.xlsx'));
 await expect(page.locator('#xj-out')).toBeVisible();
 const data = JSON.parse(await page.locator('#xj-text').inputValue());
 expect(data).toHaveLength(5);
 expect(data[0]).toEqual({Name: 'Sam Patel', Email: 'sam@example.com', Joined: '2026-01-05'});
});

test('remove duplicate rows by all or chosen columns', async ({page}) => {
 await page.goto('/remove-duplicate-rows.html');
 await page.locator('#rd-in').setInputFiles(fixture('sample.xlsx'));
 await page.locator('#rd-go').click();
 await expect(page.locator('#rd-msg')).toHaveText('Removed 1 duplicate row; 4 rows left.');
 for (const label of ['Name', 'Joined']) await page.locator('#rd-col-list label', {hasText: label}).locator('input').uncheck();
 await page.locator('#rd-case').check();
 await page.locator('#rd-go').click();
 await expect(page.locator('#rd-msg')).toHaveText('Removed 2 duplicate rows; 3 rows left.');
 const d = await download(page, () => page.locator('#rd-out [data-dl="0"]').click());
 expect((await inspectBook(page, await readDownload(d))).rows).toHaveLength(4);
});

test('Excel viewer switches sheets and filters rows', async ({page}) => {
 await page.goto('/excel-viewer.html');
 await page.locator('#ev-in').setInputFiles(fixture('sample.xlsx'));
 await expect(page.locator('#ev-tabs button')).toHaveCount(2);
 await page.locator('#ev-q').fill('lee');
 await expect(page.locator('#ev-out tbody tr')).toHaveCount(1);
 await page.locator('#ev-tabs button', {hasText: 'Orders'}).click();
 await expect(page.locator('#ev-out tbody')).toContainText('1001');
});
