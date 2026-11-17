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

/* ---------- Word document merger: the merged file must be a structurally valid .docx ---------- */
// Unpacks the merged file with the page's own fflate and checks every cross-reference, then reads it with mammoth.
const inspectDocx = (page, buf) => page.evaluate(async b64 => {
 const z = fflate.unzipSync(Uint8Array.from(atob(b64), c => c.charCodeAt(0))), dec = new TextDecoder();
 const parse = p => { const d = new DOMParser().parseFromString(dec.decode(z[p]), 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('Bad XML in ' + p); return d; };
 const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const doc = parse('word/document.xml'), rels = z['word/_rels/document.xml.rels'] ? parse('word/_rels/document.xml.rels') : null;
 const relById = new Map(rels ? [...rels.documentElement.children].map(r => [r.getAttribute('Id'), r]) : []);
 const problems = [];
 for (const el of doc.getElementsByTagName('*')) for (const a of el.attributes) if (a.namespaceURI === R) {
  const rel = relById.get(a.value);
  if (!rel) problems.push('missing relationship ' + a.value);
  else if (rel.getAttribute('TargetMode') !== 'External' && !z['word/' + rel.getAttribute('Target')]) problems.push('missing part ' + rel.getAttribute('Target'));
 }
 const numbering = z['word/numbering.xml'] ? parse('word/numbering.xml') : null;
 const nums = new Set(numbering ? [...numbering.getElementsByTagNameNS(W, 'num')].map(n => n.getAttributeNS(W, 'numId')) : []);
 const abs = new Set(numbering ? [...numbering.getElementsByTagNameNS(W, 'abstractNum')].map(n => n.getAttributeNS(W, 'abstractNumId')) : []);
 for (const n of doc.getElementsByTagNameNS(W, 'numId')) { const v = n.getAttributeNS(W, 'val'); if (v !== '0' && !nums.has(v)) problems.push('missing list ' + v); }
 if (numbering) for (const a of numbering.getElementsByTagNameNS(W, 'abstractNumId')) if (!abs.has(a.getAttributeNS(W, 'val'))) problems.push('missing abstract list');
 const styles = z['word/styles.xml'] ? new Set([...parse('word/styles.xml').getElementsByTagNameNS(W, 'style')].map(s => s.getAttributeNS(W, 'styleId'))) : null;
 if (styles) for (const p of doc.getElementsByTagNameNS(W, 'pStyle')) if (!styles.has(p.getAttributeNS(W, 'val'))) problems.push('missing style ' + p.getAttributeNS(W, 'val'));
 const ids = [...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'docPr')].map(e => e.getAttribute('id'));
 if (new Set(ids).size !== ids.length) problems.push('duplicate drawing ids');
 if (!/Extension="png"/i.test(dec.decode(z['[Content_Types].xml']))) problems.push('png content type missing');
 const html = (await (await wordLib()).convertToHtml({arrayBuffer: Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer})).value;
 return {problems, html, footnoteRefs: doc.getElementsByTagNameNS(W, 'footnoteReference').length};
}, buf.toString('base64'));

test('merge Word documents keeps images, links, lists and styles valid', async ({page}) => {
 await page.goto('/merge-word-documents.html');
 for (const order of [['sample.docx', 'rich.docx', 'rich.docx'], ['rich.docx', 'sample.docx']]) {
  await page.locator('#mw-clear').click({force: true});
  await page.locator('#mw-in').setInputFiles(order.map(fixture));
  await page.locator('#mw-go').click();
  const d = await download(page, () => page.locator('#mw-out [data-dl="0"]').click());
  expect(d.suggestedFilename()).toBe('merged.docx');
  const r = await inspectDocx(page, await readDownload(d));
  expect(r.problems).toEqual([]);
  expect(r.html).toContain('Quarterly report');
  expect(r.html).toContain('First bullet point');
  expect(r.html).toContain('<a href="https://toolsbravo.com/">Visit ToolsBravo</a>');
  expect(r.html).toMatch(/<img src="data:image\/png;base64,/);
  expect(r.html).toMatch(/<ul><li>First bullet point/);
  if (order[0] === 'sample.docx') { expect(r.footnoteRefs).toBe(0); await expect(page.locator('#mw-msg')).toContainText("couldn't be carried over"); }
 }
});

test('home page layout does not shift after load', async ({page}) => {
 for (const viewport of [{width: 1350, height: 940}, {width: 375, height: 812}]) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.waitForLoadState('load');
  const cls = await page.evaluate(() => new Promise(done => {
   let total = 0;
   new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value; }).observe({type: 'layout-shift', buffered: true});
   setTimeout(() => done(total), 1500);
  }));
  expect(cls).toBeLessThan(0.1);
  expect(await page.locator('.tcards a.tcard').count()).toBeGreaterThanOrEqual(45);
 }
});

