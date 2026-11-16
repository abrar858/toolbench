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
