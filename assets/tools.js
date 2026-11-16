
const SITE = "ToolsBravo"; // change this to your brand name
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const num = v => parseFloat(String(v).replace(/[,£\s]/g, ""));
const gbp = n => isFinite(n) ? n.toLocaleString("en-GB", {style: "currency", currency: "GBP"}) : "–";
const nf = (n, d = 2) => isFinite(n) ? n.toLocaleString("en-GB", {maximumFractionDigits: d}) : "–";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const stats = a => a.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
const copyFeedback = new WeakMap();
function copy(text, btn) {
  let state = copyFeedback.get(btn);
  if (!state) { state = {label: btn.textContent, timer: null, revision: 0}; copyFeedback.set(btn, state); }
  const revision = ++state.revision;
  const done = message => {
    if (revision !== state.revision) return;
    clearTimeout(state.timer); btn.textContent = message;
    state.timer = setTimeout(() => { btn.textContent = state.label; }, 1200);
  };
  if (!text) return done("Nothing to copy");
  if (!navigator.clipboard || !navigator.clipboard.writeText) return done("Copy unavailable");
  try { Promise.resolve(navigator.clipboard.writeText(text)).then(() => done("Copied"), () => done("Copy failed")); }
  catch { done("Copy failed"); }
}
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const dur = m => { const y = Math.floor(m / 12), r = m % 12; return [y && plural(y, "year"), r && plural(r, "month")].filter(Boolean).join(" ") || "0 months"; };
let cleanup = null;

// Two-way text tool used by Base64 and URL encoder
function twoWay(enc, dec, encLabel, decLabel, errMsg) {
  return {
    ui: `<label for="tw-in">Input</label><textarea id="tw-in" class="mono" placeholder="Paste text here"></textarea>
      <div class="btns"><button class="primary" data-a="e">${encLabel}</button><button data-a="d">${decLabel}</button><button data-a="clear">Clear text</button></div>
      <label for="tw-out">Result</label><textarea id="tw-out" class="mono" readonly></textarea>
      <div class="btns"><button data-a="c">Copy result</button><button data-a="r" disabled>Use result as input</button></div><p class="msg" aria-live="polite"></p>`,
    init(el) {
      const i = $("#tw-in", el), o = $("#tw-out", el), m = $(".msg", el), reuse = $('[data-a="r"]', el);
      i.addEventListener("input", () => { o.value = ""; reuse.disabled = true; m.textContent = ""; m.className = "msg"; });
      el.addEventListener("click", e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === "c") return copy(o.value, e.target);
        if (a === "clear") { i.value = ""; o.value = ""; reuse.disabled = true; m.textContent = ""; m.className = "msg"; i.focus(); return; }
        if (a === "r") { i.value = o.value; o.value = ""; reuse.disabled = true; m.textContent = ""; m.className = "msg"; i.focus(); return; }
        m.textContent = ""; m.className = "msg";
        try { o.value = a === "e" ? enc(i.value) : dec(i.value); reuse.disabled = !o.value; }
        catch { o.value = ""; reuse.disabled = true; m.textContent = errMsg; m.className = "msg err"; }
      });
    }
  };
}

const UNITS = {
  "Data size": {Bytes: 1, Kilobytes: 1000, Megabytes: 1000000, Gigabytes: 1000000000, Terabytes: 1000000000000, Kibibytes: 1024, Mebibytes: 1048576, Gibibytes: 1073741824, Tebibytes: 1099511627776},
  Power: {Watts: 1, Kilowatts: 1000, Megawatts: 1000000},
  Energy: {Joules: 1, Kilojoules: 1000, "Watt-hours": 3600, "Kilowatt-hours": 3600000},
  Angle: {Degrees: 1, Radians: 180 / Math.PI, Turns: 360, Gradians: .9},
  Pressure: {Pascals: 1, Kilopascals: 1000, Bar: 100000, Millibar: 100, PSI: 6894.757293168},
  Time: {Milliseconds: .001, Seconds: 1, Minutes: 60, Hours: 3600, Days: 86400, Weeks: 604800},
  Area: {"Square millimetres": .000001, "Square centimetres": .0001, "Square metres": 1, Hectares: 10000, "Square kilometres": 1000000, "Square inches": .00064516, "Square feet": .09290304, "Square yards": .83612736, Acres: 4046.8564224, "Square miles": 2589988.110336},
  Length: {Millimetres: .001, Centimetres: .01, Metres: 1, Kilometres: 1000, Inches: .0254, Feet: .3048, Yards: .9144, Miles: 1609.344},
  Weight: {Grams: .001, Kilograms: 1, Ounces: .028349523125, Pounds: .45359237, Stone: 6.35029318, Tonnes: 1000},
  Volume: {Millilitres: .001, Litres: 1, "UK pints": .56826125, "UK gallons": 4.54609, "US cups": .2365882365, "US gallons": 3.785411784},
  Temperature: {Celsius: 0, Fahrenheit: 0, Kelvin: 0},
  Speed: {"Metres per second": 1, "Kilometres per hour": 1 / 3.6, "Miles per hour": .44704, Knots: .514444}
};
const toC = {Celsius: x => x, Fahrenheit: x => (x - 32) * 5 / 9, Kelvin: x => x - 273.15};
const fromC = {Celsius: c => c, Fahrenheit: c => c * 9 / 5 + 32, Kelvin: c => c + 273.15};

function ukPay(gross, pct) {
  const pen = gross * pct / 100, inc = gross - pen; // Assumes pension reduces taxable pay but not NI pay (net-pay arrangement).
  const pa = inc > 100000 ? Math.max(0, 12570 - (inc - 100000) / 2) : 12570;
  const ti = Math.max(0, inc - pa);
  const tax = Math.min(ti, 37700) * .2 + Math.max(0, Math.min(ti - 37700, 87440)) * .4 + Math.max(0, ti - 125140) * .45; // England/Wales/Northern Ireland; not Scottish income tax.
  const ni = Math.max(0, Math.min(gross, 50270) - 12570) * .08 + Math.max(0, gross - 50270) * .02;
  return {gross, pen, tax, ni, net: gross - pen - tax - ni};
}
function payoff(bal, r, pay) {
  let months = 0, interest = 0;
  while (bal > .005 && months < 1200) { const i = bal * r; interest += i; bal = bal + i - pay; months++; }
  return {months, interest};
}

/* ---------- PDF, Word and image tools: shared helpers ----------
   Everything runs on the visitor's device. Libraries are self-hosted in assets/vendor
   and loaded only when a file tool needs them. */