/* ---------- P1 improvements ---------- */
test('header search finds tools from any page', async ({page}) => {
 await page.goto('/vat-calculator.html');
 await page.locator('.search-btn').click();
 await page.locator('#site-q').fill('merge pdf');
 await expect(page.locator('#site-results li[role=option]').first()).toContainText('Merge PDF');
 await page.locator('#site-q').press('Enter');
 await expect(page).toHaveURL(/merge-pdf\.html$/);
});

test('hash generator: MD5, file checksum and expected-hash match', async ({page}) => {
 await page.goto('/hash-generator.html');
 await page.locator('#ht').fill('abc');
 await expect(page.locator('[data-h="MD5"]')).toHaveText('900150983cd24fb0d6963f7d28e17f72');
 await page.locator('#hf-in').setInputFiles({name: 'fox.txt', mimeType: 'text/plain', buffer: Buffer.from('The quick brown fox jumps over the lazy dog')});
 await expect(page.locator('[data-h="MD5"]')).toHaveText('9e107d9d372bb6826bd81d3542a419d6');
 await page.locator('#hash-expect').fill('D7A8FBB307D7809469CA9ABCB0082E4F8D5651E46D3CDB762D02D0BF37C9E592');
 await expect(page.locator('#hash-match')).toContainText('Match: the SHA-256');
 await page.locator('#hash-expect').fill('0000');
 await expect(page.locator('#hash-match')).toContainText('No match');
});

test('Base64: image to data URI and back to the same file', async ({page}) => {
 await page.goto('/base64-encoder-decoder.html');
 await page.locator('#b64-in').setInputFiles(fixture('sample.png'));
 await expect(page.locator('#b64-text')).toHaveValue(/^data:image\/png;base64,iVBORw0KGgo/);
 await page.locator('#b64-back').fill(await page.locator('#b64-text').inputValue());
 const d = await download(page, () => page.locator('#b64-save').click());
 expect(d.suggestedFilename()).toBe('decoded.png');
 expect(Buffer.compare(await readDownload(d), readFileSync(fixture('sample.png')))).toBe(0);
});

test('password generator makes passphrases with a strength rating', async ({page}) => {
 await page.goto('/password-generator.html');
 await expect(page.locator('#pst')).toContainText('bits of randomness');
 await page.locator('[name=pmode][value=words]').check();
 await expect(page.locator('#po .pw').first()).toHaveText(/^([A-Z][a-z-]+|\d+)(-([A-Z][a-z-]+|\d+)){4}$/);
 await expect(page.locator('#pst')).toContainText('4 random words');
});

test('image compressor reaches a target file size', async ({page}) => {
 await page.goto('/image-compressor.html');
 // Build a hard-to-compress 2400 × 1600 photo inside the page and hand it straight to the file input
 // (sending megabytes through the test runner would take longer than the tool itself).
 const inputSize = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'), d = x.createImageData(2400, 1600);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = (i / 4) % 251; d.data[i + 1] = (i / 7) % 241; d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .95));
  const dt = new DataTransfer(); dt.items.add(new File([b], 'photo.jpg', {type: 'image/jpeg'}));
  const input = document.querySelector('#ix-in'); input.files = dt.files; input.dispatchEvent(new Event('change'));
  return b.size;
 });
 expect(inputSize).toBeGreaterThan(1024 * 1024);
 await page.locator('#ix-mode').selectOption('size');
 await page.locator('#ix-target').selectOption('100');
 await page.locator('#ix-go').click();
 const d = await download(page, () => page.locator('#ix-out [data-dl="0"]').click());
 expect((await readDownload(d)).length).toBeLessThanOrEqual(100 * 1024);
});

test('loan calculator shows schedule and overpayment saving', async ({page}) => {
 await page.goto('/loan-repayment-calculator.html');
 await expect(page.locator('#lo .big')).toHaveText('£197.54 a month');
 await page.locator('#lx').fill('100');
 await expect(page.locator('#lo')).toContainText('cleared in 3 years 2 months');
 await page.locator('.schedule summary').click();
 const d = await download(page, () => page.locator('#l-csv').click());
 const csv = (await readDownload(d)).toString('utf8').trimEnd().split('\n');
 expect(csv[0]).toBe('﻿Month,Payment,Interest,Capital,Balance');
 expect(csv).toHaveLength(39);
 expect(csv.at(-1)).toMatch(/,0$/);
});

