// Extra depth for the highest-value pages: worked examples, comparisons and troubleshooting.
// Appended to each tool's sections and FAQs by content.mjs. Figures come from the site's own
// calculators (tests check the finance ones) or from official sources named in the text.
export const DEPTH = {
"merge-pdf": {
  sections: [
    ["Other ways to combine PDFs, compared", "<ul><li><strong>Mac:</strong> Preview can combine PDFs by dragging page thumbnails from one file into another's sidebar. It works, but it's fiddly with many files.</li><li><strong>Windows:</strong> there's no built-in way to merge PDFs. Printing to ‘Microsoft Print to PDF’ only handles one document at a time.</li><li><strong>Adobe Acrobat:</strong> the free Acrobat Reader can't combine files; that needs a paid Acrobat subscription or Adobe's online tools, which upload your files.</li><li><strong>This tool:</strong> works the same on Windows, Mac, Chromebook, iPhone and Android, keeps pages exactly as they are, and never uploads anything.</li></ul>"],
    ["Worked example: an expense claim", "<p>Say you have a claim form (<code>claim.pdf</code>, 2 pages) and three receipts saved as PDFs. Choose all four, use the arrows to put the claim form first and the receipts in date order, and press Merge PDFs. You get one 5-page <code>merged.pdf</code> to attach to a single email. If any receipt is a photo rather than a PDF, turn it into a PDF first with <a href=\"jpg-to-pdf.html\">JPG to PDF</a>.</p>"],
    ["If something goes wrong", "<ul><li><strong>‘Password-protected’ message:</strong> open the file in your PDF reader with its password, save or print a copy without a password, then merge that copy.</li><li><strong>The merged file is large:</strong> its size is roughly the sizes of the originals added together. Run it through <a href=\"compress-pdf.html\">Compress PDF</a> if it's too big to email.</li><li><strong>Pages are different sizes:</strong> each page keeps its own size and orientation. That's normal and prints correctly.</li><li><strong>Form fields or bookmarks are missing:</strong> those don't always survive merging. Fill in and save forms before merging.</li></ul>"],
  ],
  faqs: [
    ["Can I merge PDFs on my phone?", "Yes. Open this page in your phone's browser, choose the PDFs from your files or downloads, and the merged file is saved to your downloads."],
    ["Does merging reduce quality?", "No. Pages are copied as they are, so text stays sharp and searchable and images keep their resolution."],
  ],
},
"compress-pdf": {
  sections: [
    ["Why some PDFs are so big", "<p>The size of a PDF depends mostly on its images. A page scanned at 300 or 600 dpi, or a phone photo turned into a PDF, can be several megabytes on its own, while a page of plain text is usually only a few kilobytes. That's why scans and photo-heavy documents shrink dramatically here, and text-only documents don't.</p>"],
    ["Common size limits", "<ul><li>Gmail attachments: up to 25 MB.</li><li>Outlook.com attachments: around 20 MB.</li><li>Job, university and government upload forms: often between 2 MB and 10 MB, and sometimes as low as 1 MB. Check the form's own limit.</li></ul><p>If you have a 15 MB scanned document and a 5 MB limit, choose <em>Size limit: Under 5 MB</em> and the tool finds the best quality that fits. If even the smallest setting is too big, split the document with <a href=\"split-pdf.html\">Split PDF</a> and send it in parts.</p>"],
    ["Better options for text documents", "<p>If your PDF is mostly text and came from Word, Google Docs or another app, the smallest file usually comes from exporting it again from that app: in Word, use <em>File → Save as → PDF</em> and choose <em>Minimum size</em>. On a Mac, Preview's <em>Export → Quartz Filter → Reduce File Size</em> also works, though it can reduce image quality a lot.</p>"],
    ["If something goes wrong", "<ul><li><strong>The file got bigger:</strong> the tool tells you and doesn't offer the bigger file. Keep the original.</li><li><strong>I can't select or search the text:</strong> that's expected, because pages are saved as images. Keep the original for anything that needs searchable text.</li><li><strong>Small print is blurry:</strong> use Light compression.</li><li><strong>Signatures or form fields disappeared:</strong> they become part of the page image. Sign and fill in the original instead.</li></ul>"],
    ["Step by step: shrink a scan for email","<ol><li>Choose the PDF and note its size.</li><li>Pick Balanced and press Compress PDF.</li><li>Check the new size against the limit, and open the file to make sure the text is still readable.</li><li>If it's still too big, run the original again on Strong.</li></ol>"],
  ],
  faqs: [
    ["How do I compress a PDF to under 1 MB?", "Set Size limit to Under 1 MB and press Compress PDF. For long scans that still can't fit, split the PDF into smaller parts and compress each one."],
  ],
},
"pdf-to-word": {
  sections: [
    ["Other ways to turn a PDF into Word, compared", "<ul><li><strong>Microsoft Word:</strong> Word 2013 and later can open a PDF directly and convert it, often keeping more of the layout. It's the best option if you have Word installed.</li><li><strong>Google Docs:</strong> upload the PDF to Google Drive and choose <em>Open with → Google Docs</em>. It can also read text from scanned pages, but your document is stored on Google's servers.</li><li><strong>This tool:</strong> the quickest way to get the words out of a PDF privately, on any device, without installing anything or uploading the file.</li></ul>"],
    ["Getting the best result", "<ul><li>Use the original PDF from the app that made it, not a scan or a photo.</li><li>Documents with two or more columns, like newsletters, may have lines from neighbouring columns joined together. Check the extracted text before relying on it.</li><li>Headers, footers and page numbers are kept as ordinary text. Delete them in Word if you don't need them.</li><li>To keep a table, use <a href=\"pdf-to-excel.html\">PDF to Excel</a>, then copy the table into Word.</li></ul>"],
    ["Worked example: updating an old letter", "<p>You have last year's tenancy reference letter as a PDF and need a new version. Convert it here, open the .docx in Word or Google Docs, change the dates and details, then save it as a PDF again with <a href=\"word-to-pdf.html\">Word to PDF</a> or Word's own <em>Save as PDF</em>.</p>"],
    ["What converts and what doesn't","<table><tr><th>In the PDF</th><th>In the Word file</th></tr><tr><td>Text and paragraphs</td><td>Kept, as editable text</td></tr><tr><td>Page breaks</td><td>Kept</td></tr><tr><td>Headings, bold and italic</td><td>Become ordinary text</td></tr><tr><td>Tables</td><td>Become lines of text; use PDF to Excel instead</td></tr><tr><td>Images and charts</td><td>Left out</td></tr><tr><td>Scanned pages</td><td>No text found; needs OCR first</td></tr></table>"],
  ],
  faqs: [
    ["Why are some lines joined together?", "PDFs store text by position. In multi-column layouts, text from neighbouring columns sits on the same line and can be read together. Single-column documents convert cleanly."],
  ],
},
"jpg-to-pdf": {
  sections: [
    ["Scanning documents with your phone", "<ul><li>Lay the document flat in even light and avoid shadows from your hand or phone.</li><li>Fill the frame with the page and hold the phone parallel to it.</li><li>Many phones have a built-in document scanner: in the iPhone Notes app, or in Google Drive on Android. Those already make PDFs; use this tool when you only have photos.</li></ul>"],
    ["Image size and print quality", "<p>For a sharp printed A4 page at 300 dpi, an image needs to be about 2480 × 3508 pixels. Most phone photos are larger than that, so choose <em>A4</em> and they fit at full quality. For a PDF that only needs to be read on screen, a smaller file is fine: shrink the photos first with the <a href=\"image-compressor.html\">image compressor</a> to keep the PDF small enough to email.</p>"],
    ["Built-in alternatives", "<p>On Windows, you can open a photo in the Photos app and print it to ‘Microsoft Print to PDF’, but only one layout at a time. On iPhone, the Files app can turn selected images into a PDF. This tool works the same on every device and lets you set the order, page size and margins for many images at once.</p>"],
    ["Worked example: a visa or job application","<p>An application asks for your passport, a utility bill and a bank letter as one PDF under 5 MB. Photograph each page, choose the photos here, put them in the order the form lists, pick <em>A4</em> with a small margin and press Create PDF. If the result is over the limit, compress it with <a href=\"compress-pdf.html\">Compress PDF</a> on Balanced. Screenshots and PNG images work too; any transparent areas become white.</p>"],
  ],
  faqs: [
    ["Why is my PDF so large?", "Phone photos are often 3–5 MB each, and the PDF keeps them at full quality. Compress the photos first, or compress the finished PDF."],
  ],
},
"pdf-to-jpg": {
  sections: [
    ["Image sizes for an A4 page", "<table><tr><th>Quality</th><th>Image size</th><th>Good for</th></tr><tr><td>Screen (96 dpi)</td><td>794 × 1123 px</td><td>Previews, chat apps, web pages</td></tr><tr><td>Standard (150 dpi)</td><td>1240 × 1754 px</td><td>Sharing, slides, social media</td></tr><tr><td>Print (300 dpi)</td><td>2480 × 3508 px</td><td>Printing and zooming into detail</td></tr></table>"],
    ["Common uses", "<ul><li>Post a page of a report or a flyer on Instagram, LinkedIn or WhatsApp, which don't show PDFs inline.</li><li>Put a page into a PowerPoint or Keynote slide.</li><li>Upload a document to a form that only accepts images.</li><li>Make thumbnails of a document's pages for a website.</li></ul>"],
    ["If something goes wrong", "<ul><li><strong>Text looks blurry:</strong> choose a higher quality, or PNG, which keeps edges crisp.</li><li><strong>Files are too big:</strong> choose JPG and Screen or Standard quality.</li><li><strong>The background is white instead of transparent:</strong> pages are drawn on white, like paper.</li></ul>"],
    ["Step by step: one page for social media","<ol><li>Choose the PDF and type the page number in Pages, for example 1 for a cover or flyer.</li><li>Pick JPG and Standard quality, which gives 1240 × 1754 pixels for an A4 page.</li><li>Press Convert to images and download it.</li><li>For an Instagram post, crop or resize it to 1080 × 1350 with the <a href=\"image-resizer.html\">image resizer</a>.</li></ol><p>For several pages, download them all as a ZIP; each image is named after the PDF and its page number.</p>"],
  ],
  faqs: [
    ["Can I convert just one page?", "Yes. Type the page number in the Pages box, for example 3, then press Convert to images."],
  ],
},
"word-to-pdf": {
  sections: [
    ["Why send a PDF instead of a Word file", "<p>A PDF looks the same on every device and can't be changed by accident, which is why employers, landlords and official forms usually ask for one. Fonts, spacing and page breaks in a Word file can shift on someone else's computer; a PDF keeps them fixed.</p>"],
    ["On a phone", "<ul><li><strong>Android (Chrome):</strong> press Save as PDF, then choose <em>Save as PDF</em> as the printer and tap the download icon.</li><li><strong>iPhone and iPad (Safari):</strong> press Save as PDF, then in the print preview tap the Share button and choose <em>Save to Files</em>.</li></ul>"],
    ["Getting a clean PDF", "<ul><li>In Chrome's print window, open <em>More settings</em> and untick <em>Headers and footers</em> to remove the date and web address the browser adds.</li><li>Choose the paper size your recipient expects: A4 in the UK, Letter in the US.</li><li>If the document uses an unusual font that isn't installed on your device, a similar font is used instead. For an exact match, export from Word itself.</li></ul>"],
    ["What carries over from Word","<p>Headings, paragraphs, bold, italic and underlined text, bulleted and numbered lists, tables, images and links all appear in the PDF. Footnotes and endnotes are placed at the end of the document. Text boxes, shapes, page headers and footers, comments and exact page breaks aren't carried over, so for a CV or letter with a designed layout, use Word's own <em>Save as PDF</em> if you can.</p>"],
  ],
  faqs: [
    ["Why does my PDF show the date and a web address?", "Your browser adds them. In the print window, open More settings and untick Headers and footers."],
  ],
},
"pdf-to-excel": {
  sections: [
    ["Worked example: a bank statement", "<ol><li>Download the statement from online banking as a PDF. Don't use a scan or screenshot.</li><li>Convert it here with <em>All pages in one sheet</em>, so every transaction ends up in one list.</li><li>In Excel or Google Sheets, delete the heading rows above the transactions on each page.</li><li>Add a Category column, then use a filter or pivot table to total your spending by category.</li></ol><p>Amounts like 2,450.00, £12.50 and (35.00) become real numbers, with brackets turned into negatives, so totals work straight away.</p>"],
    ["Tidying up in Excel", "<ul><li><strong>Dates stay as text</strong> so that 01/03/2026 isn't misread as 3 January. To turn them into dates, select the column and use <em>Data → Text to Columns → Date: DMY</em>.</li><li><strong>‘CR’ and ‘DR’ markers</strong> after amounts are kept as text. Use Find and Replace to remove them, then put a minus sign on debits.</li><li><strong>A description wrapped onto two lines</strong> in the PDF can become two rows. Join them by hand, or filter out rows with no amount.</li></ul>"],
    ["What converts well","<ul><li><strong>Works well:</strong> bank and credit card statements, invoices, price lists, timetables and reports with clear columns.</li><li><strong>Needs tidying:</strong> pages with several tables side by side, or long descriptions that wrap onto two lines.</li><li><strong>Won't work:</strong> scanned pages and photos, which have no text, and charts, which are drawings rather than numbers.</li></ul>"],
  ],
  faqs: [
    ["Can I convert a scanned bank statement?", "Not directly. A scan has no text to read. Run it through OCR first, or download the statement again as a PDF from online banking."],
  ],
},
"image-compressor": {
  sections: [
    ["Recommended settings", "<table><tr><th>Use</th><th>Max width</th><th>Quality</th></tr><tr><td>Email attachment</td><td>1920 px</td><td>70%</td></tr><tr><td>Website or blog image</td><td>1280–1920 px</td><td>65–75%, or WebP</td></tr><tr><td>Profile picture</td><td>800 px</td><td>75%</td></tr><tr><td>Form with a size limit</td><td>Any</td><td>Aim for a file size</td></tr></table>"],
    ["How compression works", "<p>JPG and WebP are ‘lossy’ formats: they make files smaller by discarding detail the eye is unlikely to notice, and the quality setting controls how much. At 70% or above, most photos look the same as the original on screen. Below about 50%, you start to see blocky patches in smooth areas like sky. PNG is lossless, which is why PNG photos are so big; saving them as JPG or WebP makes the biggest difference.</p>"],
    ["Privacy bonus: location data removed", "<p>Phone photos often contain hidden details such as the camera model, date and the exact GPS location where they were taken. Compressed images are redrawn from scratch, so that information isn't copied into the new file. That makes this a simple way to remove location data before posting photos online.</p>"],
    ["JPG or WebP?","<p>WebP files are usually noticeably smaller than JPG at the same quality, and every current major browser shows them, so WebP is ideal for your own website. Some older software and many upload forms still only accept JPG or PNG, though. For anything you're attaching to a form or sending to someone else, JPG is the safe choice.</p>"],
  ],
  faqs: [
    ["Does compressing remove the photo's location?", "Yes. The new file is drawn from the pixels only, so GPS location and camera details from the original aren't included."],
  ],
},
"image-resizer": {
  sections: [
    ["Pixels, file size and DPI", "<p>Resizing changes the number of pixels, which is what decides how sharp an image looks and, with compression, how big the file is. The DPI (dots per inch) setting only tells a printer how large to print it: a 3000-pixel-wide image prints 10 inches wide at 300 dpi or 20 inches wide at 150 dpi, with exactly the same file. To make a file smaller to upload, reduce the pixels here or use the <a href=\"image-compressor.html\">image compressor</a>.</p>"],
    ["Sizes for social media", "<table><tr><th>Where</th><th>Size (pixels)</th></tr><tr><td>Instagram square post</td><td>1080 × 1080</td></tr><tr><td>Instagram portrait post</td><td>1080 × 1350</td></tr><tr><td>Instagram and TikTok stories</td><td>1080 × 1920</td></tr><tr><td>YouTube thumbnail</td><td>1280 × 720</td></tr><tr><td>Link previews (Facebook, LinkedIn)</td><td>1200 × 630</td></tr></table><p>These are widely used sizes; platforms change their guidance from time to time, so check before an important campaign.</p>"],
    ["Making images bigger", "<p>Enlarging spreads the same detail over more pixels, so a small image made bigger looks soft. Up to about 150% usually looks fine; beyond that, start from a larger original if you can.</p>"],
    ["Sizes for printing","<table><tr><th>Print</th><th>Pixels at 300 dpi</th></tr><tr><td>6 × 4 inch photo</td><td>1800 × 1200</td></tr><tr><td>A5</td><td>1748 × 2480</td></tr><tr><td>A4</td><td>2480 × 3508</td></tr></table><p>At 300 dpi prints look sharp up close. For posters seen from a distance, 150 dpi is usually enough, which halves the pixels needed on each side.</p>"],
  ],
  faqs: [
    ["How do I resize a photo for a UK passport or ID form?", "Check the form's own size rules. GOV.UK's online passport service, for example, asks for photos at least 600 pixels wide and 750 pixels tall. Enter the required size with Keep proportions ticked."],
  ],
},
"take-home-pay": {
  sections: [
    ["What happens to a pay rise", "<table><tr><th>Pay rise</th><th>Extra take-home a year</th><th>You keep</th></tr><tr><td>£45,000 → £50,000</td><td>£3,600.00</td><td>72%</td></tr><tr><td>£50,000 → £55,000</td><td>£2,937.80</td><td>58.8%</td></tr><tr><td>£100,000 → £110,000</td><td>£3,800.00</td><td>38%</td></tr></table><p>Below £50,270 each extra pound loses 20% income tax and 8% National Insurance. Above it, 40% tax and 2% National Insurance. Between £100,000 and £125,140 the personal allowance is withdrawn, so the effective rate on that band is 60% tax plus 2% National Insurance. Figures assume no pension, England, Wales or Northern Ireland, 2026/27.</p>"],
    ["Understanding your tax code", "<ul><li><strong>1257L</strong> is the standard code: £12,570 of tax-free pay a year.</li><li><strong>W1, M1 or X</strong> after the code means an emergency code: tax is worked out on each payment on its own, and you may pay too much until it's corrected.</li><li><strong>BR</strong> means all pay is taxed at 20%, often used for a second job.</li><li><strong>0T</strong> means no tax-free allowance.</li></ul><p>If your code looks wrong, check it in your personal tax account on GOV.UK or the HMRC app.</p>"],
    ["How pension contributions are taxed", "<p>With a <strong>net pay</strong> scheme, which this calculator models, contributions come out before income tax. On £35,000, paying 5% (£1,750 a year) reduces take-home pay by only £1,400, because tax relief covers the rest. With <strong>relief at source</strong>, you pay from taxed pay and the provider adds 20% basic-rate relief; higher-rate taxpayers claim the rest through Self Assessment. <strong>Salary sacrifice</strong> also saves National Insurance. Your payslip or pension provider will tell you which one you have.</p>"],
  ],
  faqs: [
    ["Why is my payslip different from the calculator?", "Common reasons are an emergency or adjusted tax code, student loan repayments, salary sacrifice, benefits in kind, or pay that changes from month to month. The calculator assumes a steady salary and a 1257L code."],
  ],
},
"vat-calculator": {
  sections: [
    ["Quick reference", "<table><tr><th>Calculation</th><th>Example at 20%</th></tr><tr><td>Add VAT: × 1.2</td><td>£50 → £60.00</td></tr><tr><td>Remove VAT: ÷ 1.2</td><td>£84 → £70.00 (VAT £14.00)</td></tr><tr><td>VAT in a gross price: ÷ 6</td><td>£84 → £14.00 VAT</td></tr><tr><td>At 5%: × 1.05 or ÷ 1.05</td><td>£105 → £100.00 (VAT £5.00)</td></tr></table><p>The ‘divide by 6’ shortcut works because at 20% VAT is one sixth of the price including VAT. At 5% it is one twenty-first.</p>"],
    ["Zero-rated, exempt and outside the scope", "<p>These sound similar but work differently. <strong>Zero-rated</strong> goods, such as most food and children's clothes, are VAT-able at 0%: businesses still record them and can reclaim VAT on related costs. <strong>Exempt</strong> items, such as most insurance and some education and health services, have no VAT at all, and the business usually can't reclaim VAT on related costs. <strong>Outside the scope</strong> covers things that aren't business supplies at all. GOV.UK lists which applies to what.</p>"],
    ["When a business must register", "<p>A UK business must register for VAT when its VAT-taxable turnover goes over the registration threshold in any rolling 12 months. The threshold was raised to £90,000 in April 2024; check GOV.UK for the current figure before relying on it. Businesses below the threshold can register voluntarily.</p>"],
    ["VAT on everyday purchases","<ul><li><strong>20% (standard):</strong> most goods and services, including adult clothing, electronics, restaurant meals and hot takeaway food.</li><li><strong>5% (reduced):</strong> domestic energy such as home gas and electricity, and children's car seats.</li><li><strong>0% (zero-rated):</strong> most food from shops, children's clothes, and books and newspapers, including e-books.</li></ul><p>A VAT-registered business can usually reclaim the VAT it pays on business purchases if it has a valid VAT invoice, but not on everything; for example, VAT on entertaining clients generally can't be reclaimed. HMRC's guidance on GOV.UK covers the details.</p>"],
  ],
  faqs: [
    ["How do I work out the VAT in a price that includes VAT?", "Divide the price by 6 at the 20% rate. For £84 including VAT, the VAT is £14 and the price before VAT is £70."],
  ],
},
"loan-calculator": {
  sections: [
    ["How the term changes the cost", "<table><tr><th>£10,000 at 6.9% APR</th><th>Monthly</th><th>Total interest</th></tr><tr><td>3 years</td><td>£308.31</td><td>£1,099.30</td></tr><tr><td>5 years</td><td>£197.54</td><td>£1,852.43</td></tr><tr><td>7 years</td><td>£150.44</td><td>£2,636.83</td></tr></table><p>Stretching the same loan from 3 to 7 years halves the monthly payment but more than doubles the interest. The same pattern applies to mortgages: £200,000 at 4.5% costs £1,111.66 a month over 25 years and £1,013.37 over 30 years, but the extra 5 years add about £31,300 of interest.</p>"],
    ["APR and representative APR", "<p>APR includes interest and compulsory fees, so it's the fairest way to compare loans. A <strong>representative</strong> APR in an advert only has to be offered to at least 51% of successful applicants; the rate you're offered depends on your credit record and can be higher. Use the rate in your actual quote for the most accurate figures.</p>"],
    ["Paying off early", "<p>Overpaying reduces the balance that interest is charged on, which is why even small regular overpayments shorten a loan. For personal loans covered by the Consumer Credit Act you have the right to repay early, though the lender can charge a limited fee. Many mortgages allow overpayments of up to 10% a year without a charge during a fixed rate. Check your agreement before overpaying.</p><p>To clear a personal loan completely, ask the lender for a <strong>settlement figure</strong>. Under the <a href=\"https://www.legislation.gov.uk/uksi/2004/1483\">Consumer Credit (Early Settlement) Regulations 2004</a> you get a rebate of the interest you haven't yet been charged, but the lender can usually add up to 58 days of interest, and some fixed-rate loans also carry a small fee. Mortgages and some other loans follow their own terms.</p>"],
  ],
  faqs: [
    ["Is a longer loan term better?", "It lowers the monthly payment but increases the total interest. Choose the shortest term whose monthly payment you can comfortably afford."],
  ],
},
"percentage-calculator": {
  sections: [
    ["Everyday examples", "<table><tr><th>Question</th><th>Working</th><th>Answer</th></tr><tr><td>25% off £80</td><td>£80 × 0.75</td><td>£60</td></tr><tr><td>A 12.5% tip on £48</td><td>£48 × 0.125</td><td>£6</td></tr><tr><td>45 out of 60 in a test</td><td>45 ÷ 60 × 100</td><td>75%</td></tr><tr><td>Rent up from £950 to £1,000</td><td>(1,000 − 950) ÷ 950 × 100</td><td>5.26% increase</td></tr></table>"],
    ["Reverse percentages", "<p>To find the price before a percentage was added, divide instead of subtracting. If a price is £120 after a 20% rise, the original was £120 ÷ 1.2 = £100, not £120 − 20% = £96. The same works for discounts: if £60 is 25% off, the full price was £60 ÷ 0.75 = £80.</p>"],
    ["Percent versus percentage points", "<p>When an interest rate rises from 4% to 5%, it has gone up by 1 percentage point, but by 25% in relative terms, because 1 is a quarter of 4. News reports and loan offers mix these up, so check which one is meant.</p>"],
    ["Mental maths shortcuts", "<ul><li>10%: move the decimal point one place left. 10% of £230 is £23.</li><li>5%: half of 10%. 5% of £230 is £11.50.</li><li>Swap them round: 8% of 50 is the same as 50% of 8, which is 4.</li></ul>"],
    ["Percentages that stack","<p>Two discounts don't add up. A coat with 20% off, then a further 10% off at the till, costs £100 × 0.8 × 0.9 = £72, which is 28% off in total, not 30%. Interest that compounds works the same way in reverse: 5% a year for two years grows £1,000 to £1,102.50, not £1,100. In a spreadsheet, to show each row as a percentage of a total in cell A10, use <code>=A2/A$10</code> and format the column as a percentage.</p>"],
  ],
  faqs: [
    ["How do I find the original price before a percentage increase?", "Divide the new price by 1 plus the percentage as a decimal. After a 20% rise to £120, the original price was £120 ÷ 1.2 = £100."],
  ],
},
"word-counter": {
  sections: [
    ["Common limits", "<table><tr><th>Where</th><th>Limit</th></tr><tr><td>Post on X (Twitter)</td><td>280 characters</td></tr><tr><td>Single text message (SMS)</td><td>160 characters; longer messages are split</td></tr><tr><td>Search result description (meta description)</td><td>About 155–160 characters before it's cut off</td></tr><tr><td>UCAS personal statement</td><td>Up to 4,000 characters including spaces (check UCAS for the current format)</td></tr><tr><td>A 5-minute speech</td><td>About 650 words at 130 words a minute</td></tr></table>"],
    ["Why counts differ between apps", "<p>Word processors don't all count the same way. Microsoft Word treats a hyphenated word like ‘well-known’ as one word, and so does this counter. Some tools count numbers, symbols or URLs differently, and some count an em dash with spaces around it as a word. If you have a strict limit, use the counter your teacher, publisher or form uses, and keep a small margin.</p>"],
    ["Cutting words without losing meaning", "<ul><li>Remove filler such as ‘very’, ‘really’, ‘in order to’ (use ‘to’) and ‘due to the fact that’ (use ‘because’).</li><li>Turn passive sentences active: ‘the report was written by the team’ becomes ‘the team wrote the report’.</li><li>Cut repeated points, and introductions that only say what you're about to say.</li></ul>"],
    ["Writing to a word count","<p>Planning a word budget before you start saves cutting later. For a 2,000-word essay, a common split is about 200 words of introduction, three or four main sections of 400 to 450 words each, and about 200 words of conclusion. Many universities allow a margin, often 10% either way, and leave out references and the bibliography from the count, but rules vary between courses, so check your module handbook. Paste each section in as you go to keep track.</p>"],
  ],
  faqs: [
    ["How many words is 4,000 characters?", "Roughly 550 to 700 words, depending on how long your words are. Paste your text to see the exact character count."],
  ],
},
"password-generator": {
  sections: [
    ["How strong is strong enough?", "<table><tr><th>Password</th><th>Randomness</th></tr><tr><td>8 random characters (all types)</td><td>about 51 bits</td></tr><tr><td>12 random characters</td><td>about 77 bits</td></tr><tr><td>16 random characters</td><td>about 103 bits</td></tr><tr><td>4 random words</td><td>about 52 bits</td></tr><tr><td>6 random words</td><td>about 78 bits</td></tr></table><p>Each extra bit doubles the number of guesses needed. For accounts that matter, aim for 60 bits or more, and use a different password for every site.</p>"],
    ["How passwords are actually stolen", "<p>Most accounts aren't broken into by guessing. Attackers take email and password pairs leaked from one website and try them on others, which only works if you reuse passwords. Phishing emails and fake login pages are the other big cause. A unique password per site, kept in a password manager, plus two-step verification, protects against nearly all of this. You can check whether your email address appears in known leaks at <a href=\"https://haveibeenpwned.com/\" rel=\"noopener\">Have I Been Pwned</a>.</p>"],
    ["Following NCSC advice", "<p>The UK National Cyber Security Centre recommends three random words for passwords you need to remember, a password manager for everything else, and turning on two-step verification for email and banking. Use passphrase mode for the first, and random characters for passwords your manager stores.</p>"],
  ],
  faqs: [
    ["Should I use a password manager?", "Yes, for most people. The ones built into browsers and phones, from Apple, Google and Microsoft, are free and sync across your devices, so every site can have its own long random password."],
  ],
},
};