const VENDOR = "assets/vendor/";
const vendorUrl = f => new URL(VENDOR + f, document.baseURI).href;
const loadedLibs = {};
const loadScript = f => loadedLibs[f] ||= new Promise((ok, fail) => {
  const s = document.createElement("script"); s.src = vendorUrl(f); s.onload = ok;
  s.onerror = () => { delete loadedLibs[f]; fail(new Error("A required component could not be loaded. Check your connection and try again.")); };
  document.head.appendChild(s);
});
const pdfLib = () => loadScript("pdf-lib.min.js").then(() => window.PDFLib);
const zipLib = () => loadScript("fflate.min.js").then(() => window.fflate);
const wordLib = () => loadScript("mammoth.browser.min.js").then(() => window.mammoth);
const pdfJs = () => loadedLibs.pdfjs ||= import(vendorUrl("pdf.min.js")).then(m => { m.GlobalWorkerOptions.workerSrc = vendorUrl("pdf.worker.min.js"); return m; });
const fsize = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB";
const baseName = f => f.name.replace(/\.[^.]+$/, "") || "file";
const IMG_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"};
function saveBlob(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
const say = (o, msg, isErr) => { o.className = isErr ? "err" : "note"; o.textContent = msg; };
const busy = (btn, on, label) => {
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Working…"; btn.disabled = true; }
  else { if (btn.dataset.label) btn.textContent = btn.dataset.label; btn.disabled = false; }
};
// A file picker that also accepts drag and drop: the real input covers the whole zone.
const dropUI = (id, accept, label, multiple) => `<div class="drop"><input id="${id}" type="file" accept="${accept}"${multiple ? " multiple" : ""} aria-label="${label}"><span class="drop-icon" aria-hidden="true">⇪</span><strong>${label}</strong><span>or drag and drop ${multiple ? "files" : "a file"} here · files stay on your device</span></div>`;
function wireDrop(el, id, onFiles) {
  const input = $("#" + id, el), zone = input.parentElement;
  input.addEventListener("change", () => { const f = [...input.files]; input.value = ""; if (f.length) onFiles(f); });
  ["dragenter", "dragover"].forEach(t => zone.addEventListener(t, () => zone.classList.add("over")));
  ["dragleave", "drop"].forEach(t => zone.addEventListener(t, () => zone.classList.remove("over")));
}
// Reorderable list of chosen files.
function fileListUI(ul, files) {
  ul.innerHTML = files.map((f, i) => `<li><span class="fl-name">${esc(f.name)}</span><span class="fl-size">${fsize(f.size)}</span><span class="fl-btns"><button type="button" data-a="up" data-i="${i}" aria-label="Move ${esc(f.name)} up"${i ? "" : " disabled"}>↑</button><button type="button" data-a="down" data-i="${i}" aria-label="Move ${esc(f.name)} down"${i < files.length - 1 ? "" : " disabled"}>↓</button><button type="button" data-a="rm" data-i="${i}" aria-label="Remove ${esc(f.name)}">✕</button></span></li>`).join("");
}
function wireFileList(ul, files, changed) {
  ul.addEventListener("click", e => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const i = +b.dataset.i;
    if (b.dataset.a === "rm") files.splice(i, 1);
    else { const j = b.dataset.a === "up" ? i - 1 : i + 1; [files[i], files[j]] = [files[j], files[i]]; }
    changed();
  });
}
// Output files: individual downloads plus a ZIP when there is more than one.
function showResults(o, items) {
  $$("img.fl-thumb", o).forEach(img => URL.revokeObjectURL(img.src));
  const used = new Set();
  items.forEach(it => { let n = it.name, k = 2; while (used.has(n)) n = it.name.replace(/(\.[^.]+)?$/, `-${k++}$1`); it.name = n; used.add(n); });
  o.innerHTML = `<ul class="file-list results">${items.map((it, i) => `<li>${it.thumb ? `<img class="fl-thumb" src="${URL.createObjectURL(it.blob)}" alt="">` : ""}<span class="fl-name">${esc(it.name)}</span><span class="fl-size">${esc(it.note || fsize(it.blob.size))}</span><span class="fl-btns"><button type="button" class="primary" data-dl="${i}">Download</button></span></li>`).join("")}</ul>${items.length > 1 ? `<div class="btns"><button type="button" class="primary" data-zip>Download all as ZIP</button></div>` : ""}`;
  o.onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dl) return saveBlob(items[+b.dataset.dl].blob, items[+b.dataset.dl].name);
    if ("zip" in b.dataset) {
      busy(b, true, "Zipping…");
      try {
        const {zipSync} = await zipLib(), files = {};
        for (const it of items) files[it.name] = [new Uint8Array(await it.blob.arrayBuffer()), {level: 0}];
        saveBlob(new Blob([zipSync(files)], {type: "application/zip"}), "toolsbravo-files.zip");
      } finally { busy(b, false); }
    }
  };
}
// "1-3, 5, 8-" → [[0,1,2],[4],[7,…,last]] (zero-based page indexes)
function pageGroups(text, max) {
  const groups = [];
  for (const part of String(text).split(",").map(s => s.trim()).filter(Boolean)) {
    const m = /^(\d*)\s*(-)?\s*(\d*)$/.exec(part);
    if (!m || (!m[1] && !m[3])) throw new Error(`"${part}" is not a page or range. Use numbers like 1-3, 5, 8-.`);
    const a = m[1] ? +m[1] : 1, b = m[2] ? (m[3] ? +m[3] : max) : a;
    if (a < 1 || b > max || a > b) throw new Error(`"${part}" is outside pages 1 to ${max}.`);
    groups.push(Array.from({length: b - a + 1}, (_, i) => a - 1 + i));
  }
  if (!groups.length) throw new Error("Enter the pages to use, for example 1-3, 5.");
  return groups;
}
async function openPdf(file) {
  const {PDFDocument} = await pdfLib();
  try { return await PDFDocument.load(await file.arrayBuffer()); }
  catch (e) { throw new Error(/encrypt/i.test(e.message) ? `${file.name} is password-protected. Remove the password first, then try again.` : `${file.name} could not be read as a PDF. It may be damaged.`); }
}
async function openPdfJs(file) {
  const pdfjs = await pdfJs();
  try { return await pdfjs.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false}).promise; }
  catch (e) { throw new Error(e && e.name === "PasswordException" ? `${file.name} is password-protected. Remove the password first, then try again.` : `${file.name} could not be read as a PDF. It may be damaged.`); }
}
const savePdf = async (doc, name) => { const b = new Blob([await doc.save()], {type: "application/pdf"}); saveBlob(b, name); return b; };
const canvasBlob = (c, type, q) => new Promise((ok, fail) => c.toBlob(b => b ? ok(b) : fail(new Error("Your browser could not create the image.")), type, q));
// Draws an image file onto a canvas (respecting phone photo rotation) and encodes it.
async function convertImage(file, {type, quality = .92, width, height, maxWidth}) {
  let bmp;
  try { bmp = await createImageBitmap(file, {imageOrientation: "from-image"}); }
  catch { throw new Error(`${file.name} could not be opened. ${/heic|heif/i.test(file.name + file.type) ? "HEIC photos aren't supported by your browser; export them as JPEG first." : "Use a JPG, PNG, WebP, GIF or BMP image."}`); }
  let w = bmp.width, h = bmp.height;
  if (width || height) { w = Math.round(width || w * height / h); h = Math.round(height || h * width / bmp.width); }
  if (maxWidth && w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
  if (w < 1 || h < 1 || w > 16384 || h > 16384) throw new Error("Choose a size between 1 and 16,384 pixels.");
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); }
  x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const blob = await canvasBlob(c, type, quality);
  if (blob.type !== type) throw new Error(`Your browser can't save ${IMG_EXT[type].toUpperCase()} images. Choose another format.`);
  return {blob, w, h};
}
const xmlText = s => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
// Builds a minimal, valid .docx from paragraphs; null marks a page break.
async function makeDocx(paras) {
  const {zipSync, strToU8} = await zipLib();
  const body = paras.map(p => p === null ? `<w:p><w:r><w:br w:type="page"/></w:r></w:p>` : `<w:p><w:r><w:t xml:space="preserve">${xmlText(p)}</w:t></w:r></w:p>`).join("");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  };
  for (const k in files) files[k] = strToU8(files[k]);
  return new Blob([zipSync(files)], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
// Shared flow for the image converter, compressor and resizer. options(file, {type, q}) returns convertImage options.
function imageTool(el, p, options, showSaving) {
  let files = []; const go = $(`#${p}-go`, el), msg = $(`#${p}-msg`, el), type = $(`#${p}-type`, el), q = $(`#${p}-q`, el);
  if (q) { const upd = () => { $(`#${p}-qv`, el).textContent = q.value; $(`#${p}-qwrap`, el).hidden = !!type && type.value === "image/png"; }; q.oninput = upd; if (type) type.onchange = upd; upd(); }
  wireDrop(el, `${p}-in`, f => {
    files = f.filter(x => /^image\//.test(x.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(x.name));
    const fp = $(`#${p}-file`, el); fp.hidden = false;
    fp.textContent = files.length ? `${plural(files.length, "image")} · ${fsize(files.reduce((a, x) => a + x.size, 0))}` : "No images found in that selection.";
    go.disabled = !files.length; $(`#${p}-out`, el).innerHTML = "";
    say(msg, files.length ? "Ready. Choose your settings, then start." : "Choose JPG, PNG, WebP, GIF or BMP images.", !files.length);
  });
  go.onclick = async () => {
    busy(go, true, "Working…");
    try {
      const items = []; let before = 0, after = 0;
      for (const [i, f] of files.entries()) {
        say(msg, `Processing ${i + 1} of ${files.length}…`);
        const opt = await options(f, {type: type ? type.value : "image/jpeg", q: q ? +q.value / 100 : .92});
        const {blob, w, h} = await convertImage(f, opt);
        before += f.size; after += blob.size;
        const pct = Math.round((1 - blob.size / f.size) * 100);
        items.push({name: `${baseName(f)}.${IMG_EXT[opt.type]}`, blob, thumb: true,
          note: showSaving ? `${fsize(f.size)} → ${fsize(blob.size)} (${pct >= 0 ? `${pct}% smaller` : `${-pct}% larger`})` : `${w} × ${h} px · ${fsize(blob.size)}`});
      }
      showResults($(`#${p}-out`, el), items);
      if (!showSaving) say(msg, `${plural(items.length, "image")} ready.`);
      else if (after < before) say(msg, `Total ${fsize(before)} → ${fsize(after)}: ${Math.round((1 - after / before) * 100)}% smaller.`);
      else say(msg, "These images are already well compressed. Try a lower quality or a smaller maximum width.");
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
}
// Turns pdf.js text items into paragraphs using line positions.
function pdfParagraphs(items) {
  const lines = []; let cur = null;
  for (const it of items) {
    if (!("str" in it)) continue;
    const y = it.transform[5], hgt = Math.abs(it.transform[3]) || it.height || 10;
    if (!cur || Math.abs(y - cur.y) > hgt * .4) { cur = {y, h: hgt, text: ""}; lines.push(cur); }
    cur.text += it.str;
    if (it.hasEOL) cur = null;
  }
  const clean = lines.map(l => ({...l, text: l.text.replace(/\s+/g, " ").trim()})).filter(l => l.text);
  const paras = []; let p = null;
  clean.forEach((l, i) => {
    const gap = i ? clean[i - 1].y - l.y : 0;
    if (!p || gap > l.h * 1.9 || gap < 0) { p = [l.text]; paras.push(p); }
    else { const prev = p[p.length - 1]; if (/[a-z]-$/.test(prev) && /^[a-z]/.test(l.text)) p[p.length - 1] = prev.slice(0, -1) + l.text; else p.push(l.text); }
  });
  return paras.map(x => x.join(" "));
}

const TOOLS = [
/* ---------- PDF & IMAGE ---------- */
{id: "merge-pdf", cat: "files", name: "Merge PDF", desc: "Combine several PDF files into one, in the order you choose.",
 ui: `${dropUI("mp-in", "application/pdf,.pdf", "Choose PDF files", true)}<ol class="file-list" id="mp-list"></ol>
  <div class="btns"><button class="primary" id="mp-go" disabled>Merge PDFs</button><button id="mp-clear" disabled>Clear</button></div><p id="mp-msg" class="note" aria-live="polite">Add two or more PDFs. Use the arrows to set the order.</p>`,
 init(el) {
  const files = [], list = $("#mp-list", el), go = $("#mp-go", el), msg = $("#mp-msg", el);
  const changed = () => { fileListUI(list, files); go.disabled = files.length < 2; $("#mp-clear", el).disabled = !files.length; };
  wireDrop(el, "mp-in", f => { files.push(...f.filter(x => /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name))); changed(); });
  wireFileList(list, files, changed);
  $("#mp-clear", el).onclick = () => { files.length = 0; changed(); };
  go.onclick = async () => {
    busy(go, true, "Merging…");
    try {
      const {PDFDocument} = await pdfLib(), out = await PDFDocument.create();
      for (const f of files) { const src = await openPdf(f); (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p)); }
      const b = await savePdf(out, "merged.pdf");
      say(msg, `Done: ${plural(out.getPageCount(), "page")} from ${plural(files.length, "file")}, ${fsize(b.size)}. Your download has started.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "split-pdf", cat: "files", name: "Split PDF", desc: "Extract pages or split a PDF into separate files.",
 ui: `${dropUI("sp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="sp-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="sp-mode">How to split</label><select id="sp-mode"><option value="extract">Extract chosen pages into one PDF</option><option value="ranges">Make one PDF for each range</option><option value="every">Make one PDF for every page</option></select></div>
  <div><label for="sp-pages">Pages</label><input id="sp-pages" placeholder="e.g. 1-3, 5, 8-" autocomplete="off"></div></div>
  <div class="btns"><button class="primary" id="sp-go" disabled>Split PDF</button></div><p id="sp-msg" class="note" aria-live="polite">Choose a PDF to start.</p><div id="sp-out"></div>`,
 init(el) {
  let file = null, count = 0; const go = $("#sp-go", el), msg = $("#sp-msg", el), mode = $("#sp-mode", el), pages = $("#sp-pages", el);
  const sync = () => { pages.disabled = mode.value === "every"; };
  mode.onchange = sync; sync();
  wireDrop(el, "sp-in", async f => {
    file = f[0]; go.disabled = true; $("#sp-out", el).innerHTML = "";
    try { count = (await openPdf(file)).getPageCount(); const p = $("#sp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)} · ${plural(count, "page")}`; go.disabled = false; say(msg, "Choose how to split, then press Split PDF."); }
    catch (e) { file = null; say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Splitting…");
    try {
      const {PDFDocument} = await pdfLib(), src = await openPdf(file), base = baseName(file);
      const groups = mode.value === "every" ? Array.from({length: count}, (_, i) => [i]) : pageGroups(pages.value, count);
      const sets = mode.value === "extract" ? [groups.flat()] : groups, items = [];
      for (const idx of sets) {
        const out = await PDFDocument.create(); (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
        const label = idx.length === 1 ? `page-${idx[0] + 1}` : `pages-${idx[0] + 1}-${idx[idx.length - 1] + 1}`;
        items.push({name: `${base}-${label}.pdf`, blob: new Blob([await out.save()], {type: "application/pdf"}), note: plural(idx.length, "page")});
      }
      showResults($("#sp-out", el), items);
      say(msg, items.length === 1 ? "Your PDF is ready." : `${items.length} PDFs are ready. Download them one by one or all as a ZIP.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "rotate-pdf", cat: "files", name: "Rotate PDF", desc: "Turn every page, or just some pages, of a PDF the right way up.",
 ui: `${dropUI("rp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="rp-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="rp-angle">Rotate by</label><select id="rp-angle"><option value="90">90° clockwise</option><option value="180">180° (upside down)</option><option value="270">90° anticlockwise</option></select></div>
  <div><label for="rp-pages">Pages (leave blank for all)</label><input id="rp-pages" placeholder="e.g. 2, 4-6" autocomplete="off"></div></div>
  <div class="btns"><button class="primary" id="rp-go" disabled>Rotate and download</button></div><p id="rp-msg" class="note" aria-live="polite">Choose a PDF to start.</p>`,
 init(el) {
  let file = null; const go = $("#rp-go", el), msg = $("#rp-msg", el);
  wireDrop(el, "rp-in", async f => {
    file = f[0]; go.disabled = true;
    try { const n = (await openPdf(file)).getPageCount(); const p = $("#rp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)} · ${plural(n, "page")}`; go.disabled = false; say(msg, "Choose the rotation, then download."); }
    catch (e) { file = null; say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Rotating…");
    try {
      const {degrees} = await pdfLib(), doc = await openPdf(file), all = doc.getPages(), add = +$("#rp-angle", el).value;
      const idx = $("#rp-pages", el).value.trim() ? pageGroups($("#rp-pages", el).value, all.length).flat() : all.map((_, i) => i);
      new Set(idx).forEach(i => all[i].setRotation(degrees((all[i].getRotation().angle + add) % 360)));
      await savePdf(doc, `${baseName(file)}-rotated.pdf`);
      say(msg, `Rotated ${plural(new Set(idx).size, "page")}. Your download has started.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "delete-pdf-pages", cat: "files", name: "Delete PDF pages", desc: "Remove pages you don't need from a PDF.",
 ui: `${dropUI("dp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="dp-file" class="file-picked" hidden></p>
  <label for="dp-pages">Pages to delete</label><input id="dp-pages" placeholder="e.g. 2, 5-7" autocomplete="off">
  <div class="btns"><button class="primary" id="dp-go" disabled>Delete pages and download</button></div><p id="dp-msg" class="note" aria-live="polite">Choose a PDF to start.</p>`,
 init(el) {
  let file = null; const go = $("#dp-go", el), msg = $("#dp-msg", el);
  wireDrop(el, "dp-in", async f => {
    file = f[0]; go.disabled = true;
    try { const n = (await openPdf(file)).getPageCount(); const p = $("#dp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)} · ${plural(n, "page")}`; go.disabled = false; say(msg, "Enter the pages to remove."); }
    catch (e) { file = null; say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Removing…");
    try {
      const doc = await openPdf(file), n = doc.getPageCount(), del = [...new Set(pageGroups($("#dp-pages", el).value, n).flat())].sort((a, b) => b - a);
      if (del.length >= n) throw new Error("You can't delete every page. Leave at least one.");
      del.forEach(i => doc.removePage(i));
      await savePdf(doc, `${baseName(file)}-edited.pdf`);
      say(msg, `Removed ${plural(del.length, "page")}; ${plural(n - del.length, "page")} left. Your download has started.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "jpg-to-pdf", cat: "files", name: "JPG to PDF", desc: "Turn JPG, PNG and other images into one PDF.",
 ui: `${dropUI("ip-in", "image/*", "Choose images", true)}<ol class="file-list" id="ip-list"></ol>
  <div class="row"><div><label for="ip-size">Page size</label><select id="ip-size"><option value="fit">Same as each image</option><option value="a4">A4</option><option value="letter">US Letter</option></select></div>
  <div><label for="ip-orient">Orientation</label><select id="ip-orient"><option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
  <div><label for="ip-margin">Margin</label><select id="ip-margin"><option value="0">None</option><option value="20" selected>Small</option><option value="50">Large</option></select></div></div>
  <div class="btns"><button class="primary" id="ip-go" disabled>Create PDF</button><button id="ip-clear" disabled>Clear</button></div><p id="ip-msg" class="note" aria-live="polite">Add images. Each image becomes one page, in this order.</p>`,
 init(el) {
  const files = [], list = $("#ip-list", el), go = $("#ip-go", el), msg = $("#ip-msg", el);
  const changed = () => { fileListUI(list, files); go.disabled = !files.length; $("#ip-clear", el).disabled = !files.length; };
  wireDrop(el, "ip-in", f => { files.push(...f.filter(x => /^image\//.test(x.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(x.name))); changed(); });
  wireFileList(list, files, changed);
  $("#ip-clear", el).onclick = () => { files.length = 0; changed(); };
  go.onclick = async () => {
    busy(go, true, "Creating…");
    try {
      const {PDFDocument} = await pdfLib(), doc = await PDFDocument.create(), size = $("#ip-size", el).value, orient = $("#ip-orient", el).value, m = +$("#ip-margin", el).value;
      for (const f of files) {
        const png = /png$/i.test(f.type), {blob, w, h} = await convertImage(f, {type: png ? "image/png" : "image/jpeg", quality: .92});
        const bytes = new Uint8Array(await blob.arrayBuffer()), img = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        let pw = w * .75, ph = h * .75;
        if (size !== "fit") { [pw, ph] = size === "a4" ? [595.28, 841.89] : [612, 792]; if (orient === "landscape" || (orient === "auto" && w > h)) [pw, ph] = [ph, pw]; }
        else { pw += m * 2; ph += m * 2; }
        const page = doc.addPage([pw, ph]), k = Math.min((pw - m * 2) / w, (ph - m * 2) / h), dw = w * k, dh = h * k;
        page.drawImage(img, {x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh});
      }
      const b = await savePdf(doc, files.length === 1 ? `${baseName(files[0])}.pdf` : "images.pdf");
      say(msg, `Created a ${plural(files.length, "page")} PDF, ${fsize(b.size)}. Your download has started.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "pdf-to-jpg", cat: "files", name: "PDF to JPG", desc: "Save each PDF page as a JPG or PNG image.",
 ui: `${dropUI("pj-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="pj-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="pj-format">Image format</label><select id="pj-format"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>
  <div><label for="pj-dpi">Quality</label><select id="pj-dpi"><option value="96">Screen (96 dpi)</option><option value="150" selected>Standard (150 dpi)</option><option value="300">Print (300 dpi)</option></select></div>
  <div><label for="pj-pages">Pages (blank for all)</label><input id="pj-pages" placeholder="e.g. 1-3" autocomplete="off"></div></div>
  <div class="btns"><button class="primary" id="pj-go" disabled>Convert to images</button></div><p id="pj-msg" class="note" aria-live="polite">Choose a PDF to start.</p><div id="pj-out"></div>`,
 init(el) {
  let file = null, count = 0; const go = $("#pj-go", el), msg = $("#pj-msg", el);
  wireDrop(el, "pj-in", async f => {
    file = f[0]; go.disabled = true; $("#pj-out", el).innerHTML = "";
    try { const d = await openPdfJs(file); count = d.numPages; d.destroy(); const p = $("#pj-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)} · ${plural(count, "page")}`; go.disabled = false; say(msg, "Choose a format and quality, then convert."); }
    catch (e) { file = null; say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Converting…");
    try {
      const type = $("#pj-format", el).value, dpi = +$("#pj-dpi", el).value, doc = await openPdfJs(file), base = baseName(file);
      const idx = $("#pj-pages", el).value.trim() ? pageGroups($("#pj-pages", el).value, doc.numPages).flat() : Array.from({length: doc.numPages}, (_, i) => i);
      const items = [];
      for (const i of idx) {
        say(msg, `Rendering page ${i + 1} of ${doc.numPages}…`);
        const page = await doc.getPage(i + 1), v1 = page.getViewport({scale: 1}), scale = Math.min(dpi / 72, 8000 / Math.max(v1.width, v1.height)), vp = page.getViewport({scale});
        const c = document.createElement("canvas"); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        await page.render({canvasContext: x, viewport: vp}).promise; page.cleanup();
        items.push({name: `${base}-page-${i + 1}.${IMG_EXT[type]}`, blob: await canvasBlob(c, type, .9), thumb: true});
      }
      doc.destroy();
      showResults($("#pj-out", el), items);
      say(msg, `${plural(items.length, "image")} ready.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "pdf-to-word", cat: "files", name: "PDF to Word", desc: "Convert the text of a PDF into an editable Word document.",
 ui: `${dropUI("pw-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="pw-file" class="file-picked" hidden></p>
  <div class="btns"><button class="primary" id="pw-go" disabled>Convert to Word</button></div><p id="pw-msg" class="note" aria-live="polite">Choose a PDF to start.</p>
  <div id="pw-out" hidden><label for="pw-text">Extracted text</label><textarea id="pw-text" readonly></textarea><div class="btns"><button class="primary" id="pw-dl">Download .docx</button><button id="pw-copy">Copy text</button></div></div>`,
 init(el) {
  let file = null, docx = null; const go = $("#pw-go", el), msg = $("#pw-msg", el);
  wireDrop(el, "pw-in", f => { file = f[0]; $("#pw-out", el).hidden = true; const p = $("#pw-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)}`; go.disabled = false; say(msg, "Press Convert to Word."); });
  go.onclick = async () => {
    busy(go, true, "Converting…");
    try {
      const doc = await openPdfJs(file), paras = [];
      for (let i = 1; i <= doc.numPages; i++) {
        say(msg, `Reading page ${i} of ${doc.numPages}…`);
        const page = await doc.getPage(i); if (i > 1) paras.push(null);
        paras.push(...pdfParagraphs((await page.getTextContent()).items)); page.cleanup();
      }
      doc.destroy();
      const text = paras.filter(p => p !== null);
      if (!text.length) throw new Error("No text was found. This PDF is probably a scanned image, which needs OCR (text recognition) to convert.");
      docx = await makeDocx(paras);
      $("#pw-text", el).value = text.join("\n\n"); $("#pw-out", el).hidden = false;
      say(msg, `Converted ${plural(text.length, "paragraph")}. Text and paragraphs are kept; images, tables and exact layout are not.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
  $("#pw-dl", el).onclick = () => docx && saveBlob(docx, `${baseName(file)}.docx`);
  $("#pw-copy", el).onclick = e => copy($("#pw-text", el).value, e.target);
 }},
{id: "word-to-pdf", cat: "files", name: "Word to PDF", desc: "Turn a Word document (.docx) into a PDF.",
 ui: `${dropUI("wp-in", ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Choose a Word file (.docx)", false)}<p id="wp-file" class="file-picked" hidden></p>
  <p id="wp-msg" class="note" aria-live="polite">Choose a .docx file to preview it.</p>
  <div id="wp-out" hidden><div class="btns"><button class="primary" id="wp-print">Save as PDF</button></div><p class="note">In the print window, choose <strong>Save as PDF</strong> (or Microsoft Print to PDF) as the printer.</p><iframe id="wp-frame" class="doc-preview" title="Document preview"></iframe></div>`,
 init(el) {
  const msg = $("#wp-msg", el), frame = $("#wp-frame", el);
  wireDrop(el, "wp-in", async f => {
    const file = f[0], p = $("#wp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)}`; $("#wp-out", el).hidden = true;
    if (!/\.docx$/i.test(file.name)) return say(msg, "Only .docx files are supported. Open older .doc files in Word or Google Docs and save them as .docx first.", true);
    say(msg, "Reading document…");
    try {
      const mammoth = await wordLib(), r = await mammoth.convertToHtml({arrayBuffer: await file.arrayBuffer()});
      frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(baseName(file))}</title><style>@page{size:A4;margin:20mm}body{font:11pt/1.5 Calibri,Carlito,Arial,sans-serif;color:#000;background:#fff;max-width:170mm;margin:0 auto;padding:14mm 0}img{max-width:100%;height:auto}table{border-collapse:collapse;margin:8pt 0}td,th{border:1px solid #999;padding:4px 6px;vertical-align:top}p{margin:0 0 8pt}h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}@media print{body{padding:0}}</style></head><body>${r.value}</body></html>`;
      $("#wp-out", el).hidden = false;
      say(msg, `Preview ready.${r.messages.length ? " Some formatting couldn't be converted exactly; check the preview." : ""} Text, headings, lists, tables and images are kept; complex layouts may differ.`);
    } catch { say(msg, `${file.name} could not be read. Make sure it is a .docx file that isn't password-protected.`, true); }
  });
  $("#wp-print", el).onclick = () => { frame.contentWindow.focus(); frame.contentWindow.print(); };
 }},
{id: "compress-pdf", cat: "files", name: "Compress PDF", desc: "Shrink large, scanned or image-heavy PDFs.",
 ui: `${dropUI("cp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="cp-file" class="file-picked" hidden></p>
  <label for="cp-level">Compression</label><select id="cp-level"><option value="72,0.55">Strong: smallest file (72 dpi)</option><option value="110,0.65" selected>Balanced (110 dpi)</option><option value="150,0.75">Light: best quality (150 dpi)</option></select>
  <p class="note">Pages are saved as images, so text in the compressed PDF can't be selected or searched. Best for scans and photo-heavy documents.</p>
  <div class="btns"><button class="primary" id="cp-go" disabled>Compress PDF</button></div><p id="cp-msg" class="note" aria-live="polite">Choose a PDF to start.</p><div id="cp-out"></div>`,
 init(el) {
  let file = null; const go = $("#cp-go", el), msg = $("#cp-msg", el);
  wireDrop(el, "cp-in", f => { file = f[0]; $("#cp-out", el).innerHTML = ""; const p = $("#cp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)}`; go.disabled = false; say(msg, "Choose a level, then compress."); });
  go.onclick = async () => {
    busy(go, true, "Compressing…");
    try {
      const [dpi, q] = $("#cp-level", el).value.split(",").map(Number), src = await openPdfJs(file), {PDFDocument} = await pdfLib(), out = await PDFDocument.create();
      for (let i = 1; i <= src.numPages; i++) {
        say(msg, `Compressing page ${i} of ${src.numPages}…`);
        const page = await src.getPage(i), v1 = page.getViewport({scale: 1}), vp = page.getViewport({scale: dpi / 72});
        const c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        await page.render({canvasContext: x, viewport: vp}).promise; page.cleanup();
        const img = await out.embedJpg(new Uint8Array(await (await canvasBlob(c, "image/jpeg", q)).arrayBuffer()));
        out.addPage([v1.width, v1.height]).drawImage(img, {x: 0, y: 0, width: v1.width, height: v1.height});
      }
      src.destroy();
      const blob = new Blob([await out.save()], {type: "application/pdf"}), saved = 1 - blob.size / file.size;
      if (saved <= 0.02) { $("#cp-out", el).innerHTML = ""; return say(msg, `This PDF is already well compressed (${fsize(file.size)}); compressing would not make it smaller. Keep the original.`); }
      showResults($("#cp-out", el), [{name: `${baseName(file)}-compressed.pdf`, blob, note: `${fsize(file.size)} → ${fsize(blob.size)}`}]);
      say(msg, `Reduced by ${Math.round(saved * 100)}%.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "image-converter", cat: "files", name: "Image converter", desc: "Convert images between JPG, PNG and WebP.",
 ui: `${dropUI("ic-in", "image/*", "Choose images", true)}<p id="ic-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="ic-type">Convert to</label><select id="ic-type"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>
  <div id="ic-qwrap"><label for="ic-q">Quality: <span id="ic-qv">90</span>%</label><input id="ic-q" type="range" min="30" max="100" value="90"></div></div>
  <div class="btns"><button class="primary" id="ic-go" disabled>Convert</button></div><p id="ic-msg" class="note" aria-live="polite">Choose one or more images.</p><div id="ic-out"></div>`,
 init(el) { imageTool(el, "ic", (f, o) => ({type: o.type, quality: o.q})); }},
{id: "image-compressor", cat: "files", name: "Image compressor", desc: "Make JPG, PNG and WebP images smaller for email and the web.",
 ui: `${dropUI("ix-in", "image/*", "Choose images", true)}<p id="ix-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="ix-type">Save as</label><select id="ix-type"><option value="image/jpeg">JPG (best for photos)</option><option value="image/webp">WebP (smallest)</option></select></div>
  <div><label for="ix-max">Maximum width</label><select id="ix-max"><option value="0">Keep original size</option><option value="2560">2560 px</option><option value="1920" selected>1920 px (Full HD)</option><option value="1280">1280 px</option><option value="800">800 px</option></select></div>
  <div id="ix-qwrap"><label for="ix-q">Quality: <span id="ix-qv">70</span>%</label><input id="ix-q" type="range" min="30" max="95" value="70"></div></div>
  <div class="btns"><button class="primary" id="ix-go" disabled>Compress</button></div><p id="ix-msg" class="note" aria-live="polite">Choose one or more images.</p><div id="ix-out"></div>`,
 init(el) { imageTool(el, "ix", (f, o) => ({type: o.type, quality: o.q, maxWidth: +$("#ix-max", el).value || 0}), true); }},
{id: "image-resizer", cat: "files", name: "Image resizer", desc: "Resize images to exact pixels or a percentage.",
 ui: `${dropUI("ir-in", "image/*", "Choose images", true)}<p id="ir-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="ir-mode">Resize by</label><select id="ir-mode"><option value="px">Width and height</option><option value="pct">Percentage</option></select></div>
  <div class="ir-px"><label for="ir-w">Width (px)</label><input id="ir-w" type="number" min="1" max="16384" inputmode="numeric" placeholder="e.g. 1200"></div>
  <div class="ir-px"><label for="ir-h">Height (px)</label><input id="ir-h" type="number" min="1" max="16384" inputmode="numeric" placeholder="auto"></div>
  <div class="ir-pct" hidden><label for="ir-pct">Percentage</label><input id="ir-pct" type="number" min="1" max="400" value="50" inputmode="numeric"></div></div>
  <label class="check ir-px"><input id="ir-keep" type="checkbox" checked> Keep proportions (fit inside the width and height)</label>
  <div class="btns"><button class="primary" id="ir-go" disabled>Resize</button></div><p id="ir-msg" class="note" aria-live="polite">Choose one or more images.</p><div id="ir-out"></div>`,
 init(el) {
  const mode = $("#ir-mode", el);
  mode.onchange = () => { $$(".ir-px", el).forEach(n => n.hidden = mode.value !== "px"); $$(".ir-pct", el).forEach(n => n.hidden = mode.value !== "pct"); };
  imageTool(el, "ir", async f => {
    const type = IMG_EXT[f.type] ? f.type : "image/jpeg";
    if (mode.value === "pct") { const p = +$("#ir-pct", el).value; if (!(p > 0 && p <= 400)) throw new Error("Enter a percentage from 1 to 400."); const b = await createImageBitmap(f); const r = {type, width: Math.max(1, Math.round(b.width * p / 100))}; b.close?.(); return r; }
    const w = +$("#ir-w", el).value || 0, h = +$("#ir-h", el).value || 0;
    if (!w && !h) throw new Error("Enter a width, a height or both.");
    if (!$("#ir-keep", el).checked || !w || !h) return {type, width: w || undefined, height: h || undefined};
    const b = await createImageBitmap(f), k = Math.min(w / b.width, h / b.height), r = {type, width: Math.max(1, Math.round(b.width * k))}; b.close?.(); return r;
  });
 }},

/* ---------- GENERAL ---------- */

{id: "time-duration",cat:"general",name:"Time duration calculator",desc:"Calculate shift hours with overnight times and unpaid breaks.",
ui:`<div class="row"><div><label for="dur-start">Start time</label><input id="dur-start" type="time"></div><div><label for="dur-end">End time</label><input id="dur-end" type="time"></div><div><label for="dur-break">Break (minutes)</label><input id="dur-break" type="number" min="0" step="1" value="0"></div></div><label class="check"><input id="dur-next" type="checkbox"> End on next day</label><div id="dur-out" class="out" aria-live="polite"></div><p class="note">Earlier end times automatically count as overnight. For equal times, select next day for 24 hours. Supports shifts up to 24 hours. Uses clock times without daylight-saving adjustments.</p>`,
init(el){
const parse=s=>{if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s))return NaN;const [h,m]=s.split(":").map(Number);return h*60+m;};
const run=()=>{const a=parse($("#dur-start",el).value),b=parse($("#dur-end",el).value),raw=$("#dur-break",el).value.trim(),br=Number(raw),o=$("#dur-out",el);
if(!Number.isFinite(a)||!Number.isFinite(b)){o.textContent="Choose a start and end time.";return;}
if(raw===""||!Number.isInteger(br)||br<0||br>1440){o.textContent="Enter a whole break duration from 0 to 1,440 minutes.";return;}
const total=b-a+(($("#dur-next",el).checked||b<a)?1440:0);
if(total>1440){o.textContent="Maximum shift is 24 hours. Check the next-day option.";return;}
if(br>total){o.textContent="Break cannot exceed shift duration.";return;}
const n=total-br;o.innerHTML='<p class="big">'+plural(Math.floor(n/60),"hour")+' '+plural(n%60,"minute")+'</p><p class="sub">'+(n/60).toFixed(2)+' decimal hours after breaks · '+plural(n,"minute")+' total</p><p class="sub">Total shift: '+plural(Math.floor(total/60),"hour")+' '+plural(total%60,"minute")+' · Break: '+plural(br,"minute")+'</p>';
};el.addEventListener("input",run);el.addEventListener("change",run);run();
}},


{id: "aspect-ratio", cat: "general", name: "Aspect ratio calculator", desc: "Find image and video ratios and resize without stretching.",
ui: `<label for="ar-preset">Original size preset</label><select id="ar-preset"><option value="">Custom dimensions</option><option value="1920,1080">Full HD landscape (1920 × 1080)</option><option value="1080,1920">Full HD portrait (1080 × 1920)</option><option value="1080,1080">Square (1080 × 1080)</option><option value="3840,2160">4K landscape (3840 × 2160)</option></select><div class="row"><div><label for="ar-w">Original width (pixels)</label><input id="ar-w" type="number" min="1" step="1" inputmode="numeric" value="1920"></div><div><label for="ar-h">Original height (pixels)</label><input id="ar-h" type="number" min="1" step="1" inputmode="numeric" value="1080"></div></div><div class="row"><div><label for="ar-side">Resize by</label><select id="ar-side"><option value="width">New width</option><option value="height">New height</option></select></div><div><label for="ar-target">New size (pixels)</label><input id="ar-target" type="number" min="1" step="1" inputmode="numeric" value="1280"></div></div><div class="btns"><button id="ar-swap">Swap width and height</button></div><div class="out" id="ar-out" aria-live="polite"></div><p class="note">Enter positive whole pixels up to 1,000,000. The other dimension is rounded to the nearest pixel. This calculates dimensions; it does not upload or resize an image file.</p>`,
init(el) {
const run=()=>{
const w=Number($("#ar-w",el).value),h=Number($("#ar-h",el).value),target=Number($("#ar-target",el).value),o=$("#ar-out",el);
if(![w,h,target].every(n=>Number.isInteger(n)&&n>0&&n<=1000000)){o.innerHTML='<p class="err">Enter whole numbers from 1 to 1,000,000 for all dimensions.</p>';return;}
const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(w,h),byWidth=$("#ar-side",el).value==="width";
const nw=byWidth?target:Math.round(target*w/h),nh=byWidth?Math.round(target*h/w):target;
if(nw<1||nh<1){o.innerHTML='<p class="err">This size would round a dimension to zero. Choose a larger size.</p>';return;}
o.innerHTML='<p class="big">'+(w/g)+':'+(h/g)+'</p><p class="sub">Original aspect ratio</p><p class="big" style="margin-top:16px">'+nw+' × '+nh+'</p><p class="sub">New width × height in pixels</p><p class="sub">Pixel count: '+nf(nw*nh,0)+' · '+nf(nw*nh/1000000,3)+' megapixels</p><p class="sub">Scale: '+nf(target/(byWidth?w:h)*100,2)+'% of original · '+(target<(byWidth?w:h)?'Reduction':target>(byWidth?w:h)?'Enlargement':'Original size')+'</p>';
};
$("#ar-preset",el).onchange=()=>{const v=$("#ar-preset",el).value;if(v){const [w,h]=v.split(",");$("#ar-w",el).value=w;$("#ar-h",el).value=h;run();}};
["#ar-w","#ar-h"].forEach(s=>$(s,el).addEventListener("input",()=>{$("#ar-preset",el).value="";}));
$("#ar-swap",el).onclick=()=>{const w=$("#ar-w",el),h=$("#ar-h",el);[w.value,h.value]=[h.value,w.value];$("#ar-preset",el).value="";run();};
el.addEventListener("input",run);el.addEventListener("change",run);run();
}},


{id: "text-sorter", cat: "general", name: "Text line sorter", desc: "Sort lists and remove duplicate lines privately in your browser.",
ui: `<label for="ls-in">One item per line</label><textarea id="ls-in"></textarea><label for="ls-order">Order</label><select id="ls-order"><option value="keep">Keep original order</option><option value="reverse">Reverse original order</option><option value="short">Shortest lines first</option><option value="long">Longest lines first</option><option value="asc">A to Z (natural order)</option><option value="desc">Z to A (natural order)</option></select><div class="btns"><label class="check"><input id="ls-unique" type="checkbox" checked> Remove duplicates</label><label class="check"><input id="ls-normalize" type="checkbox"> Match equivalent Unicode characters</label><label class="check"><input id="ls-case" type="checkbox"> Ignore case for duplicates</label><label class="check"><input id="ls-trim" type="checkbox" checked> Trim spaces</label><label class="check"><input id="ls-empty" type="checkbox" checked> Remove empty lines</label></div><label for="ls-out">Result</label><textarea id="ls-out" readonly></textarea><p id="ls-count" class="note" aria-live="polite"></p><div class="btns"><button id="ls-copy" class="primary">Copy result</button><button id="ls-reuse" disabled>Use result as input</button></div>`,
init(el) {
const run = () => {
const input = $("#ls-in",el).value;
let lines = input ? input.split(/\r\n|\n|\r/) : [];
const count = lines.length;
if ($("#ls-trim",el).checked) lines = lines.map(s=>s.trim());
if ($("#ls-empty",el).checked) lines = lines.filter(s=>s.trim().length>0);
const beforeDuplicates = lines.length;
if ($("#ls-unique",el).checked) { const seen = new Set(); lines = lines.filter(s=>{let k=$("#ls-case",el).checked?s.toLowerCase():s;if($("#ls-normalize",el).checked)k=k.normalize("NFC");if(seen.has(k))return false;seen.add(k);return true;}); }
const order=$("#ls-order",el).value;
if(order==="reverse") lines.reverse();
else if(order==="short"||order==="long") lines.sort((a,b)=>(order==="long"?-1:1)*([...a].length-[...b].length));
else if(order!=="keep"){const cmp=new Intl.Collator("en-GB",{numeric:true});lines.sort((a,b)=>(order==="desc"?-1:1)*cmp.compare(a,b));}
$("#ls-reuse",el).disabled=!lines.join("\n");$("#ls-out",el).value=lines.join("\n");$("#ls-count",el).textContent=count+" input lines → "+lines.length+" result lines · "+plural(beforeDuplicates-lines.length,"duplicate")+" removed";
};
$("#ls-reuse",el).onclick=()=>{$("#ls-in",el).value=$("#ls-out",el).value;run();$("#ls-in",el).focus();};
el.addEventListener("input",run);el.addEventListener("change",run);$("#ls-copy",el).onclick=e=>copy($("#ls-out",el).value,e.target);run();
}},


{id: "date-difference", cat: "general", name: "Date difference calculator", desc: "Count calendar days and weeks between two dates.",
 ui: `<div class="row"><div><label for="dd-start">Start date</label><input id="dd-start" type="date"></div><div><label for="dd-end">End date</label><input id="dd-end" type="date"></div></div><label class="check"><input id="dd-inclusive" type="checkbox"> Include both start and end dates</label><div class="btns"><button id="dd-swap">Swap dates</button></div><div class="out" id="dd-result" aria-live="polite"></div><p class="note">Calendar totals include weekends. Weekdays exclude Saturdays and Sundays but include bank holidays; they are not business-day totals. The end date is excluded unless inclusive counting is selected. Time zones and daylight saving do not change the result.</p>`,
 init(el) {
  const parse = s => {
   if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
   const [y,m,d] = s.split("-").map(Number);
   const t = new Date(0); t.setUTCFullYear(y,m-1,d); t.setUTCHours(0,0,0,0);
   return t.getUTCFullYear() === y && t.getUTCMonth() === m-1 && t.getUTCDate() === d ? t.getTime() : NaN;
  };
  const run = () => {
   const a = parse($("#dd-start",el).value), b = parse($("#dd-end",el).value), o = $("#dd-result",el);
   if (!Number.isFinite(a) || !Number.isFinite(b)) { o.innerHTML = '<p class="sub">Choose two valid dates.</p>'; return; }
   if (b < a) { o.innerHTML = '<p class="err">End date must be on or after start date.</p>'; return; }
   const days = Math.round((b-a)/86400000) + ($("#dd-inclusive",el).checked ? 1 : 0);
   const wholeWeeks = Math.floor(days / 7), remainder = days % 7;
   let weekdays = wholeWeeks * 5;
   for (let i = 0; i < remainder; i++) { const day = new Date(a + i * 86400000).getUTCDay(); if (day !== 0 && day !== 6) weekdays++; }
   o.innerHTML = '<p class="sub">' + plural(weekdays,"weekday") + ' (Monday–Friday) · ' + plural(days-weekdays,"weekend day") + '</p>' + '<p class="big">' + plural(days,"day") + '</p><p class="sub">' + plural(Math.floor(days/7),"week") + ' and ' + plural(days%7,"day") + '</p>';
  };
  $("#dd-swap",el).onclick = () => { const a = $("#dd-start",el), b = $("#dd-end",el); [a.value,b.value] = [b.value,a.value]; run(); };
  el.addEventListener("input",run); el.addEventListener("change",run); run();
 }},


{id: "bmi-calculator", cat: "general", name: "BMI calculator", desc: "Calculate adult body mass index using metric or imperial measurements.",
 ui: `<p class="note" style="margin-top:0">For adults aged 18 and over. Not suitable during pregnancy.</p>
 <div class="row"><div><label for="bmi-units">Units</label><select id="bmi-units"><option value="metric">Metric (cm and kg)</option><option value="imperial">Imperial (feet, inches, stone and pounds)</option></select></div></div>
 <div id="bmi-metric" class="row"><div><label for="bmi-cm">Height (cm)</label><input id="bmi-cm" type="number" inputmode="decimal" min="1" step="any" placeholder="e.g. 175"></div><div><label for="bmi-kg">Weight (kg)</label><input id="bmi-kg" type="number" inputmode="decimal" min="1" step="any" placeholder="e.g. 70"></div></div>
 <div id="bmi-imperial" hidden><div class="row"><div><label for="bmi-ft">Height (feet)</label><input id="bmi-ft" type="number" inputmode="numeric" min="0" step="1"></div><div><label for="bmi-in">Extra inches</label><input id="bmi-in" type="number" inputmode="decimal" min="0" max="11.99" step="any" value="0"></div></div><div class="row"><div><label for="bmi-st">Weight (stone)</label><input id="bmi-st" type="number" inputmode="numeric" min="0" step="1"></div><div><label for="bmi-lb">Extra pounds</label><input id="bmi-lb" type="number" inputmode="decimal" min="0" max="13.99" step="any" value="0"></div></div></div>
 <div class="out" id="bmi-result" aria-live="polite"></div>
 <p class="note">BMI = weight (kg) ÷ height (metres)². Standard adult categories are shown. For South Asian, Chinese, other Asian, Middle Eastern, Black African and African–Caribbean backgrounds, overweight starts at 23 and obesity at 27.5. BMI cannot distinguish muscle from fat and needs careful interpretation in older adults. It is a screening estimate, not a diagnosis.</p>
 <p class="note"><a href="https://www.nhs.uk/conditions/overweight-and-obesity/" target="_blank" rel="noopener">Read NHS guidance about BMI</a></p>`,
 init(el) {
  const val = id => { const s = $("#" + id, el).value.trim(); return s === "" ? NaN : Number(s); };
  const run = () => {
   const metric = $("#bmi-units", el).value === "metric";
   $("#bmi-metric", el).hidden = !metric; $("#bmi-imperial", el).hidden = metric;
   const o = $("#bmi-result", el);
   let h, w;
   if (metric) { h = val("bmi-cm") / 100; w = val("bmi-kg"); }
   else {
    const ft = val("bmi-ft"), inch = val("bmi-in"), st = val("bmi-st"), lb = val("bmi-lb");
    if (![ft, inch, st, lb].every(Number.isFinite) || ft < 0 || st < 0 || !Number.isInteger(ft) || !Number.isInteger(st) || inch < 0 || inch >= 12 || lb < 0 || lb >= 14) {
     o.innerHTML = '<p class="sub">Enter feet and stone as whole numbers, extra inches from 0 to less than 12, and extra pounds from 0 to less than 14.</p>'; return;
    }
    h = (ft * 12 + inch) * .0254; w = (st * 14 + lb) * .45359237;
   }
   if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) { o.innerHTML = '<p class="sub">Enter a positive height and weight to calculate your BMI.</p>'; return; }
   const bmi = w / (h * h);
   if (!Number.isFinite(bmi) || bmi <= 0) { o.innerHTML = '<p class="err">Please check your measurements.</p>'; return; }
   const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obesity";
   o.innerHTML = '<p class="sub">Your BMI</p><p class="big">' + bmi.toFixed(1) + '</p><p class="sub">' + category + ' (standard adult category)</p>';
  };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
 }},

{id: "word-counter", cat: "general", name: "Word counter", desc: "Count words, characters, sentences and reading time.",
 ui: `<label for="wc">Your text</label><textarea id="wc" placeholder="Type or paste text here"></textarea><label for="wc-speed">Reading speed (words per minute)</label><select id="wc-speed"><option value="100">100 — slower reading</option><option value="200" selected>200 — standard estimate</option><option value="300">300 — faster reading</option></select><label for="wc-speaking">Speaking speed (words per minute)</label><select id="wc-speaking"><option value="100">100 — slower speaking</option><option value="130" selected>130 — standard estimate</option><option value="160">160 — faster speaking</option></select><div class="out stats" id="wcs" aria-live="polite"></div>`,
 init(el) {
  const t = $("#wc", el), o = $("#wcs", el);
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, {granularity: "grapheme"}) : null;
  const characters = text => segmenter ? [...segmenter.segment(text)].length : [...text].length;
  const run = () => {
    const s = t.value, words = (s.trim().match(/\S+/g) || []).length;
    const speakingSeconds = Math.ceil(words * 60 / Number($("#wc-speaking", el).value));
    const sent = s.split(/[.!?]+/).filter(part => /[\p{L}\p{N}]/u.test(part)).length;
    o.innerHTML = stats([[words, "Words"], [s ? s.split(/\r\n|\n|\r/).length : 0, "Lines (including blank lines)"], [characters(s), "Characters"], [new TextEncoder().encode(s).length, "UTF-8 bytes"], [characters(s.replace(/\s/g, "")), "Without spaces"], [sent, "Sentences"],
      [s.split(/\n\s*\n/).filter(p => p.trim()).length, "Paragraphs"], [Math.ceil(words / Number($("#wc-speed", el).value)) + " min", "Reading time"], [Math.floor(speakingSeconds / 60) + " min " + (speakingSeconds % 60) + " sec", "Speaking time (" + $("#wc-speaking", el).value + " words/min)"]]);
  };
  t.addEventListener("input", run); $("#wc-speed", el).addEventListener("change", run); $("#wc-speaking", el).addEventListener("change", run); run();
 }},
{id: "case-converter", cat: "general", name: "Case converter", desc: "Switch text to UPPER, lower, Title, camelCase and more.",
 ui: `<label for="cc">Your text</label><textarea id="cc" placeholder="Type or paste text here"></textarea>
  <div class="btns"><button data-c="upper">UPPER CASE</button><button data-c="lower">lower case</button><button data-c="toggle">Toggle case</button><button data-c="title">Title Case</button><button data-c="sentence">Sentence case</button><button data-c="camel">camelCase</button><button data-c="pascal">PascalCase</button><button data-c="snake">snake_case</button><button data-c="constant">CONSTANT_CASE</button><button data-c="kebab">kebab-case</button></div>
  <div class="btns"><button class="primary" data-c="copy">Copy text</button><button data-c="undo" disabled>Undo conversion</button></div>`,
 init(el) {
  const t = $("#cc", el);
  const words = s => s.normalize("NFC").replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2").replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2").split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  const f = {
    upper: s => s.toUpperCase(), lower: s => s.toLowerCase(),
    toggle: s => [...s].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(""),
    title: s => s.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()),
    sentence: s => s.toLowerCase().replace(/(^\s*\S|[.!?]\s+\S)/g, c => c.toUpperCase()),
    camel: s => words(s).map((w, i) => i ? [...w][0].toUpperCase() + [...w].slice(1).join("").toLowerCase() : w.toLowerCase()).join(""),
    pascal: s => words(s).map(w => { const [first, ...rest] = [...w]; return first.toUpperCase() + rest.join("").toLowerCase(); }).join(""),
    snake: s => words(s).map(w => w.toLowerCase()).join("_"),
    constant: s => words(s).map(w => w.toUpperCase()).join("_"),
    kebab: s => words(s).map(w => w.toLowerCase()).join("-")
  };
  let previous = null;
  const undo = $('[data-c="undo"]', el);
  t.addEventListener("input", () => { previous = null; undo.disabled = true; });
  el.addEventListener("click", e => {
    const c = e.target.dataset.c; if (!c) return;
    if (c === "copy") return copy(t.value, e.target);
    if (c === "undo") { if (previous !== null) t.value = previous; previous = null; undo.disabled = true; return; }
    const result = f[c](t.value);
    if (result !== t.value) { previous = t.value; t.value = result; undo.disabled = false; }
  });
 }},
{id: "password-generator", cat: "general", name: "Password generator", desc: "Strong random passwords, made on your device.",
 ui: `<label for="pl">Length: <span id="plv">16</span></label><input type="range" id="pl" min="8" max="64" value="16">
  <div class="row" style="margin-top:16px"><label class="check"><input type="checkbox" id="pu" checked> Capital letters</label><label class="check"><input type="checkbox" id="pw" checked> Small letters</label><label class="check"><input type="checkbox" id="pd" checked> Numbers</label><label class="check"><input type="checkbox" id="ps" checked> Symbols</label></div>
  <label class="check"><input type="checkbox" id="pa"> Exclude look-alike characters (I, l, 1, O, 0)</label><div class="out"><p class="big mono" id="po" style="font-family:var(--mono);font-size:1.3rem;word-break:break-all"></p><p class="sub" id="pst"></p></div>
  <div class="btns"><button class="primary" id="pg">Generate new password</button><button id="pc">Copy password</button></div>`,
 init(el) {
  const sets = {pu: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", pw: "abcdefghijklmnopqrstuvwxyz", pd: "0123456789", ps: "!@#$%^&*()-_=+[]{};:,.?/"};
  const rnd = n => { const limit = Math.floor(4294967296 / n) * n; let v; do { v = crypto.getRandomValues(new Uint32Array(1))[0]; } while (v >= limit); return v % n; };
  const gen = () => {
    const len = +$("#pl", el).value; $("#plv", el).textContent = len;
    const on = Object.keys(sets).filter(k => $("#" + k, el).checked);
    if (!on.length) { $("#po", el).textContent = ""; $("#pst", el).innerHTML = `<span class="err">Tick at least one type of character.</span>`; return; }
    const active = Object.fromEntries(on.map(k => [k, $("#pa", el).checked ? sets[k].replace(/[Il1O0]/g, "") : sets[k]]));
    const pool = on.map(k => active[k]).join("");
    let p;
    do { p = Array.from({length: len}, () => pool[rnd(pool.length)]).join(""); } while (!on.every(k => [...p].some(c => active[k].includes(c))));
    $("#po", el).textContent = p;
    $("#pst", el).textContent = `${len} characters · Every selected character type included · Generated on your device`;
  };
  el.addEventListener("input", gen); $("#pg", el).onclick = gen;
  $("#pc", el).onclick = e => copy($("#po", el).textContent, e.target); gen();
 }},
{id: "unit-converter", cat: "general", name: "Unit converter", desc: "Power, energy, data size, angles, pressure, time, area, length, weight, volume, temperature and speed.",
 ui: `<div class="row"><div><label for="ucat">Measure</label><select id="ucat"></select></div><div><label for="uv">Value</label><input id="uv" inputmode="decimal" value="1"></div></div>
  <div class="row"><div><label for="uf">From</label><select id="uf"></select></div><div><label for="ut">To</label><select id="ut"></select></div></div>
  <div class="btns"><button id="usw">Swap units</button><button id="unit-copy" disabled>Copy conversion</button></div><p class="note">Data size: decimal kilo/mega/giga/tera use powers of 1,000; binary kibi/mebi/gibi/tebi use powers of 1,024. All data units here measure bytes, not bits.</p><div class="out"><p class="big" id="ur" aria-live="polite"></p></div>`,
 init(el) {
  const c = $("#ucat", el), f = $("#uf", el), t = $("#ut", el);
  const formatUnit = n => n !== 0 && (Math.abs(n) < 0.000001 || Math.abs(n) >= 1e12) ? n.toExponential(6) : n.toLocaleString("en-GB", {maximumSignificantDigits: 10});
  c.innerHTML = Object.keys(UNITS).map(k => `<option>${k}</option>`).join("");
  const fill = () => { const o = Object.keys(UNITS[c.value]).map(k => `<option>${k}</option>`).join(""); f.innerHTML = o; t.innerHTML = o; t.selectedIndex = 1; };
  const run = () => {
    $("#unit-copy", el).disabled = true;
    const raw = $("#uv", el).value.trim();
    const v = Number(raw);
    if (!raw || !Number.isFinite(v)) return $("#ur", el).textContent = "Enter a valid number.";
    if (c.value === "Temperature" && toC[f.value](v) < -273.150000001) return $("#ur", el).textContent = "Temperature cannot be below absolute zero.";
    const r = c.value === "Temperature" ? fromC[t.value](toC[f.value](v)) : v * UNITS[c.value][f.value] / UNITS[c.value][t.value];
    if (!Number.isFinite(r)) return $("#ur", el).textContent = "Result is too large. Try a smaller value.";
    $("#unit-copy", el).disabled = false;
    $("#ur", el).textContent = `${formatUnit(v)} ${f.value.toLowerCase()} = ${formatUnit(r)} ${t.value.toLowerCase()}`;
  };
  $("#unit-copy", el).onclick = e => copy($("#ur", el).textContent, e.target);
  c.onchange = () => { fill(); run(); };
  $("#usw", el).onclick = () => { const a = f.value; f.value = t.value; t.value = a; run(); };
  el.addEventListener("input", run); el.addEventListener("change", run); fill(); run();
 }},
{id: "age-calculator", cat: "general", name: "Age calculator", desc: "Exact age in years, months and days, plus next birthday.",
 ui: `<div class="row"><div><label for="ad">Date of birth</label><input type="date" id="ad"></div><div><label for="aa">Age on this date</label><input type="date" id="aa"></div></div><div class="out" id="ao" aria-live="polite"></div>`,
 init(el) {
  const p = v => { const [Y, M, D] = v.split("-").map(Number); return new Date(Date.UTC(Y, M - 1, D)); };
  $("#aa", el).value = new Date().toISOString().slice(0, 10);
  const run = () => {
    const o = $("#ao", el), A = $("#ad", el).value, B = $("#aa", el).value;
    if (!A || !B) return o.innerHTML = `<p class="sub">Pick a date of birth to see the age.</p>`;
    const a = p(A), b = p(B);
    if (a > b) return o.innerHTML = `<p class="err">The date of birth is after the other date.</p>`;
    const anniversary = months => {
      const date = new Date(a); date.setUTCDate(1); date.setUTCMonth(a.getUTCMonth() + months);
      const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
      date.setUTCDate(Math.min(a.getUTCDate(), last.getUTCDate())); return date;
    };
    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (anniversary(months) > b) months--;
    const y = Math.floor(months / 12), m = months % 12, d = Math.round((b - anniversary(months)) / 864e5);
    let nb = Date.UTC(b.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    if (nb < b) nb = Date.UTC(b.getUTCFullYear() + 1, a.getUTCMonth(), a.getUTCDate());
    const nd = Math.round((nb - b) / 864e5);
    o.innerHTML = `<p class="big">${plural(y, "year")}, ${plural(m, "month")}, ${plural(d, "day")}</p>
      <p class="sub">${Math.round((b - a) / 864e5).toLocaleString("en-GB")} days in total. ${nd === 0 ? "Birthday today!" : `Next birthday in ${plural(nd, "day")}.`}</p>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "percentage-calculator", cat: "general", name: "Percentage calculator", desc: "Percent of a number, percentage share and change.",
 ui: `<div class="pc"><span>What is</span><input id="p1" aria-label="Percentage" inputmode="decimal" value="15"><span>% of</span><input id="p2" aria-label="Number to calculate a percentage of" inputmode="decimal" value="200"><span>?</span><output id="r1" aria-label="Percentage result" aria-live="polite"></output></div>
  <div class="pc"><input id="p3" aria-label="Part" inputmode="decimal" value="30"><span>is what % of</span><input id="p4" aria-label="Whole" inputmode="decimal" value="120"><span>?</span><output id="r2" aria-label="Percentage share result" aria-live="polite"></output></div>
  <div class="pc"><span>Change from</span><input id="p5" aria-label="Original value" inputmode="decimal" value="80"><span>to</span><input id="p6" aria-label="New value" inputmode="decimal" value="100"><output id="r3" aria-label="Percentage change result" aria-live="polite"></output></div>`,
 init(el) {
  const v = id => num($("#" + id, el).value);
  const run = () => {
    $("#r1", el).textContent = nf(v("p1") * v("p2") / 100, 4);
    $("#r2", el).textContent = v("p4") ? nf(v("p3") / v("p4") * 100, 2) + "%" : "–";
    const ch = (v("p6") - v("p5")) / v("p5") * 100;
    $("#r3", el).textContent = v("p5") && isFinite(ch) ? `${ch >= 0 ? "+" : ""}${nf(ch, 2)}% (${ch >= 0 ? "increase" : "decrease"})` : "–";
  };
  el.addEventListener("input", run); run();
 }},

/* ---------- ADVANCED ---------- */
{id: "json-formatter", cat: "advanced", name: "JSON formatter", desc: "Format, minify and check JSON for errors.",
 ui: `<label for="jt">JSON</label><textarea id="jt" class="mono" style="min-height:260px" placeholder='{"name":"Abrar","tools":20}'></textarea>
  <label for="ji">Indentation</label><select id="ji"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tabs</option></select><div class="btns"><button class="primary" data-j="f">Format</button><button data-j="m">Minify</button><button data-j="v">Validate only</button><button data-j="u" disabled>Undo formatting</button><button data-j="c">Copy</button></div><p id="jm" aria-live="polite"></p>`,
 init(el) {
  const t = $("#jt", el), m = $("#jm", el), undo = $('[data-j="u"]', el);
  let previous = null;
  t.addEventListener("input", () => { previous = null; undo.disabled = true; m.textContent = ""; m.className = ""; });
  el.addEventListener("click", e => {
    const a = e.target.dataset.j; if (!a) return;
    if (a === "c") return copy(t.value, e.target);
    if (a === "u") { if (previous !== null) { t.value = previous; previous = null; undo.disabled = true; m.className = "ok"; m.textContent = "Original JSON text restored."; } return; }
    try {
      const parsed = JSON.parse(t.value);
      if (a !== "v") { previous = t.value; undo.disabled = false; const indent = $("#ji", el).value; t.value = JSON.stringify(parsed, null, a === "f" ? (indent === "tab" ? "\t" : Number(indent)) : 0); }
      const detail = Array.isArray(parsed) ? `Array: ${plural(parsed.length, "item")}` : parsed === null ? "Root value: null" : typeof parsed === "object" ? `Object: ${plural(Object.keys(parsed).length, "key")}` : `Root value: ${typeof parsed}`;
      const bytes = new TextEncoder().encode(t.value).length;
      m.className = "ok"; m.textContent = (a === "v" ? "Valid JSON. Your original text is unchanged. " : "Valid JSON. ") + detail + ". UTF-8 size: " + plural(bytes, "byte") + ".";
    }
    catch (err) { m.className = "err"; m.textContent = "Invalid JSON: " + err.message; }
  });
 }},
{id: "base64", cat: "advanced", name: "Base64 encoder and decoder", desc: "Encode or decode Base64, with full Unicode support.",
 ...twoWay(s => { let b = ""; new TextEncoder().encode(s).forEach(x => b += String.fromCharCode(x)); return btoa(b); },
   s => new TextDecoder("utf-8", {fatal: true}).decode(Uint8Array.from(atob(s.replace(/\s/g, "")), c => c.charCodeAt(0))),
   "Encode", "Decode", "That isn’t valid Base64. Check for missing or extra characters.")},
{id: "url-encoder", cat: "advanced", name: "URL encoder and decoder", desc: "Make text safe for links, or read encoded URLs.",
 ...twoWay(encodeURIComponent, s => decodeURIComponent(s.replace(/\+/g, " ")), "Encode", "Decode", "That text has a broken % sequence, so it can’t be decoded.")},
{id: "hash-generator", cat: "advanced", name: "Hash generator", desc: "SHA-1, SHA-256, SHA-384 and SHA-512 hashes.",
 ui: `<label for="ht">Text to hash</label><textarea id="ht" class="mono" placeholder="Type or paste text here"></textarea><label class="check"><input id="hash-upper" type="checkbox"> Uppercase hexadecimal</label><div class="out hashes" id="ho"></div>`,
 init(el) {
  const algs = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"], o = $("#ho", el);
  if (!window.crypto || !crypto.subtle) { o.innerHTML = `<p class="err">Hashing needs the site to be opened over https.</p>`; return; }
  o.innerHTML = algs.map(a => `<div><label>${a}</label><code data-h="${a}"></code><button data-copy="${a}">Copy ${a}</button></div>`).join("");
  $("#hash-upper", el).addEventListener("change", () => { algs.forEach(a => { const code = $(`[data-h="${a}"]`, el); code.textContent = $("#hash-upper", el).checked ? code.textContent.toUpperCase() : code.textContent.toLowerCase(); }); });
  let revision = 0;
  const run = async () => {
    const current = ++revision, d = new TextEncoder().encode($("#ht", el).value);
    algs.forEach(a => $(`[data-h="${a}"]`, el).textContent = "");
    for (const a of algs) {
      const h = await crypto.subtle.digest(a, d);
      if (current !== revision) return;
      const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
      $(`[data-h="${a}"]`, el).textContent = $("#hash-upper", el).checked ? hex.toUpperCase() : hex;
    }
  };
  o.addEventListener("click", e => { const a = e.target.dataset.copy; if (a) copy($(`[data-h="${a}"]`, el).textContent, e.target); });
  $("#ht", el).addEventListener("input", run); run();
 }},
{id: "uuid-generator", cat: "advanced", name: "UUID generator", desc: "Random version 4 UUIDs, up to 100 at once.",
 ui: `<div class="row"><div><label for="un">How many</label><input id="un" type="number" min="1" max="100" value="5"></div></div>
  <div class="btns"><button class="primary" id="ug">Generate UUIDs</button><button id="uc">Copy all</button></div><label for="uuid-format">Output format</label><select id="uuid-format"><option value="standard">Standard (with hyphens)</option><option value="compact">Compact (without hyphens)</option><option value="braces">Braces</option></select><label class="check"><input id="uuid-upper" type="checkbox"> Uppercase letters</label><label for="uo">Generated UUIDs</label><textarea id="uo" class="mono" readonly></textarea><p id="um" class="note" aria-live="polite"></p>`,
 init(el) {
  const id = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const format = () => { const out = $("#uo", el), style = $("#uuid-format", el).value; if (!out.value) return; out.value = out.value.split("\n").map(s => { const raw = s.replace(/[{}-]/g, ""); const hex = $("#uuid-upper", el).checked ? raw.toUpperCase() : raw.toLowerCase(); const standard = hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"); return style === "compact" ? hex : style === "braces" ? "{" + standard + "}" : standard; }).join("\n"); };
  $("#uuid-format", el).addEventListener("change", format);
  $("#uuid-upper", el).addEventListener("change", format);
  const gen = () => {
    const raw = $("#un", el).value.trim(), n = Number(raw), msg = $("#um", el);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 100) {
      $("#uo", el).value = ""; msg.className = "err"; msg.textContent = "Enter a whole number from 1 to 100."; return;
    }
    $("#uo", el).value = Array.from({length: n}, id).join("\n"); format();
    msg.className = "note"; msg.textContent = plural(n, "UUID") + " generated on your device.";
  };
  $("#un", el).addEventListener("input", () => { $("#uo", el).value = ""; $("#um", el).className = "note"; $("#um", el).textContent = "Choose Generate UUIDs to create a new batch."; });
  $("#ug", el).onclick = gen; $("#uc", el).onclick = e => copy($("#uo", el).value, e.target); gen();
 }},
{id: "timestamp-converter", cat: "advanced", name: "Unix timestamp converter", desc: "Convert Unix time to dates and back.",
 ui: `<div class="out" style="margin:0 0 20px"><p class="sub">Current Unix time</p><p class="big mono" id="tn" style="font-family:var(--mono)"></p></div>
  <label for="tu">Unix timestamp (seconds or milliseconds)</label><input id="tu" class="mono" inputmode="numeric"><label for="tu-unit" style="margin-top:12px">Timestamp unit</label><select id="tu-unit"><option value="auto">Auto-detect</option><option value="seconds">Seconds</option><option value="milliseconds">Milliseconds</option></select><div class="btns"><button id="tu-now">Use current time</button></div><p id="tuo" class="note" aria-live="polite"></p>
  <label for="td" style="margin-top:20px">Date and time</label><input id="td" type="datetime-local" step="1"><label for="td-zone" style="margin-top:12px">Interpret date in</label><select id="td-zone"><option value="local">Your local time zone</option><option value="utc">UTC</option></select><p id="tdo" class="note" aria-live="polite"></p>`,
 init(el) {
  const tick = () => $("#tn", el).textContent = Math.floor(Date.now() / 1000);
  tick(); const iv = setInterval(tick, 1000); cleanup = () => clearInterval(iv);
  $("#tu", el).value = Math.floor(Date.now() / 1000);
  const fromU = () => {

    const raw = $("#tu", el).value.trim(), o = $("#tuo", el), unit = $("#tu-unit", el).value;
    if (!/^[+-]?[0-9]+$/.test(raw)) { o.textContent = "Enter a whole timestamp without letters or decimals."; return; }
    const v = Number(raw);
    if (!Number.isSafeInteger(v)) { o.textContent = "Timestamp is too large to represent accurately."; return; }
    const ms = unit === "milliseconds" || (unit === "auto" && Math.abs(v) > 1e11);
    const d = new Date(ms ? v : v * 1000);
    if (!Number.isFinite(d.getTime())) { o.textContent = "Timestamp is outside the supported date range."; return; }
    o.innerHTML = `Interpreted as ${ms ? "milliseconds" : "seconds"}.<br>Local: <b>${d.toLocaleString("en-GB", {dateStyle:"full",timeStyle:"medium"})}</b><br>UTC (ISO 8601): <b>${d.toISOString()}</b>`;
  };
  $("#tu-now", el).onclick = () => { const ms = $("#tu-unit", el).value === "milliseconds"; $("#tu", el).value = ms ? Date.now() : Math.floor(Date.now() / 1000); fromU(); };
  const fromD = () => { const v = $("#td", el).value, o = $("#tdo", el); if (!v) { o.textContent = ""; return; } const utc = $("#td-zone", el).value === "utc", ms = new Date(v + (utc ? "Z" : "")).getTime(); o.textContent = Number.isFinite(ms) ? `Unix time: ${Math.floor(ms / 1000)} seconds · ${ms} milliseconds · ${utc ? "UTC" : "Local time"}` : "Enter a valid date and time."; };
  $("#td-zone", el).addEventListener("change", fromD);
  $("#tu-unit", el).addEventListener("change", fromU); $("#tu", el).addEventListener("input", fromU); $("#td", el).addEventListener("input", fromD); fromU();
 }},
{id: "colour-converter", cat: "advanced", name: "Colour converter", desc: "Convert HEX or RGB input to HEX, RGB, HSL and its inverse colour.",
 ui: `<div class="row" style="align-items:end"><div><label for="cp">Pick a colour</label><input type="color" id="cp" value="#1e7a6c"></div><div><label for="ch">Or type HEX or RGB</label><input id="ch" class="mono" value="#1e7a6c"></div></div>
  <div class="swatch" id="cs"></div><div id="co"></div><p id="cm" class="err" aria-live="polite"></p>`,
 init(el) {
  const show = hex => {
    const input = hex.trim();
    let h = input.replace(/^#/, "");
    if (/^rgb/i.test(input)) {
      const match = /^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/i.exec(input) || /^rgb\(\s*([0-9]+)\s+([0-9]+)\s+([0-9]+)\s*\)$/i.exec(input);
      if (!match || match.slice(1).some(v => Number(v) > 255)) {
        $("#co", el).innerHTML = ""; $("#cs", el).style.background = "transparent";
        $("#cm", el).textContent = "Use RGB whole numbers from 0 to 255, for example rgb(30, 122, 108) or rgb(30 122 108)."; return;
      }
      h = match.slice(1).map(v => Number(v).toString(16).padStart(2, "0")).join("");
    }
    if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map(c => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) { $("#co", el).innerHTML = ""; $("#cs", el).style.background = "transparent"; $("#cm", el).textContent = "Enter HEX like #1e7a6c or #fff, or RGB like rgb(30, 122, 108)."; return; }
    $("#cm", el).textContent = "";
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, dd = mx - mn;
    let hh = 0, s = 0;
    if (dd) { s = dd / (1 - Math.abs(2 * l - 1)); hh = mx === R ? ((G - B) / dd) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4; hh = Math.round(hh * 60 + 360) % 360; }
    const vals = {HEX: "#" + h.toLowerCase(), RGB: `rgb(${r}, ${g}, ${b})`, HSL: `hsl(${hh}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`, Inverse: "#" + [r,g,b].map(v => (255-v).toString(16).padStart(2,"0")).join("")};
    $("#cs", el).style.background = vals.HEX; $("#cp", el).value = vals.HEX;
    $("#co", el).innerHTML = Object.entries(vals).map(([k, v]) => `<div class="kv"><b>${k}</b><code>${v}</code><button data-v="${v}">Copy</button></div>`).join("");
  };
  $("#cp", el).addEventListener("input", e => { $("#ch", el).value = e.target.value; show(e.target.value); });
  $("#ch", el).addEventListener("input", e => show(e.target.value));
  $("#co", el).addEventListener("click", e => { if (e.target.dataset.v) copy(e.target.dataset.v, e.target); });
  show("#1e7a6c");
 }},

/* ---------- FINANCE ---------- */
{id: "take-home-pay", cat: "finance", name: "UK take-home pay calculator", desc: "Income tax and NI for 2026/27 (England, Wales and NI).",
 ui: `<div class="row"><div><label for="sg">Annual salary (£)</label><input id="sg" inputmode="decimal" value="30000"></div><div><label for="sp">Pension contribution (%)</label><input id="sp" inputmode="decimal" value="5"></div></div>
  <div class="out" id="so"></div>
  <p class="note">2026/27 tax year rates for England, Wales and Northern Ireland: £12,570 personal allowance, 20% / 40% / 45% income tax, 8% / 2% employee National Insurance. Pension is treated as taken before tax. Doesn’t include student loans, Scottish rates or tax code adjustments.</p>`,
 init(el) {
  const run = () => {
    const g = num($("#sg", el).value), pc = num($("#sp", el).value), o = $("#so", el);
    if (!Number.isFinite(g) || g < 0 || !Number.isFinite(pc) || pc < 0 || pc > 100) return o.innerHTML = `<p class="err">Enter a valid salary and pension percentage from 0 to 100.</p>`;
    const r = ukPay(g, pc), row = (l, v, c = "") => `<tr class="${c}"><td>${l}</td><td>${gbp(v)}</td><td>${gbp(v / 12)}</td><td>${gbp(v / 52)}</td></tr>`;
    o.innerHTML = `<p class="big">${gbp(r.net / 12)} a month</p><p class="sub">Your take-home pay after tax, NI and pension</p>
      <div class="tablewrap" style="margin-top:14px"><table><tr><th></th><th>Year</th><th>Month</th><th>Week</th></tr>
      ${row("Gross pay", r.gross)}${row("Pension", -r.pen)}${row("Income tax", -r.tax)}${row("National Insurance", -r.ni)}${row("Take-home pay", r.net, "total")}</table></div>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "loan-calculator", cat: "finance", name: "Loan repayment calculator", desc: "Monthly payment and total interest on a loan or mortgage.",
 ui: `<div class="row"><div><label for="la">Amount borrowed (£)</label><input id="la" inputmode="decimal" value="10000"></div><div><label for="lr">Interest rate (APR %)</label><input id="lr" inputmode="decimal" value="6.9"></div></div>
  <div class="row"><div><label for="ly">Years</label><input id="ly" type="number" min="0" value="5"></div><div><label for="lm">Extra months</label><input id="lm" type="number" min="0" max="11" value="0"></div></div><div class="out" id="lo"></div>`,
 init(el) {
  const run = () => {
    const P = num($("#la", el).value), apr = num($("#lr", el).value), r = apr / 1200, years = Number($("#ly", el).value), months = Number($("#lm", el).value), n = years * 12 + months, o = $("#lo", el);
    if (!(P > 0) || !Number.isFinite(apr) || apr < 0 || !Number.isInteger(years) || years < 0 || !Number.isInteger(months) || months < 0 || months > 11 || !(n > 0) || n > 1200) return o.innerHTML = `<p class="err">Enter a positive amount, non-negative APR, and a term of 1–1,200 months (extra months 0–11).</p>`;
    const pay = r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
    o.innerHTML = `<p class="big">${gbp(pay)} a month</p><p class="sub">for ${dur(n)}</p>
      <div class="stats" style="margin-top:14px">${stats([[gbp(pay * n), "Total repaid"], [gbp(pay * n - P), "Total interest"]])}</div>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "savings-calculator", cat: "finance", name: "Savings calculator", desc: "See how regular saving and compound interest grow.",
 ui: `<div class="row"><div><label for="vs">Starting amount (£)</label><input id="vs" inputmode="decimal" value="1000"></div><div><label for="vm">Monthly deposit (£)</label><input id="vm" inputmode="decimal" value="100"></div></div>
  <div class="row"><div><label for="vr">Interest rate (AER %)</label><input id="vr" inputmode="decimal" value="4"></div><div><label for="vy">Years</label><input id="vy" type="number" min="1" max="50" value="10"></div></div><div class="out" id="vo"></div>`,
 init(el) {
  const run = () => {
    const s = num($("#vs", el).value), d = num($("#vm", el).value), y = Number($("#vy", el).value), aer = num($("#vr", el).value), o = $("#vo", el);
    if (![s, d, y, aer].every(Number.isFinite) || s < 0 || d < 0 || aer <= -100 || !Number.isInteger(y) || y < 1 || y > 50) return o.innerHTML = `<p class="err">Enter non-negative amounts, an AER above -100%, and 1–50 whole years.</p>`;
    const r = Math.pow(1 + aer / 100, 1 / 12) - 1;
    let bal = s, rows = "";
    for (let i = 1; i <= y; i++) { for (let m = 0; m < 12; m++) bal = bal * (1 + r) + d; const dep = s + d * 12 * i; rows += `<tr><td>Year ${i}</td><td>${gbp(dep)}</td><td>${gbp(bal - dep)}</td><td>${gbp(bal)}</td></tr>`; }
    const dep = s + d * 12 * y;
    o.innerHTML = `<p class="big">${gbp(bal)}</p><p class="sub">after ${plural(y, "year")}: ${gbp(dep)} paid in and ${gbp(bal - dep)} interest</p>
      <div class="tablewrap" style="margin-top:14px"><table><tr><th></th><th>Paid in</th><th>Interest</th><th>Balance</th></tr>${rows}</table></div>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "debt-payoff", cat: "finance", name: "Debt payoff calculator", desc: "How long until a card or loan is cleared, and the interest cost.",
 ui: `<div class="row"><div><label for="db">Balance owed (£)</label><input id="db" inputmode="decimal" value="3000"></div><div><label for="dr">Interest rate (APR %)</label><input id="dr" inputmode="decimal" value="24.9"></div><div><label for="dp">Monthly payment (£)</label><input id="dp" inputmode="decimal" value="150"></div></div><div class="out" id="do"></div>`,
 init(el) {
  const run = () => {
    const b = num($("#db", el).value), apr = num($("#dr", el).value), r = apr / 1200, p = num($("#dp", el).value), o = $("#do", el);
    if (!(b > 0) || !(p > 0) || !Number.isFinite(apr) || apr < 0) return o.innerHTML = `<p class="err">Enter a positive balance and payment with a non-negative APR.</p>`;
    if (p <= b * r) return o.innerHTML = `<p class="err">A payment of ${gbp(p)} doesn’t cover the first month’s interest of ${gbp(b * r)}, so the balance would keep growing. Try a higher payment.</p>`;
    const a = payoff(b, r, p), x = payoff(b, r, p + 50), d = new Date();
     if (a.months >= 1200) return o.innerHTML = `<p class="err">At this payment, payoff takes 100 years or more. Try a larger payment.</p>`; d.setMonth(d.getMonth() + a.months);
    o.innerHTML = `<p class="big">Debt-free in ${dur(a.months)}</p><p class="sub">around ${d.toLocaleDateString("en-GB", {month: "long", year: "numeric"})}</p>
      <div class="stats" style="margin-top:14px">${stats([[gbp(a.interest), "Total interest"], [gbp(b + a.interest), "Total paid"]])}</div>
      <p class="note">Paying ${gbp(p + 50)} a month instead clears it ${dur(a.months - x.months)} sooner and saves ${gbp(a.interest - x.interest)} in interest.</p>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "vat-calculator", cat: "finance", name: "VAT calculator", desc: "Add or remove VAT at 20% or any rate.",
 ui: `<div class="row"><div><label for="va">Amount (£)</label><input id="va" inputmode="decimal" value="100"></div><div><label for="vt">VAT rate (%)</label><input id="vt" inputmode="decimal" value="20"></div></div>
  <div class="row"><label class="check"><input type="radio" name="vm" value="add" checked> Add VAT to this amount</label><label class="check"><input type="radio" name="vm" value="rem"> Remove VAT from this amount</label></div><div class="out" id="vto"></div>`,
 init(el) {
  const run = () => {
    const a = num($("#va", el).value), rate = num($("#vt", el).value), t = rate / 100, add = $("[name=vm]:checked", el).value === "add", o = $("#vto", el);
    if (!Number.isFinite(a) || !Number.isFinite(rate) || rate <= -100) return o.innerHTML = `<p class="err">Enter a valid amount and VAT rate above -100%.</p>`;
    const net = add ? a : a / (1 + t), gross = add ? a * (1 + t) : a;
    o.innerHTML = `<div class="stats">${stats([[gbp(net), "Before VAT"], [gbp(gross - net), "VAT"], [gbp(gross), "Including VAT"]])}</div>`;
  };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
 }},
{id: "budget-planner", cat: "finance", name: "50/30/20 budget planner", desc: "Split monthly income into needs, wants and savings.",
 ui: `<div class="row"><div><label for="bi">Monthly take-home pay (£)</label><input id="bi" inputmode="decimal" value="2200"></div></div><div class="out" id="bo"></div>
  <p class="note">Needs are bills you must pay: rent, council tax, energy, food, transport, minimum debt payments. Wants are everything optional. The last 20% goes to savings or paying debt off faster.</p>`,
 init(el) {
  const run = () => {
    const i = num($("#bi", el).value), o = $("#bo", el);
    if (!(i > 0)) return o.innerHTML = `<p class="err">Enter your monthly income after tax.</p>`;
    o.innerHTML = `<div class="stats">${stats([[gbp(i * .5), "Needs (50%)"], [gbp(i * .3), "Wants (30%)"], [gbp(i * .2), "Savings and debt (20%)"]])}</div>`;
  };
  el.addEventListener("input", run); run();
 }}
];

// Each tool has its own static, indexable page. Keep in sync with scripts/content.mjs (checked by tests).
const SLUGS = {
  "merge-pdf": "merge-pdf.html", "split-pdf": "split-pdf.html", "rotate-pdf": "rotate-pdf.html", "delete-pdf-pages": "delete-pdf-pages.html", "jpg-to-pdf": "jpg-to-pdf.html", "pdf-to-jpg": "pdf-to-jpg.html", "pdf-to-word": "pdf-to-word.html", "word-to-pdf": "word-to-pdf.html", "compress-pdf": "compress-pdf.html", "image-converter": "image-converter.html", "image-compressor": "image-compressor.html", "image-resizer": "image-resizer.html",
  "time-duration": "time-duration-calculator.html", "aspect-ratio": "aspect-ratio-calculator.html", "text-sorter": "text-line-sorter.html",
  "date-difference": "date-difference-calculator.html", "bmi-calculator": "bmi-calculator.html", "word-counter": "word-counter.html",
  "case-converter": "case-converter.html", "password-generator": "password-generator.html", "unit-converter": "unit-converter.html",
  "age-calculator": "age-calculator.html", "percentage-calculator": "percentage-calculator.html", "json-formatter": "json-formatter.html",
  "base64": "base64-encoder-decoder.html", "url-encoder": "url-encoder-decoder.html", "hash-generator": "hash-generator.html",
  "uuid-generator": "uuid-generator.html", "timestamp-converter": "unix-timestamp-converter.html", "colour-converter": "colour-converter.html",
  "take-home-pay": "uk-take-home-pay-calculator.html", "loan-calculator": "loan-repayment-calculator.html", "savings-calculator": "savings-calculator.html",
  "debt-payoff": "debt-payoff-calculator.html", "vat-calculator": "vat-calculator.html", "budget-planner": "budget-planner.html"
};
const CATS = [
  {id: "files", name: "PDF & image"},
  {id: "general", name: "General"},
  {id: "advanced", name: "Developer"},
  {id: "finance", name: "Finance"}
];
const app = $("#app");
const DEF_DESC = $('meta[name="description"]').content, DEF_TITLE = document.title;

// Small icon glyph for each tool card.
const ICONS = {"merge-pdf": "⧉", "split-pdf": "✂", "rotate-pdf": "↻", "delete-pdf-pages": "⌫", "jpg-to-pdf": "JPG", "pdf-to-jpg": "PDF", "pdf-to-word": "W", "word-to-pdf": "DOC", "compress-pdf": "⇲", "image-converter": "⇆", "image-compressor": "◫", "image-resizer": "⤢",
  "time-duration": "◷", "aspect-ratio": "▭", "text-sorter": "⇅", "date-difference": "▦", "bmi-calculator": "♡", "word-counter": "¶",
  "case-converter": "Aa", "password-generator": "✱", "unit-converter": "⇄", "age-calculator": "✦", "percentage-calculator": "%",
  "json-formatter": "{ }", "base64": "64", "url-encoder": "%20", "hash-generator": "#", "uuid-generator": "ID", "timestamp-converter": "⏱",
  "colour-converter": "◐", "take-home-pay": "£", "loan-calculator": "⌂", "savings-calculator": "↗", "debt-payoff": "↘", "vat-calculator": "VAT", "budget-planner": "◔"};
const HOME_ORDER = ["finance", "files", "general", "advanced"];
const POPULAR = [["Merge PDF", "merge-pdf.html"], ["PDF to Word", "pdf-to-word.html"], ["JPG to PDF", "jpg-to-pdf.html"], ["UK take-home pay", "uk-take-home-pay-calculator.html"], ["VAT", "vat-calculator.html"],
  ["Loan repayments", "loan-repayment-calculator.html"], ["Word counter", "word-counter.html"], ["Password generator", "password-generator.html"], ["Percentage", "percentage-calculator.html"]];
// Pages that are not in TOOLS but deserve their own card on the home page.
const EXTRA_CARDS = {
  finance: [{name: "Salary after tax table", desc: "Take-home pay for common UK salaries from £18,000 to £150,000.", href: "salary-after-tax.html", icon: "≡"}],
  general: [{name: "Automation builder", desc: "Chain text steps into a reusable workflow that runs in your browser.", href: "automation-builder.html", icon: "⚙"}],
};
const cards = cat => [...TOOLS.filter(x => x.cat === cat).map(x => ({name: x.name, desc: x.desc, href: SLUGS[x.id], icon: ICONS[x.id] || "✦"})), ...(EXTRA_CARDS[cat] || [])];

function showHome(scrollTo) {
  document.title = DEF_TITLE;
  $('meta[name="description"]').content = DEF_DESC;
  const cats = HOME_ORDER.map(id => CATS.find(c => c.id === id));
  app.innerHTML = `<div class="wrap">
    <section class="home-hero">
      <span class="eyebrow">FREE · PRIVATE · NO SIGN-UP</span>
      <h1>Free PDF tools, converters and <em>UK calculators</em></h1>
      <p class="lede">${TOOLS.length} fast, simple tools for money, PDFs, images, writing and code. Everything runs in your browser, so nothing you type leaves your device.</p>
      <div class="hero-search"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="Search tools, e.g. VAT, salary, JSON" aria-label="Search tools" autocomplete="off" enterkeyhint="go"><kbd aria-hidden="true">/</kbd></div>
      <p id="search-status" class="search-status" role="status" aria-live="polite"></p>
      <nav class="quick" aria-label="Popular tools"><span>Popular:</span>${POPULAR.map(([n, h]) => `<a href="${h}">${n}</a>`).join("")}</nav>
    </section>
    <nav class="cat-tabs" aria-label="Tool categories">${cats.map(c => `<a href="#${c.id}">${c.name} <small>${cards(c.id).length}</small></a>`).join("")}</nav>
    <div class="tool-sections">${cats.map(c => { const t = cards(c.id); return `<section class="tool-section" aria-labelledby="${c.id}">
      <h2 id="${c.id}">${c.name} tools <small>${plural(t.length, "tool")}</small></h2>
      <ul class="tcards">${t.map(x => `<li data-s="${esc((x.name + " " + x.desc + " " + c.name).toLowerCase())}"><a class="tcard tcard-${c.id}" href="${x.href}">
        <span class="tcard-top"><span class="tcard-icon" aria-hidden="true">${x.icon}</span><span class="tcard-tag">${c.name}</span></span>
        <strong>${x.name}</strong><span class="d">${x.desc}</span>
        <span class="tcard-cta">Open tool <span aria-hidden="true">→</span></span></a></li>`).join("")}</ul></section>`; }).join("")}
      <p class="empty" hidden>No tools match that search. Try a shorter word, or <a href="salary-after-tax.html">browse UK salaries after tax</a>.</p>
    </div>
    <section class="home-strip" aria-label="Why ToolsBravo">
      <div><strong>Private by design</strong><p>Tools run on your device. Nothing you type is uploaded, stored or tracked.</p></div>
      <div><strong>Up to date for 2026/27</strong><p>UK tax, National Insurance and VAT figures checked against GOV.UK.</p></div>
      <div><strong>Free, no account</strong><p>No sign-up, no adverts, no paywall. Works on phones and computers.</p></div>
    </section>
    <a class="promo" href="automation-builder.html"><span><strong>Automate repetitive text jobs</strong><span class="promo-sub">Chain steps like find and replace, case changes and JSON formatting into one reusable workflow.</span></span><span class="cta">Open the builder →</span></a>
  </div>`;
  const q = $("#q");
  const filter = () => {
    const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean); let total = 0;
    $$(".tool-section").forEach(c => { let n = 0; $$("li", c).forEach(li => { const m = terms.every(term => li.dataset.s.includes(term)); li.hidden = !m; if (m) n++; }); c.hidden = !n; $("h2 small", c).textContent = plural(n, "tool"); total += n; });
    $(".empty").hidden = total > 0;
    $(".cat-tabs").hidden = terms.length > 0;
    $("#search-status").textContent = terms.length ? plural(total, "matching tool") : "";
  };
  q.addEventListener("input", filter);
  q.addEventListener("keydown", e => {
    if (e.key === "Enter") { const f = $$(".tool-section li").find(li => !li.hidden); if (f) location.href = $("a", f).getAttribute("href"); }
    if (e.key === "Escape") { q.value = ""; filter(); }
  });
  if (scrollTo) $("#" + scrollTo).scrollIntoView(); else window.scrollTo(0, 0);
}

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const id = location.hash.slice(1);
  // Old #tool links (bookmarks, shared links) move to the tool's own page.
  if (SLUGS[id]) { location.replace(SLUGS[id]); return; }
  showHome(CATS.some(c => c.id === id) ? id : null);
}
$("#siteName").textContent = SITE; $$(".sn").forEach(s => s.textContent = SITE);
$("#yr").textContent = new Date().getFullYear();
$(".skip-link").addEventListener("click", e => { e.preventDefault(); app.focus(); app.scrollIntoView(); });
const PAGE_TOOL = TOOLS.find(x => x.id === document.body.dataset.tool);
if (PAGE_TOOL) PAGE_TOOL.init($(".panel"));
else if (document.body.dataset.page === "home") { window.addEventListener("hashchange", route); route(); }

// Light/dark switch. The saved choice is applied before paint by an inline script in each page head.
const themeBtn = $(".theme-btn");
if (themeBtn) {
  const dark = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  const label = () => { themeBtn.setAttribute("aria-label", dark() ? "Switch to light theme" : "Switch to dark theme"); themeBtn.textContent = dark() ? "☀" : "☾"; };
  themeBtn.addEventListener("click", () => { const next = dark() ? "light" : "dark"; document.documentElement.dataset.theme = next; try { localStorage.setItem("theme", next); } catch {} label(); });
  label();
}
// Press / to jump to the search box on the home page.
document.addEventListener("keydown", e => {
  const q = $("#q");
  if (e.key === "/" && q && document.activeElement !== q && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
});
// Highlight the current section in the "On this page" list.
const tocLinks = $$(".toc a");
if (tocLinks.length && "IntersectionObserver" in window) {
  const byId = new Map(tocLinks.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { tocLinks.forEach(a => a.classList.remove("active")); byId.get(en.target.id)?.classList.add("active"); }
  }), {rootMargin: "-20% 0px -70% 0px"});
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}