test('working days skip UK bank holidays', async ({page}) => {
 await page.goto('/date-difference-calculator.html');
 await page.locator('#dd-start').fill('2026-12-01');
 await page.locator('#dd-end').fill('2027-01-01');
 await page.locator('#dd-region').selectOption('england-and-wales');
 await expect(page.locator('#dd-result')).toContainText('21Working days');
 await page.locator('#da-from').fill('2026-12-21');
 await page.locator('#da-n').fill('10');
 await page.locator('#da-kind').selectOption('working');
 await expect(page.locator('#da-result .big')).toHaveText('Thursday, 7 January 2027');
});

test('weekly timesheet totals hours, overtime and pay', async ({page}) => {
 await page.goto('/time-duration-calculator.html');
 await page.locator('#ts-rate').fill('12.71');
 await page.locator('#ts-ot').fill('37.5');
 await expect(page.locator('#ts-out')).toContainText('40h 00m');
 await expect(page.locator('#ts-out')).toContainText('£524.29');
 await page.locator('#ts-s5').fill('22:00');
 await page.locator('#ts-e5').fill('06:00');
 await expect(page.locator('#ts-h5')).toHaveText('8h 00m');
});

test('merge Excel matches columns by header name', async ({page}) => {
 await page.goto('/merge-excel-files.html');
 await page.locator('#me-in').setInputFiles([
  {name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Email,Town\nSam,sam@x.com,Leeds\n')},
  {name: 'b.csv', mimeType: 'text/csv', buffer: Buffer.from('email,NAME,Phone\nana@x.com,Ana,555\n')}]);
 await page.locator('#me-mode').selectOption('stack');
 const d = await download(page, async () => { await page.locator('#me-go').click(); await page.locator('#me-out [data-dl="0"]').click(); });
 const {rows} = await inspectBook(page, await readDownload(d));
 expect(rows).toEqual([['Source file', 'Name', 'Email', 'Town', 'Phone'], ['a.csv', 'Sam', 'sam@x.com', 'Leeds', ''], ['b.csv', 'Ana', 'ana@x.com', '', 555]]);
});

test('guide tables stay inside the screen on phones', async ({page}) => {
 const {DEPTH} = await import('../scripts/content-depth.mjs');
 await page.setViewportSize({width: 375, height: 812});
 for (const c of TOOL_CONTENT.filter(c => DEPTH[c.id])) {
  await page.goto('/' + c.slug);
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.guide table')].filter(t => {
   const box = (t.closest('.tablewrap') || t).getBoundingClientRect(); return box.right > innerWidth + 1;
  }).length);
  expect(overflow, c.slug).toBe(0);
 }
});

/* ---------- CSV values are never altered (leading zeros, phone numbers, long IDs, slash dates) ---------- */
const TRICKY = ['Code', 'Phone', 'Price', 'Date', 'UK date', 'Account', 'Active'];
test('CSV to Excel keeps codes, phones, IDs and dates as written', async ({page}) => {
 await page.goto('/csv-to-excel.html');
 await page.locator('#cx-in').setInputFiles(fixture('tricky.csv'));
 await page.locator('#cx-go').click();
 const d = await download(page, () => page.locator('#cx-out [data-dl="0"]').click());
 const shown = await page.evaluate(async b64 => {
  const wb = XLSX.read(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {type: 'array', cellDates: true}), ws = wb.Sheets[wb.SheetNames[0]];
  return {text: XLSX.utils.sheet_to_json(ws, {header: 1, raw: false}), types: ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2'].map(r => ws[r].t).join('')};
 }, (await readDownload(d)).toString('base64'));
 expect(shown.text[0]).toEqual(TRICKY);
 expect(shown.text[1]).toEqual(['00123', '+447700900123', '3.50', '2026-01-05', '05/01/2026', '12345678901234567890', 'TRUE']);
 expect(shown.types).toBe('ssndssb');
});

test('merging, viewing and converting a CSV never alters its values', async ({page}) => {
 await page.goto('/merge-excel-files.html');
 await page.locator('#me-in').setInputFiles([fixture('tricky.csv'), fixture('tricky.csv')]);
 await page.locator('#me-mode').selectOption('stack');
 await page.locator('#me-src').uncheck();
 const d = await download(page, async () => { await page.locator('#me-go').click(); await page.locator('#me-out [data-dl="0"]').click(); });
 const rows = await page.evaluate(async b64 => { const wb = XLSX.read(Uint8Array.from(atob(b64), c => c.charCodeAt(0)), {type: 'array'}); return XLSX.utils.sheet_to_json(wb.Sheets.Merged, {header: 1, raw: false}); }, (await readDownload(d)).toString('base64'));
 expect(rows).toHaveLength(5);
 expect(rows[2].slice(0, 2)).toEqual(['0456', '07700900456']);

 await page.goto('/excel-viewer.html');
 await page.locator('#ev-in').setInputFiles(fixture('tricky.csv'));
 await expect(page.locator('#ev-out tbody')).toContainText('05/01/2026');
 await expect(page.locator('#ev-out tbody')).toContainText('12345678901234567890');

 await page.goto('/excel-to-json.html');
 await page.locator('#xj-in').setInputFiles(fixture('tricky.csv'));
 await expect(page.locator('#xj-out')).toBeVisible();
 const json = JSON.parse(await page.locator('#xj-text').inputValue());
 expect(json[0]).toMatchObject({Code: '00123', Phone: '+447700900123', Price: 3.5, 'UK date': '05/01/2026', Account: '12345678901234567890', Active: true});

 await page.goto('/excel-to-csv.html');
 await page.locator('#xc-in').setInputFiles(fixture('tricky.csv'));
 await page.locator('#xc-bom').uncheck();
 await page.locator('#xc-go').click();
 const c = await download(page, () => page.locator('#xc-out [data-dl="0"]').click());
 expect((await readDownload(c)).toString('utf8').trimEnd()).toBe(readFileSync(fixture('tricky.csv'), 'utf8').trimEnd().replace(/\r\n/g, '\n'));
});

/* ---------- Sign PDF ---------- */
// Helpers: open a PDF, add a typed signature or text, and inspect the downloaded result with pdf.js
// (rendering each page and counting ink inside each placed item's box).
const openToSign = async (page, name) => {
 await page.goto('/sign-pdf.html');
 await page.locator('#sg-in').setInputFiles(fixture(name));
 await expect(page.locator('#sg-work')).toBeVisible();
};
const goToPage = async (page, n) => { await page.locator('#sg-pageno').fill(String(n)); await page.locator('#sg-pageno').press('Enter'); await page.locator('#sg-pageno').dispatchEvent('change'); };
const addTypedSignature = async (page, text = 'Sam Patel', kind = 'signature') => {
 await page.locator(`[data-add=${kind}]`).click();
 await page.locator('[data-tab=type]').click();
 await page.locator('#sg-type-in').fill(text);
 await page.locator('#sg-use').click();
 await expect(page.locator('#sg-dialog')).not.toBeVisible();
};
const addText = async (page, kind, text) => {
 await page.locator(`[data-add=${kind}]`).click();
 if (text !== undefined) await page.locator('#sg-t-in').fill(text);
 await page.locator('#sg-t-ok').click();
};
const placed = page => page.locator('.sg-el').evaluateAll(els => els.map(e => ({page: +e.dataset.page, x: +e.dataset.x, y: +e.dataset.y, w: +e.dataset.w, h: +e.dataset.h})));
const downloadSigned = async page => {
 const [d] = await Promise.all([page.waitForEvent('download'), (async () => {
  await page.locator('#sg-download').click();
  if (await page.locator('#sg-confirm').isVisible()) await page.locator('#sg-confirm-yes').click();
 })()]);
 return d;
};
// Renders every page of a PDF at scale 1 and measures dark ink inside each box (and in a mirrored control box).
const inspectSigned = (page, buf, boxes) => page.evaluate(async ({b64, boxes}) => {
 const pdfjs = await pdfJs(), doc = await pdfjs.getDocument({data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), isEvalSupported: false}).promise;
 const result = {pages: doc.numPages, sizes: [], text: [], boxes: []};
 for (let i = 1; i <= doc.numPages; i++) {
  const p = await doc.getPage(i), vp = p.getViewport({scale: 1}), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await p.render({canvasContext: x, viewport: vp}).promise;
  result.sizes.push([Math.round(vp.width), Math.round(vp.height), vp.rotation]);
  result.text.push((await p.getTextContent()).items.map(t => t.str).join(' '));
  const ink = (bx, by, bw, bh) => { const d = x.getImageData(Math.max(0, Math.round(bx)), Math.max(0, Math.round(by)), Math.max(1, Math.round(bw)), Math.max(1, Math.round(bh))).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (d[k] + d[k + 1] + d[k + 2] < 300) n++; return n; };
  for (const b of boxes.filter(b => b.page === i - 1)) result.boxes.push({page: i - 1, inside: ink(b.x, b.y, b.w, b.h), control: ink(vp.width - b.x - b.w, vp.height - b.y - b.h, b.w, b.h)});
 }
 doc.destroy();
 return result;
}, {b64: buf.toString('base64'), boxes});

test('sign PDF: typed signature, name and date land where they were placed', async ({page}) => {
 await openToSign(page, 'sign-a4.pdf');
 await addTypedSignature(page);
 const el = page.locator('.sg-el').first();
 const box = await el.boundingBox();
 await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
 await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 + 60, {steps: 8}); await page.mouse.up();
 await addText(page, 'name', 'Sam Patel');
 await addText(page, 'date');
 const boxes = await placed(page);
 expect(boxes).toHaveLength(3);
 const d = await downloadSigned(page);
 expect(d.suggestedFilename()).toBe('sign-a4-signed.pdf');
 const raw = await readDownload(d), latin = raw.toString('latin1');
 // Classic layout for the widest reader support: a plain xref table, no object streams.
 expect(latin.startsWith('%PDF-')).toBe(true);
 expect(latin).toMatch(/\nxref\r?\n/);
 expect(latin).not.toContain('/ObjStm');
 expect(latin.trimEnd().endsWith('%%EOF')).toBe(true);
 const r = await inspectSigned(page, raw, boxes);
 expect(r.pages).toBe(1);
 expect(r.text[0]).toContain('Original document text that must stay selectable.');
 expect(r.text[0]).toContain('Sam Patel');
 for (const b of r.boxes) { expect(b.inside).toBeGreaterThan(40); expect(b.control).toBe(0); }
});

test('sign PDF: every page size and rotation keeps its position after zoom', async ({page}) => {
 await openToSign(page, 'sign-mixed.pdf');
 await page.locator('#sg-zoom-in').click();
 for (let n = 1; n <= 6; n++) {
  await goToPage(page, n);
  await addTypedSignature(page, 'Ana Lima');
  await addText(page, 'text', 'Page ' + n + ' approved');
 }
 const boxes = await placed(page);
 expect(boxes.map(b => b.page)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
 const r = await inspectSigned(page, await readDownload(await downloadSigned(page)), boxes);
 expect(r.pages).toBe(6);
 expect(r.sizes.map(s => s[2])).toEqual([0, 0, 0, 90, 180, 270]);
 expect(r.text[1]).toContain('US Letter');
 for (const b of r.boxes) { expect(b.inside, `page ${b.page + 1}`).toBeGreaterThan(30); expect(b.control, `page ${b.page + 1}`).toBe(0); }
});

test('sign PDF: keyboard moving, resizing, removing, undo and redo', async ({page}) => {
 await openToSign(page, 'sign-a4.pdf');
 await addTypedSignature(page, 'SP', 'initials');
 const el = page.locator('.sg-el').first();
 await expect(el).toBeFocused();
 const start = (await placed(page))[0];
 await el.press('Shift+ArrowRight'); await el.press('Shift+ArrowRight'); await el.press('Shift+ArrowDown');
 let now = (await placed(page))[0];
 expect(now.x - start.x).toBeCloseTo(20, 1); expect(now.y - start.y).toBeCloseTo(10, 1);
 await page.locator('.sg-el').first().press('+');
 expect((await placed(page))[0].w).toBeGreaterThan(now.w);
 await page.locator('#sg-undo').click();
 expect((await placed(page))[0].w).toBeCloseTo(now.w, 1);
 await page.locator('.sg-el').first().focus(); await page.locator('.sg-el').first().press('Delete');
 await expect(page.locator('.sg-el')).toHaveCount(0);
 await page.locator('#sg-undo').click();
 await expect(page.locator('.sg-el')).toHaveCount(1);
 await page.locator('#sg-redo').click();
 await expect(page.locator('.sg-el')).toHaveCount(0);
});

test('sign PDF: drawn and uploaded signatures, reusing a saved one', async ({page}) => {
 await openToSign(page, 'sign-a4.pdf');
 await page.locator('[data-add=signature]').click();
 const pad = await page.locator('#sg-pad').boundingBox();
 await page.mouse.move(pad.x + 30, pad.y + 120); await page.mouse.down();
 for (let i = 1; i <= 20; i++) await page.mouse.move(pad.x + 30 + i * 12, pad.y + 120 - Math.sin(i / 2) * 40);
 await page.mouse.up();
 await page.locator('#sg-use').click();
 await page.locator('[data-add=signature]').click();
 await expect(page.locator('.sg-saved')).toHaveCount(1);
 await page.locator('[data-tab=upload]').click();
 await page.locator('#sg-up-in').setInputFiles(fixture('sample.png'));
 await expect(page.locator('#sg-up-preview')).toBeVisible();
 await page.locator('#sg-use').click();
 await page.locator('[data-add=signature]').click();
 await page.locator('.sg-saved').first().click();
 await expect(page.locator('.sg-el')).toHaveCount(3);
 const r = await inspectSigned(page, await readDownload(await downloadSigned(page)), []);
 expect(r.pages).toBe(1);
});

test('sign PDF: drag a signature onto another page', async ({page}) => {
 await openToSign(page, 'sign-mixed.pdf');
 await addTypedSignature(page);
 // Zoom out until pages 1 and 2 are both in view, then drag across the gap.
 for (let i = 0; i < 4; i++) await page.locator('#sg-zoom-out').click();
 await page.locator('#sg-viewer').evaluate(v => { v.scrollTop = 0; });
 await expect(page.locator('.sg-page[data-page="1"]')).toBeInViewport();
 const el = page.locator('.sg-el').first(), from = await el.boundingBox();
 const target = await page.locator('.sg-page[data-page="1"]').boundingBox();
 await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
 await page.mouse.move(target.x + target.width / 2, target.y + 80, {steps: 15}); await page.mouse.up();
 expect((await placed(page))[0].page).toBe(1);
});

test('sign PDF: clear errors for damaged, locked and non-PDF files', async ({page}) => {
 await page.goto('/sign-pdf.html');
 await page.locator('#sg-in').setInputFiles(fixture('sign-damaged.pdf'));
 await expect(page.locator('#sg-msg')).toContainText('could not be read as a PDF');
 await page.locator('#sg-in').setInputFiles(fixture('sign-locked.pdf'));
 await expect(page.locator('#sg-msg')).toContainText('password-protected');
 await page.locator('#sg-in').setInputFiles(fixture('sample.png'));
 await expect(page.locator('#sg-msg')).toContainText("isn't a PDF");
 await expect(page.locator('#sg-work')).toBeHidden();
});

test('sign PDF: long documents render lazily and page navigation works', async ({page}) => {
 await openToSign(page, 'sign-long.pdf');
 await expect(page.locator('.sg-page')).toHaveCount(60);
 await expect(page.locator('.sg-page.rendered').first()).toBeVisible();
 const rendered = await page.locator('.sg-page.rendered').count();
 expect(rendered).toBeLessThan(20);
 await goToPage(page, 50);
 await expect(page.locator('#sg-pageno')).toHaveValue('50');
 await addText(page, 'text', 'Signed on page fifty');
 expect((await placed(page))[0].page).toBe(49);
 await page.locator('#sg-confirm-skip').isVisible().catch(() => {});
 const r = await inspectSigned(page, await readDownload(await downloadSigned(page)), await placed(page));
 expect(r.pages).toBe(60);
 expect(r.text[49]).toContain('Signed on page fifty');
});

test('sign PDF: phone layout with touch drawing', async ({browser}) => {
 const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, acceptDownloads: true, baseURL: test.info().project.use.baseURL});
 const page = await context.newPage();
 await openToSign(page, 'sign-a4.pdf');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
 const pageBox = await page.locator('.sg-page').first().boundingBox();
 expect(pageBox.width).toBeLessThanOrEqual(390);
 await page.locator('[data-add=signature]').tap();
 const pad = await page.locator('#sg-pad').boundingBox();
 await page.locator('#sg-pad').evaluate((c, p) => {
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, {pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true}));
  fire('pointerdown', p.x + 20, p.y + 100); for (let i = 1; i < 15; i++) fire('pointermove', p.x + 20 + i * 15, p.y + 100 - i * 4); fire('pointerup', p.x + 230, p.y + 44);
 }, pad);
 await page.locator('#sg-use').tap();
 await expect(page.locator('.sg-el')).toHaveCount(1);
 const d = await downloadSigned(page);
 expect(d.suggestedFilename()).toBe('sign-a4-signed.pdf');
 await context.close();
});
