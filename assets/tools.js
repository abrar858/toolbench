
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
// Finds the highest quality (then, if needed, a smaller width) that keeps an image under opt.targetBytes.
async function fitImage(file, opt) {
  // First find a width at which even the lowest quality fits, estimating the shrink from the size
  // ratio (file size scales roughly with pixel count), then pick the highest quality at that width.
  let width = opt.maxWidth || 0, low = null;
  for (let round = 0; round < 8; round++) {
    low = await convertImage(file, {...opt, quality: 0.3, maxWidth: width || undefined});
    if (low.blob.size <= opt.targetBytes) break;
    width = Math.round(low.w * Math.min(0.9, Math.max(0.4, Math.sqrt(opt.targetBytes / low.blob.size) * 0.95)));
    if (width < 160) throw new Error(`${file.name} can't get under ${fsize(opt.targetBytes)} without becoming unusable (smallest: ${fsize(low.blob.size)}). Choose a larger size.`);
  }
  if (low.blob.size > opt.targetBytes) throw new Error(`${file.name} can't get under ${fsize(opt.targetBytes)}. Choose a larger size.`);
  let lo = 0.3, hi = 0.95, best = low;
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) / 2, r = await convertImage(file, {...opt, quality: q, maxWidth: width || undefined});
    if (r.blob.size <= opt.targetBytes) { best = r; lo = q; } else hi = q;
  }
  return best;
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
        const {blob, w, h} = opt.targetBytes ? await fitImage(f, opt) : await convertImage(f, opt);
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

/* ---------- Excel, CSV and data tools: shared helpers (SheetJS, loaded on demand) ---------- */
const sheetLib = () => loadScript("xlsx.full.min.js").then(() => window.XLSX);
const SHEET_ACCEPT = ".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/csv";
const BOOK_MIME = {xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv;charset=utf-8"};
// CSV cells are read as text first, then converted only where nothing can be lost:
// plain numbers (keeping their decimal places), TRUE/FALSE and ISO dates (2026-01-05).
// Codes with leading zeros (0123), phone numbers (+44…), IDs longer than 15 digits and
// slash dates (05/01/2026, which could be day/month or month/day) stay exactly as written.
// Converted cells keep the original text as their displayed value.
function typeCsvCells(wb) {
  for (const ws of Object.values(wb.Sheets)) for (const [ref, c] of Object.entries(ws)) {
    if (ref[0] === "!" || !c || c.t !== "s") continue;
    const v = String(c.v).trim(); let m;
    if ((m = /^-?(?:0|[1-9]\d*)(?:\.(\d+))?$/.exec(v)) && v.replace(/\D/g, "").length <= 15) {
      const z = m[1] ? "0." + "0".repeat(m[1].length) : v.replace(/\D/g, "").length > 11 ? "0" : undefined;
      ws[ref] = {t: "n", v: Number(v), w: v, ...(z ? {z} : {})};
    } else if (/^(?:true|false)$/i.test(v)) ws[ref] = {t: "b", v: /^true$/i.test(v), w: v};
    else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v))) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      if (d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ws[ref] = {t: "d", v: d, w: v, z: "yyyy-mm-dd"};
    }
  }
  return wb;
}
async function readBook(file, opts = {}) {
  const X = await sheetLib();
  try {
    const isText = /\.(csv|tsv|txt)$/i.test(file.name);
    if (isText) { const wb = X.read((await file.text()).replace(/^﻿/, ""), {type: "string", raw: true, ...opts}); return opts.raw ? wb : typeCsvCells(wb); }
    return X.read(new Uint8Array(await file.arrayBuffer()), {type: "array", cellDates: true, ...opts});
  } catch (e) {
    throw new Error(/password|encrypt/i.test(e.message) ? `${file.name} is password-protected. Open it in Excel, remove the password, then try again.` : `${file.name} could not be read as a spreadsheet. Use .xlsx, .xls, .ods or .csv files.`);
  }
}
// Rows of displayed text, as Excel shows them.
const sheetRows = (X, ws) => X.utils.sheet_to_json(ws, {header: 1, raw: false, defval: "", blankrows: false});
const fillSheets = (sel, wb) => { sel.innerHTML = wb.SheetNames.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join(""); };
function rowsTable(rows, {max = 200, header = true} = {}) {
  if (!rows.length) return `<p class="note">This sheet is empty.</p>`;
  const width = Math.max(...rows.slice(0, max + 1).map(r => r.length)), cell = v => esc(v == null ? "" : String(v));
  const pad = r => Array.from({length: width}, (_, i) => r[i]);
  const head = header ? rows[0] : null, body = (header ? rows.slice(1) : rows).slice(0, max);
  return `<div class="sheet-wrap"><table class="sheet">${head ? `<thead><tr><th class="rn"></th>${pad(head).map(v => `<th>${cell(v)}</th>`).join("")}</tr></thead>` : ""}<tbody>${body.map((r, i) => `<tr><th class="rn">${i + (header ? 2 : 1)}</th>${pad(r).map(v => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${rows.length - (header ? 1 : 0) > max ? `<p class="note">Showing the first ${max.toLocaleString("en-GB")} of ${(rows.length - (header ? 1 : 0)).toLocaleString("en-GB")} rows.</p>` : ""}`;
}
function saveBook(X, wb, name, type = "xlsx") {
  const out = X.write(wb, {bookType: type, type: "array", compression: true});
  const blob = new Blob([out], {type: BOOK_MIME[type] || "application/octet-stream"});
  saveBlob(blob, name); return blob;
}
// Excel sheet names: max 31 characters, no : \ / ? * [ ], unique in the workbook.
function safeSheetName(name, used) {
  let base = String(name).replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Sheet", n = base, k = 2;
  while (used.has(n.toLowerCase())) { const suffix = ` (${k++})`; n = base.slice(0, 31 - suffix.length) + suffix; }
  used.add(n.toLowerCase()); return n;
}
const pickOneFile = (el, prefix, onFile) => wireDrop(el, `${prefix}-in`, f => onFile(f[0]));
// Converts "1,234.50", "£12", "-7%" style text into numbers; leaves anything else as text.
function toNumberish(s) {
  const t = String(s).trim();
  if (!/^[-+(]?[£$€]?\s?\d{1,3}(,\d{3})*(\.\d+)?\)?%?$|^[-+]?[£$€]?\d+(\.\d+)?%?$/.test(t) || /^0\d/.test(t)) return s;
  const neg = /^\(.*\)$/.test(t) || t.startsWith("-"), pct = t.endsWith("%");
  const n = Number(t.replace(/[^\d.]/g, "")) * (neg ? -1 : 1);
  return Number.isFinite(n) ? (pct ? n / 100 : n) : s;
}
// Rebuilds a table from the positions of text on a PDF page.
function pdfTable(items) {
  const parts = items.filter(it => "str" in it && it.str.trim()).map(it => ({x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10, s: it.str}));
  parts.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const p of parts) { const r = rows.find(r => Math.abs(r.y - p.y) <= Math.max(2, p.h * .45)); if (r) r.parts.push(p); else rows.push({y: p.y, parts: [p]}); }
  rows.sort((a, b) => b.y - a.y);
  // Merge text runs that are close together into cells.
  const cellRows = rows.map(r => {
    const ps = r.parts.sort((a, b) => a.x - b.x), cells = [];
    for (const p of ps) { const c = cells[cells.length - 1]; if (c && p.x - (c.x + c.w) < Math.max(3, p.h * .55)) { c.s += (p.x - (c.x + c.w) > p.h * .15 ? " " : "") + p.s; c.w = p.x + p.w - c.x; } else cells.push({...p}); }
    return cells;
  });
  // Column positions shared by all rows: cluster the left edges of cells.
  const lefts = cellRows.flat().map(c => c.x).sort((a, b) => a - b), cols = [];
  for (const x of lefts) { const c = cols[cols.length - 1]; if (c && x - c.max < 12) { c.max = x; c.n++; } else cols.push({min: x, max: x, n: 1}); }
  const colOf = x => { let best = 0; cols.forEach((c, i) => { if (x >= c.min - 6) best = i; }); return best; };
  return cellRows.map(cells => { const row = []; cells.forEach(c => { const i = colOf(c.x); row[i] = row[i] ? row[i] + " " + c.s.trim() : c.s.trim(); }); return Array.from({length: Math.max(row.length, 1)}, (_, i) => row[i] ?? ""); });
}
// Preview a printable HTML document in an iframe and print it to PDF.
const printDoc = (title, css, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;

/* ---------- Word (.docx) merging ----------
   The first document is the base: its page setup, headers, footers and styles are kept.
   Each later document's body is appended, with its images, links, lists and missing styles
   brought across. Footnotes, comments, charts and embedded objects from later documents
   are dropped rather than left pointing at parts that don't exist. */
const OX = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  pr: "http://schemas.openxmlformats.org/package/2006/relationships",
  ct: "http://schemas.openxmlformats.org/package/2006/content-types",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  rel: t => "http://schemas.openxmlformats.org/officeDocument/2006/relationships/" + t,
};
const MEDIA_TYPES = {png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", emf: "image/x-emf", wmf: "image/x-wmf", svg: "image/svg+xml", webp: "image/webp"};
const DROP_IN_APPENDED = ["footnoteReference", "endnoteReference", "commentReference", "commentRangeStart", "commentRangeEnd", "bookmarkStart", "bookmarkEnd", "headerReference", "footerReference"];
const wEls = (node, name) => [...node.getElementsByTagNameNS(OX.w, name)];
const wVal = el => el.getAttributeNS(OX.w, "val");
const ancestor = (el, name, ns = OX.w) => { for (let p = el.parentNode; p && p.nodeType === 1; p = p.parentNode) if (p.localName === name && p.namespaceURI === ns) return p; return null; };
async function mergeDocx(files, pageBreak) {
  const {unzipSync, zipSync, strToU8, strFromU8} = await zipLib();
  const parse = (bytes, name) => {
    const d = new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error(`${name} contains a damaged part and can't be merged.`);
    return d;
  };
  const xml = d => { const s = new XMLSerializer().serializeToString(d); return strToU8(s.startsWith("<?xml") ? s : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${s}`); };
  const open = async f => {
    if (!/\.docx$/i.test(f.name)) throw new Error(`${f.name} is not a .docx file. Open older .doc files in Word or Google Docs and save them as .docx first.`);
    let z; try { z = unzipSync(new Uint8Array(await f.arrayBuffer())); } catch { throw new Error(`${f.name} could not be opened. It may be damaged or password-protected.`); }
    if (!z["word/document.xml"]) throw new Error(`${f.name} is not a Word document.`);
    return z;
  };
  const resolve = t => t.startsWith("/") ? t.slice(1) : "word/" + t.replace(/^\.\//, "");
  const relsOf = (z, name) => z["word/_rels/document.xml.rels"] ? parse(z["word/_rels/document.xml.rels"], name) : null;
  const relTarget = (rels, type) => rels && [...rels.documentElement.children].find(r => r.getAttribute("Type") === OX.rel(type) && r.getAttribute("TargetMode") !== "External")?.getAttribute("Target");

  const base = await open(files[0]), doc = parse(base["word/document.xml"], files[0].name);
  const body = doc.getElementsByTagNameNS(OX.w, "body")[0];
  const finalSect = [...body.childNodes].filter(n => n.nodeType === 1).pop();
  const anchor = finalSect && finalSect.localName === "sectPr" ? finalSect : null;
  const rels = relsOf(base, files[0].name) || new DOMParser().parseFromString(`<Relationships xmlns="${OX.pr}"/>`, "application/xml");
  const ct = parse(base["[Content_Types].xml"], files[0].name);
  const relIds = new Set([...rels.documentElement.children].map(r => r.getAttribute("Id")));
  const addRel = (type, target, external) => {
    let id, k = relIds.size + 1; do id = "rIdTb" + k++; while (relIds.has(id)); relIds.add(id);
    const el = rels.createElementNS(OX.pr, "Relationship"); el.setAttribute("Id", id); el.setAttribute("Type", OX.rel(type)); el.setAttribute("Target", target);
    if (external) el.setAttribute("TargetMode", "External");
    rels.documentElement.appendChild(el); return id;
  };
  const ctHas = (tag, attr, v) => [...ct.documentElement.children].some(n => n.localName === tag && n.getAttribute(attr).toLowerCase() === v.toLowerCase());
  const ensureDefault = ext => { if (ctHas("Default", "Extension", ext)) return; const el = ct.createElementNS(OX.ct, "Default"); el.setAttribute("Extension", ext); el.setAttribute("ContentType", MEDIA_TYPES[ext] || "application/octet-stream"); ct.documentElement.insertBefore(el, ct.documentElement.firstChild); };
  const ensurePart = (path, type, relType, root) => {
    if (base[path]) return parse(base[path], files[0].name);
    const el = ct.createElementNS(OX.ct, "Override"); el.setAttribute("PartName", "/" + path); el.setAttribute("ContentType", type); ct.documentElement.appendChild(el);
    addRel(relType, path.replace(/^word\//, ""));
    return new DOMParser().parseFromString(`<w:${root} xmlns:w="${OX.w}"/>`, "application/xml");
  };
  // Base parts that later documents may add to.
  let numPath = relTarget(rels, "numbering") ? resolve(relTarget(rels, "numbering")) : "word/numbering.xml", numbering = null;
  const stylesPath = relTarget(rels, "styles") ? resolve(relTarget(rels, "styles")) : null, styles = stylesPath && base[stylesPath] ? parse(base[stylesPath], files[0].name) : null;
  const styleIds = new Set(styles ? [...styles.getElementsByTagNameNS(OX.w, "style")].map(s => s.getAttributeNS(OX.w, "styleId")) : []);
  let docPrId = Math.max(0, ...[...doc.getElementsByTagNameNS(OX.wp, "docPr")].map(e => +e.getAttribute("id") || 0));
  let media = 0, dropped = 0;

  for (const [k, f] of files.slice(1).entries()) {
    const z = await open(f), d = parse(z["word/document.xml"], f.name), b = d.getElementsByTagNameNS(OX.w, "body")[0], r = relsOf(z, f.name);
    // Relationships: copy images and external links, mark everything else as unsupported.
    const map = new Map();
    if (r) for (const rel of [...r.documentElement.children]) {
      const id = rel.getAttribute("Id"), type = rel.getAttribute("Type"), target = rel.getAttribute("Target"), external = rel.getAttribute("TargetMode") === "External";
      if (type === OX.rel("image") && !external && z[resolve(target)]) {
        const ext = (resolve(target).split(".").pop() || "bin").toLowerCase(), name = `media/toolsbravo-${k + 2}-${++media}.${ext}`;
        base["word/" + name] = z[resolve(target)]; ensureDefault(ext); map.set(id, addRel("image", name));
      } else if (external && (type === OX.rel("hyperlink") || type === OX.rel("image"))) map.set(id, addRel(type.split("/").pop(), target, true));
      else map.set(id, null);
    }
    // Lists: copy numbering definitions with new ids.
    const numMap = new Map(), otherNumPath = relTarget(r, "numbering") && resolve(relTarget(r, "numbering"));
    if (otherNumPath && z[otherNumPath]) {
      numbering ||= ensurePart(numPath, "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml", "numbering", "numbering");
      const src = parse(z[otherNumPath], f.name), root = numbering.documentElement;
      const absIds = wEls(numbering, "abstractNum").map(a => +a.getAttributeNS(OX.w, "abstractNumId")), numIds = wEls(numbering, "num").map(n => +n.getAttributeNS(OX.w, "numId"));
      let nextAbs = Math.max(-1, ...absIds) + 1, nextNum = Math.max(0, ...numIds) + 1; const absMap = new Map();
      const firstNum = wEls(numbering, "num")[0] || null;
      for (const a of wEls(src, "abstractNum")) { const c = numbering.importNode(a, true); absMap.set(c.getAttributeNS(OX.w, "abstractNumId"), String(nextAbs)); c.setAttributeNS(OX.w, "w:abstractNumId", String(nextAbs++)); root.insertBefore(c, firstNum); }
      for (const n of wEls(src, "num")) { const c = numbering.importNode(n, true); numMap.set(c.getAttributeNS(OX.w, "numId"), String(nextNum)); c.setAttributeNS(OX.w, "w:numId", String(nextNum++)); const ref = wEls(c, "abstractNumId")[0]; if (ref) ref.setAttributeNS(OX.w, "w:val", absMap.get(wVal(ref)) ?? wVal(ref)); root.appendChild(c); }
    }
    const fixNumIds = node => wEls(node, "numId").forEach(e => e.setAttributeNS(OX.w, "w:val", numMap.get(wVal(e)) ?? "0"));
    // Styles: bring across styles the base document doesn't have.
    const otherStyles = relTarget(r, "styles") && z[resolve(relTarget(r, "styles"))];
    if (styles && otherStyles) for (const s of [...parse(otherStyles, f.name).getElementsByTagNameNS(OX.w, "style")]) {
      const id = s.getAttributeNS(OX.w, "styleId"); if (styleIds.has(id)) continue;
      const c = styles.importNode(s, true); fixNumIds(c); styles.documentElement.appendChild(c); styleIds.add(id);
    }
    // Body content.
    if (pageBreak) { const p = doc.createElementNS(OX.w, "w:p"), run = doc.createElementNS(OX.w, "w:r"), br = doc.createElementNS(OX.w, "w:br"); br.setAttributeNS(OX.w, "w:type", "page"); run.appendChild(br); p.appendChild(run); body.insertBefore(p, anchor); }
    for (const n of [...b.childNodes].filter(n => n.nodeType === 1 && n.localName !== "sectPr")) {
      const c = doc.importNode(n, true), all = [c, ...c.getElementsByTagName("*")], unsupported = [];
      for (const el of all) for (const a of [...el.attributes]) {
        if (a.namespaceURI === OX.r) { const v = map.get(a.value); if (v) el.setAttributeNS(OX.r, a.name, v); else unsupported.push(el); }
        else if (a.namespaceURI === OX.w14 && (a.localName === "paraId" || a.localName === "textId")) el.removeAttributeNode(a);
      }
      for (const el of unsupported) {
        if (!el.parentNode) continue;
        if (el.localName === "hyperlink") { while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el); el.remove(); continue; }
        (ancestor(el, "r") || el).remove(); dropped++;
      }
      for (const name of DROP_IN_APPENDED) wEls(c, name).forEach(e => { if (/Reference$/.test(name) && name !== "headerReference" && name !== "footerReference") dropped++; e.remove(); });
      fixNumIds(c);
      for (const e of c.getElementsByTagNameNS(OX.wp, "docPr")) e.setAttribute("id", String(++docPrId));
      body.insertBefore(c, anchor);
    }
  }
  base["word/document.xml"] = xml(doc); base["word/_rels/document.xml.rels"] = xml(rels); base["[Content_Types].xml"] = xml(ct);
  if (numbering) base[numPath] = xml(numbering);
  if (styles) base[stylesPath] = xml(styles);
  return {blob: new Blob([zipSync(base)], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}), dropped};
}

// MD5 (RFC 1321) for the hash generator. Browsers' Web Crypto has no MD5, and MD5 is still widely used for file checksums.
function md5(bytes) {
  const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const len = bytes.length, total = ((len + 8) >>> 6) + 1, words = new Uint32Array(total * 16);
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  words[total * 16 - 2] = (len * 8) >>> 0; words[total * 16 - 1] = Math.floor(len / 536870912);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < words.length; o += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const s = S[(i >> 4) * 4 + (i % 4)], x = (a + f + K[i] + words[o + g]) >>> 0;
      a = d; d = c; c = b; b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(sh => ((v >>> sh) & 255).toString(16).padStart(2, "0")).join("")).join("");
}
// Text half of the Base64 tool (the file half is added in the tool itself).
const B64_TEXT = twoWay(s => { let b = ""; new TextEncoder().encode(s).forEach(x => b += String.fromCharCode(x)); return btoa(b); },
  s => { let t = s.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/"); t += "=".repeat((4 - t.length % 4) % 4); return new TextDecoder("utf-8", {fatal: true}).decode(Uint8Array.from(atob(t), c => c.charCodeAt(0))); },
  "Encode", "Decode", "That isn’t valid Base64 text. If it is an image or file, use Base64 to file below.");

const TOOLS = [
/* ---------- WORD ---------- */
{id: "merge-word", cat: "office", name: "Merge Word documents", desc: "Combine several Word (.docx) files into one document.",
 ui: `${dropUI("mw-in", ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Choose Word files (.docx)", true)}<ol class="file-list" id="mw-list"></ol>
  <label class="check"><input id="mw-break" type="checkbox" checked> Start each document on a new page</label>
  <p class="note">The first document sets the page size, margins, headers and footers. Text, headings, tables, images, links and lists from every document are kept.</p>
  <div class="btns"><button class="primary" id="mw-go" disabled>Merge documents</button><button id="mw-clear" disabled>Clear</button></div><p id="mw-msg" class="note" aria-live="polite">Add two or more .docx files. Use the arrows to set the order.</p><div id="mw-out"></div>`,
 init(el) {
  const files = [], list = $("#mw-list", el), go = $("#mw-go", el), msg = $("#mw-msg", el);
  const changed = () => { fileListUI(list, files); go.disabled = files.length < 2; $("#mw-clear", el).disabled = !files.length; };
  wireDrop(el, "mw-in", f => {
    const ok = f.filter(x => /\.docx$/i.test(x.name)), skipped = f.length - ok.length;
    files.push(...ok); changed();
    if (skipped) say(msg, `${plural(skipped, "file")} skipped: only .docx files can be merged. Save older .doc files as .docx first.`, true);
  });
  wireFileList(list, files, changed);
  $("#mw-clear", el).onclick = () => { files.length = 0; changed(); $("#mw-out", el).innerHTML = ""; };
  go.onclick = async () => {
    busy(go, true, "Merging…");
    try {
      const {blob, dropped} = await mergeDocx(files, $("#mw-break", el).checked);
      showResults($("#mw-out", el), [{name: "merged.docx", blob, note: `${plural(files.length, "document")} · ${fsize(blob.size)}`}]);
      say(msg, `Merged ${plural(files.length, "document")}.${dropped ? ` ${plural(dropped, "footnote, comment or chart")} from the later documents couldn't be carried over.` : ""}`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},

/* ---------- EXCEL & DATA ---------- */
{id: "pdf-to-excel", cat: "office", name: "PDF to Excel", desc: "Turn tables in a PDF into an editable Excel spreadsheet.",
 ui: `${dropUI("px-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="px-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="px-mode">Layout</label><select id="px-mode"><option value="pages">One sheet for each page</option><option value="one">All pages in one sheet</option></select></div>
  <div><label for="px-pages">Pages (blank for all)</label><input id="px-pages" placeholder="e.g. 2-4" autocomplete="off"></div></div>
  <label class="check"><input id="px-num" type="checkbox" checked> Turn numbers like 1,234.50 and £12 into real numbers</label>
  <div class="btns"><button class="primary" id="px-go" disabled>Convert to Excel</button></div><p id="px-msg" class="note" aria-live="polite">Choose a PDF to start. Works with PDFs that contain real text, such as bank statements, invoices and reports.</p><div id="px-out"></div>`,
 init(el) {
  let file = null; const go = $("#px-go", el), msg = $("#px-msg", el);
  pickOneFile(el, "px", f => { file = f; $("#px-out", el).innerHTML = ""; const p = $("#px-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)}`; go.disabled = false; say(msg, "Press Convert to Excel."); });
  go.onclick = async () => {
    busy(go, true, "Converting…");
    try {
      const [X, doc] = await Promise.all([sheetLib(), openPdfJs(file)]), wb = X.utils.book_new(), used = new Set(), num = $("#px-num", el).checked;
      const idx = $("#px-pages", el).value.trim() ? pageGroups($("#px-pages", el).value, doc.numPages).flat() : Array.from({length: doc.numPages}, (_, i) => i);
      const all = []; let firstRows = null, cells = 0;
      for (const i of idx) {
        say(msg, `Reading page ${i + 1} of ${doc.numPages}…`);
        const page = await doc.getPage(i + 1), rows = pdfTable((await page.getTextContent()).items).map(r => num ? r.map(toNumberish) : r); page.cleanup();
        cells += rows.flat().filter(v => v !== "").length; firstRows ||= rows.length ? rows : null;
        if ($("#px-mode", el).value === "pages") X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows.length ? rows : [[""]]), safeSheetName(`Page ${i + 1}`, used));
        else all.push(...rows, []);
      }
      doc.destroy();
      if (!cells) throw new Error("No text was found. This PDF is probably a scanned image, which needs OCR (text recognition) before it can be converted.");
      if (!wb.SheetNames.length) X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(all), "Sheet1");
      const blob = new Blob([X.write(wb, {bookType: "xlsx", type: "array", compression: true})], {type: BOOK_MIME.xlsx});
      $("#px-out", el).innerHTML = `<h3 class="out-title">Preview of the first page</h3>${rowsTable(firstRows || [[""]], {max: 50})}`;
      showResults($("#px-out", el).appendChild(document.createElement("div")), [{name: `${baseName(file)}.xlsx`, blob, note: plural(wb.SheetNames.length, "sheet")}]);
      say(msg, "Done. Check the preview: columns are rebuilt from the position of the text, so merged or wrapped cells may need tidying.");
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "excel-to-pdf", cat: "office", name: "Excel to PDF", desc: "Turn an Excel or CSV sheet into a clean, printable PDF.",
 ui: `${dropUI("ep-in", SHEET_ACCEPT, "Choose an Excel or CSV file", false)}<p id="ep-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="ep-sheet">Sheet</label><select id="ep-sheet" disabled><option>Choose a file first</option></select></div>
  <div><label for="ep-orient">Orientation</label><select id="ep-orient"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div>
  <div><label for="ep-size">Paper</label><select id="ep-size"><option value="A4">A4</option><option value="letter">US Letter</option></select></div></div>
  <label class="check"><input id="ep-grid" type="checkbox" checked> Show gridlines</label> <label class="check"><input id="ep-head" type="checkbox" checked> Repeat the first row as a header on every page</label>
  <p id="ep-msg" class="note" aria-live="polite">Choose a spreadsheet to preview it.</p>
  <div id="ep-out" hidden><div class="btns"><button class="primary" id="ep-print">Save as PDF</button></div><p class="note">In the print window, choose <strong>Save as PDF</strong> as the printer.</p><iframe id="ep-frame" class="doc-preview" title="Spreadsheet preview"></iframe></div>`,
 init(el) {
  let wb = null, X = null, name = ""; const msg = $("#ep-msg", el), sel = $("#ep-sheet", el), frame = $("#ep-frame", el);
  const render = () => {
    if (!wb) return;
    const rows = sheetRows(X, wb.Sheets[wb.SheetNames[+sel.value]]), grid = $("#ep-grid", el).checked, head = $("#ep-head", el).checked && rows.length > 1;
    const width = Math.max(1, ...rows.map(r => r.length)), cell = v => esc(v ?? ""), pad = r => Array.from({length: width}, (_, i) => `<td>${cell(r[i])}</td>`).join("");
    frame.srcdoc = printDoc(`${name} - ${wb.SheetNames[+sel.value]}`, `@page{size:${$("#ep-size", el).value} ${$("#ep-orient", el).value};margin:12mm}body{font:9pt/1.35 Calibri,Carlito,Arial,sans-serif;color:#000;background:#fff;margin:0;padding:8px}h1{font-size:12pt;margin:0 0 8px}table{border-collapse:collapse;width:100%}td{padding:3px 5px;vertical-align:top;${grid ? "border:1px solid #b7b7b7;" : ""}}thead td{font-weight:700;background:#f1f3f5}tr{page-break-inside:avoid}@media print{body{padding:0}}`,
      `<h1>${esc(wb.SheetNames[+sel.value])}</h1>${rows.length ? `<table>${head ? `<thead><tr>${pad(rows[0])}</tr></thead>` : ""}<tbody>${(head ? rows.slice(1) : rows).map(r => `<tr>${pad(r)}</tr>`).join("")}</tbody></table>` : "<p>This sheet is empty.</p>"}`);
    $("#ep-out", el).hidden = false;
    say(msg, `Preview of ${plural(rows.length, "row")}. Change the options above to update it.`);
  };
  pickOneFile(el, "ep", async f => {
    try { X = await sheetLib(); wb = await readBook(f); name = baseName(f); fillSheets(sel, wb); sel.disabled = false; const p = $("#ep-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)} · ${plural(wb.SheetNames.length, "sheet")}`; render(); }
    catch (e) { say(msg, e.message, true); }
  });
  ["ep-sheet", "ep-orient", "ep-size", "ep-grid", "ep-head"].forEach(id => $("#" + id, el).addEventListener("change", render));
  $("#ep-print", el).onclick = () => { frame.contentWindow.focus(); frame.contentWindow.print(); };
 }},
{id: "csv-to-excel", cat: "office", name: "CSV to Excel", desc: "Convert CSV files into Excel spreadsheets (.xlsx).",
 ui: `${dropUI("cx-in", ".csv,.tsv,.txt,text/csv", "Choose CSV files", true)}<p id="cx-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="cx-sep">Separator</label><select id="cx-sep"><option value="">Detect automatically</option><option value=",">Comma ,</option><option value=";">Semicolon ;</option><option value="\t">Tab</option><option value="|">Pipe |</option></select></div>
  <div><label for="cx-mode">Output</label><select id="cx-mode"><option value="each">One Excel file per CSV</option><option value="one">One Excel file, one sheet per CSV</option></select></div></div>
  <label class="check"><input id="cx-text" type="checkbox"> Keep every value as text (no numbers or dates; codes with leading zeros are kept either way)</label>
  <div class="btns"><button class="primary" id="cx-go" disabled>Convert to Excel</button></div><p id="cx-msg" class="note" aria-live="polite">Choose one or more CSV files.</p><div id="cx-out"></div>`,
 init(el) {
  let files = []; const go = $("#cx-go", el), msg = $("#cx-msg", el);
  wireDrop(el, "cx-in", f => { files = f; const p = $("#cx-file", el); p.hidden = false; p.textContent = `${plural(f.length, "file")} · ${fsize(f.reduce((a, x) => a + x.size, 0))}`; go.disabled = false; $("#cx-out", el).innerHTML = ""; say(msg, "Ready to convert."); });
  go.onclick = async () => {
    busy(go, true, "Converting…");
    try {
      const X = await sheetLib(), sep = $("#cx-sep", el).value, text = $("#cx-text", el).checked, one = $("#cx-mode", el).value === "one", items = [], book = X.utils.book_new(), used = new Set();
      let preview = null;
      for (const f of files) {
        const src = (await f.text()).replace(/^﻿/, ""), opts = {type: "string", raw: true, ...(sep ? {FS: sep} : {})};
        let wb; try { wb = X.read(src, opts); if (!text) typeCsvCells(wb); } catch { throw new Error(`${f.name} could not be read as CSV.`); }
        const ws = wb.Sheets[wb.SheetNames[0]]; preview ||= sheetRows(X, ws);
        if (one) X.utils.book_append_sheet(book, ws, safeSheetName(baseName(f), used));
        else { const nb = X.utils.book_new(); X.utils.book_append_sheet(nb, ws, safeSheetName(baseName(f), new Set())); items.push({name: `${baseName(f)}.xlsx`, blob: new Blob([X.write(nb, {bookType: "xlsx", type: "array", compression: true})], {type: BOOK_MIME.xlsx})}); }
      }
      if (one) items.push({name: "converted.xlsx", blob: new Blob([X.write(book, {bookType: "xlsx", type: "array", compression: true})], {type: BOOK_MIME.xlsx}), note: plural(book.SheetNames.length, "sheet")});
      $("#cx-out", el).innerHTML = `<h3 class="out-title">Preview</h3>${rowsTable(preview || [], {max: 20})}`;
      showResults($("#cx-out", el).appendChild(document.createElement("div")), items);
      say(msg, `${plural(items.length, "Excel file")} ready.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "excel-to-csv", cat: "office", name: "Excel to CSV", desc: "Export Excel sheets to CSV with the separator you need.",
 ui: `${dropUI("xc-in", SHEET_ACCEPT, "Choose an Excel file", false)}<p id="xc-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="xc-sheet">Sheet</label><select id="xc-sheet" disabled><option>Choose a file first</option></select></div>
  <div><label for="xc-sep">Separator</label><select id="xc-sep"><option value=",">Comma ,</option><option value=";">Semicolon ; (European Excel)</option><option value="\t">Tab</option><option value="|">Pipe |</option></select></div></div>
  <label class="check"><input id="xc-all" type="checkbox"> Export every sheet (downloads a ZIP)</label> <label class="check"><input id="xc-bom" type="checkbox" checked> Add a UTF-8 marker so Excel shows £, € and accents correctly</label>
  <div class="btns"><button class="primary" id="xc-go" disabled>Convert to CSV</button></div><p id="xc-msg" class="note" aria-live="polite">Choose an .xlsx, .xls or .ods file.</p><div id="xc-out"></div>`,
 init(el) {
  let wb = null, file = null; const go = $("#xc-go", el), msg = $("#xc-msg", el), sel = $("#xc-sheet", el);
  pickOneFile(el, "xc", async f => {
    try { wb = await readBook(f); file = f; fillSheets(sel, wb); sel.disabled = false; go.disabled = false; const p = $("#xc-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)} · ${plural(wb.SheetNames.length, "sheet")}`; $("#xc-out", el).innerHTML = ""; say(msg, "Choose a sheet and separator."); }
    catch (e) { say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Converting…");
    try {
      const X = await sheetLib(), FS = $("#xc-sep", el).value, bom = $("#xc-bom", el).checked ? "﻿" : "";
      const names = $("#xc-all", el).checked ? wb.SheetNames : [wb.SheetNames[+sel.value]];
      const items = names.map(n => ({name: `${baseName(file)}${names.length > 1 || wb.SheetNames.length > 1 ? "-" + n.replace(/[\\/:*?"<>|]/g, "_") : ""}.${FS === "\t" ? "tsv" : "csv"}`,
        blob: new Blob([bom + X.utils.sheet_to_csv(wb.Sheets[n], {FS, blankrows: false})], {type: BOOK_MIME.csv})}));
      $("#xc-out", el).innerHTML = `<h3 class="out-title">Preview</h3>${rowsTable(sheetRows(X, wb.Sheets[names[0]]), {max: 20})}`;
      showResults($("#xc-out", el).appendChild(document.createElement("div")), items);
      say(msg, `${plural(items.length, "file")} ready.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "merge-excel", cat: "office", name: "Merge Excel files", desc: "Combine several Excel or CSV files into one workbook or one sheet.",
 ui: `${dropUI("me-in", SHEET_ACCEPT, "Choose Excel or CSV files", true)}<ol class="file-list" id="me-list"></ol>
  <label for="me-mode">How to merge</label><select id="me-mode"><option value="sheets">Keep each sheet as its own tab in one workbook</option><option value="stack">Stack the rows of every file into one sheet</option></select>
  <div id="me-stack-opts" hidden><label class="check"><input id="me-head" type="checkbox" checked> Files have a header row (keep it once and match columns by their names)</label> <label class="check"><input id="me-src" type="checkbox" checked> Add a column showing the source file</label></div>
  <div class="btns"><button class="primary" id="me-go" disabled>Merge files</button><button id="me-clear" disabled>Clear</button></div><p id="me-msg" class="note" aria-live="polite">Add two or more files. Use the arrows to set the order.</p><div id="me-out"></div>`,
 init(el) {
  const files = [], list = $("#me-list", el), go = $("#me-go", el), msg = $("#me-msg", el), mode = $("#me-mode", el);
  const changed = () => { fileListUI(list, files); go.disabled = files.length < 2; $("#me-clear", el).disabled = !files.length; };
  mode.onchange = () => { $("#me-stack-opts", el).hidden = mode.value !== "stack"; };
  wireDrop(el, "me-in", f => { files.push(...f); changed(); });
  wireFileList(list, files, changed);
  $("#me-clear", el).onclick = () => { files.length = 0; changed(); };
  go.onclick = async () => {
    busy(go, true, "Merging…");
    try {
      const X = await sheetLib(), out = X.utils.book_new(), used = new Set();
      if (mode.value === "sheets") {
        for (const f of files) { const wb = await readBook(f); wb.SheetNames.forEach(n => X.utils.book_append_sheet(out, wb.Sheets[n], safeSheetName(wb.SheetNames.length > 1 ? `${baseName(f)} - ${n}` : baseName(f), used))); }
      } else {
        const head = $("#me-head", el).checked, src = $("#me-src", el).checked, rows = []; let header = null;
        const key = v => String(v ?? "").trim().toLowerCase(), cols = [], colIndex = new Map(), addCol = name => { const k = key(name); if (!colIndex.has(k)) { colIndex.set(k, cols.length); cols.push(name); } return colIndex.get(k); };
        for (const f of files) {
          const wb = await readBook(f), data = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: true, defval: "", blankrows: false});
          if (!data.length) continue;
          let body = data;
          if (head) {
            // Match columns by header name, so files whose columns are in a different order still line up.
            const map = data[0].map((h, i) => key(h) ? addCol(h) : addCol(`Column ${i + 1}`));
            body = data.slice(1).map(r => { const out = []; r.forEach((v, i) => { out[map[i]] = v; }); return out; });
            header = cols;
          }
          rows.push(...body.map(r => src ? [f.name, ...r] : r));
        }
        const width = header ? header.length : 0, fill = r => header ? Array.from({length: width + (src ? 1 : 0)}, (_, i) => r[i] ?? "") : r;
        X.utils.book_append_sheet(out, X.utils.aoa_to_sheet(header ? [src ? ["Source file", ...header] : header, ...rows.map(fill)] : rows), "Merged");
      }
      const blob = new Blob([X.write(out, {bookType: "xlsx", type: "array", compression: true, cellDates: true})], {type: BOOK_MIME.xlsx});
      showResults($("#me-out", el), [{name: "merged.xlsx", blob, note: plural(out.SheetNames.length, "sheet")}]);
      say(msg, mode.value === "sheets" ? `Merged ${plural(files.length, "file")} into ${plural(out.SheetNames.length, "sheet")}.` : `Merged ${plural(files.length, "file")} into one sheet of ${plural(sheetRows(X, out.Sheets.Merged).length, "row")}.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "excel-to-json", cat: "office", name: "Excel to JSON", desc: "Convert an Excel or CSV sheet into JSON for code and APIs.",
 ui: `${dropUI("xj-in", SHEET_ACCEPT, "Choose an Excel or CSV file", false)}<p id="xj-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="xj-sheet">Sheet</label><select id="xj-sheet" disabled><option>Choose a file first</option></select></div>
  <div><label for="xj-shape">JSON shape</label><select id="xj-shape"><option value="objects">Array of objects (first row = keys)</option><option value="arrays">Array of rows (arrays)</option></select></div>
  <div><label for="xj-indent">Indentation</label><select id="xj-indent"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="0">Minified</option></select></div></div>
  <p id="xj-msg" class="note" aria-live="polite">Choose a spreadsheet.</p>
  <div id="xj-out" hidden><label for="xj-text">JSON</label><textarea id="xj-text" class="mono" readonly></textarea><div class="btns"><button class="primary" id="xj-dl">Download .json</button><button id="xj-copy">Copy JSON</button></div></div>`,
 init(el) {
  let wb = null, X = null, name = ""; const msg = $("#xj-msg", el), sel = $("#xj-sheet", el);
  const render = () => {
    if (!wb) return;
    const ws = wb.Sheets[wb.SheetNames[+sel.value]], objects = $("#xj-shape", el).value === "objects";
    const data = objects ? X.utils.sheet_to_json(ws, {raw: true, defval: null, blankrows: false}) : X.utils.sheet_to_json(ws, {header: 1, raw: true, defval: null, blankrows: false});
    const ind = +$("#xj-indent", el).value, text = JSON.stringify(data, (k, v) => v instanceof Date ? v.toISOString() : v, ind || undefined);
    $("#xj-text", el).value = text; $("#xj-out", el).hidden = false;
    say(msg, `${plural(data.length, objects ? "record" : "row")} · ${fsize(new Blob([text]).size)}.${objects ? " Keys come from the first row; empty cells become null." : ""}`);
  };
  pickOneFile(el, "xj", async f => {
    try { X = await sheetLib(); wb = await readBook(f); name = baseName(f); fillSheets(sel, wb); sel.disabled = false; const p = $("#xj-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)} · ${plural(wb.SheetNames.length, "sheet")}`; render(); }
    catch (e) { say(msg, e.message, true); }
  });
  ["xj-sheet", "xj-shape", "xj-indent"].forEach(id => $("#" + id, el).addEventListener("change", render));
  $("#xj-dl", el).onclick = () => saveBlob(new Blob([$("#xj-text", el).value], {type: "application/json"}), `${name}.json`);
  $("#xj-copy", el).onclick = e => copy($("#xj-text", el).value, e.target);
 }},
{id: "remove-duplicate-rows", cat: "office", name: "Remove duplicate rows", desc: "Find and delete duplicate rows in an Excel or CSV file.",
 ui: `${dropUI("rd-in", SHEET_ACCEPT, "Choose an Excel or CSV file", false)}<p id="rd-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="rd-sheet">Sheet</label><select id="rd-sheet" disabled><option>Choose a file first</option></select></div>
  <div><label for="rd-out-type">Save as</label><select id="rd-out-type"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV</option></select></div></div>
  <label class="check"><input id="rd-head" type="checkbox" checked> First row is a header</label> <label class="check"><input id="rd-case" type="checkbox"> Ignore upper/lower case and extra spaces</label>
  <fieldset id="rd-cols" class="col-pick" hidden><legend>Compare these columns</legend><div id="rd-col-list"></div></fieldset>
  <div class="btns"><button class="primary" id="rd-go" disabled>Remove duplicates</button></div><p id="rd-msg" class="note" aria-live="polite">Choose a spreadsheet.</p><div id="rd-out"></div>`,
 init(el) {
  let wb = null, X = null, file = null; const go = $("#rd-go", el), msg = $("#rd-msg", el), sel = $("#rd-sheet", el);
  const cols = () => {
    const rows = sheetRows(X, wb.Sheets[wb.SheetNames[+sel.value]]), head = $("#rd-head", el).checked, width = Math.max(0, ...rows.map(r => r.length));
    $("#rd-col-list", el).innerHTML = Array.from({length: width}, (_, i) => `<label class="check"><input type="checkbox" value="${i}" checked> ${esc(head && rows[0] && String(rows[0][i] ?? "").trim() ? rows[0][i] : "Column " + X.utils.encode_col(i))}</label>`).join("");
    $("#rd-cols", el).hidden = !width;
  };
  pickOneFile(el, "rd", async f => {
    try { X = await sheetLib(); wb = await readBook(f); file = f; fillSheets(sel, wb); sel.disabled = false; go.disabled = false; cols(); const p = $("#rd-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)} · ${plural(wb.SheetNames.length, "sheet")}`; $("#rd-out", el).innerHTML = ""; say(msg, "Choose the columns that must match, then remove duplicates."); }
    catch (e) { say(msg, e.message, true); }
  });
  sel.onchange = () => wb && cols(); $("#rd-head", el).onchange = () => wb && cols();
  go.onclick = async () => {
    busy(go, true, "Checking…");
    try {
      const ws = wb.Sheets[wb.SheetNames[+sel.value]], raw = X.utils.sheet_to_json(ws, {header: 1, raw: true, defval: "", blankrows: false}), shown = sheetRows(X, ws);
      const head = $("#rd-head", el).checked, fold = $("#rd-case", el).checked, keys = $$("#rd-col-list input:checked", el).map(i => +i.value);
      if (!keys.length) throw new Error("Choose at least one column to compare.");
      const norm = v => fold ? String(v).trim().replace(/\s+/g, " ").toLowerCase() : String(v);
      const seen = new Set(), keep = head ? [raw[0]] : [], start = head ? 1 : 0;
      for (let r = start; r < raw.length; r++) { const k = JSON.stringify(keys.map(i => norm(shown[r]?.[i] ?? ""))); if (!seen.has(k)) { seen.add(k); keep.push(raw[r]); } }
      const removed = raw.length - keep.length, out = X.utils.book_new(), type = $("#rd-out-type", el).value;
      X.utils.book_append_sheet(out, X.utils.aoa_to_sheet(keep, {cellDates: true}), safeSheetName(wb.SheetNames[+sel.value], new Set()));
      const blob = new Blob([type === "csv" ? "﻿" + X.utils.sheet_to_csv(out.Sheets[out.SheetNames[0]]) : X.write(out, {bookType: "xlsx", type: "array", compression: true})], {type: BOOK_MIME[type]});
      $("#rd-out", el).innerHTML = `<h3 class="out-title">Result</h3>${rowsTable(sheetRows(X, out.Sheets[out.SheetNames[0]]), {max: 50, header: head})}`;
      showResults($("#rd-out", el).appendChild(document.createElement("div")), [{name: `${baseName(file)}-no-duplicates.${type}`, blob, note: `${plural(keep.length - start, "row")} kept`}]);
      say(msg, removed ? `Removed ${plural(removed, "duplicate row")}; ${plural(keep.length - start, "row")} left.` : "No duplicate rows found.");
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); }
  };
 }},
{id: "excel-viewer", cat: "office", name: "Excel file viewer", desc: "Open and search .xlsx, .xls, .ods and CSV files without Excel.",
 ui: `${dropUI("ev-in", SHEET_ACCEPT, "Choose a spreadsheet to open", false)}<p id="ev-file" class="file-picked" hidden></p>
  <div id="ev-tools" hidden><div class="sheet-tabs" id="ev-tabs" role="tablist" aria-label="Sheets"></div>
  <label for="ev-q">Search this sheet</label><input id="ev-q" type="search" placeholder="Type to filter rows" autocomplete="off"></div>
  <p id="ev-msg" class="note" aria-live="polite">Choose an .xlsx, .xls, .ods or .csv file. It opens on your device; nothing is uploaded.</p><div id="ev-out"></div>`,
 init(el) {
  let wb = null, X = null, cur = 0; const msg = $("#ev-msg", el), q = $("#ev-q", el);
  const show = () => {
    const rows = sheetRows(X, wb.Sheets[wb.SheetNames[cur]]), term = q.value.trim().toLowerCase();
    const body = term ? rows.slice(1).filter(r => r.some(v => String(v).toLowerCase().includes(term))) : rows.slice(1);
    $$("#ev-tabs button", el).forEach((b, i) => b.setAttribute("aria-selected", String(i === cur)));
    $("#ev-out", el).innerHTML = rowsTable(rows.length ? [rows[0], ...body] : [], {max: 1000});
    say(msg, term ? `${plural(body.length, "matching row")} in “${wb.SheetNames[cur]}”.` : `“${wb.SheetNames[cur]}”: ${plural(Math.max(0, rows.length - 1), "row")} below the first row.`);
  };
  pickOneFile(el, "ev", async f => {
    try {
      X = await sheetLib(); wb = await readBook(f); cur = 0; q.value = "";
      $("#ev-tabs", el).innerHTML = wb.SheetNames.map((n, i) => `<button type="button" role="tab" data-i="${i}">${esc(n)}</button>`).join("");
      $("#ev-tools", el).hidden = false; const p = $("#ev-file", el); p.hidden = false; p.textContent = `${f.name} · ${fsize(f.size)} · ${plural(wb.SheetNames.length, "sheet")}`; show();
    } catch (e) { say(msg, e.message, true); }
  });
  $("#ev-tabs", el).onclick = e => { const b = e.target.closest("button[data-i]"); if (b) { cur = +b.dataset.i; q.value = ""; show(); } };
  q.addEventListener("input", () => wb && show());
 }},

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
{id: "sign-pdf", cat: "files", name: "Sign PDF", desc: "Add your signature, initials, name and date to a PDF.",
 ui: `<div id="sg-start">${dropUI("sg-in", "application/pdf,.pdf", "Choose a PDF to sign", false)}<p id="sg-msg" class="note" aria-live="polite">Your document stays on your device. Nothing is uploaded.</p></div>
  <div id="sg-work" hidden>
   <p id="sg-file" class="file-picked"></p>
   <div class="sg-bar" role="toolbar" aria-label="Signing tools">
    <div class="sg-group"><button type="button" class="primary" data-add="signature">✍ Signature</button><button type="button" data-add="initials">Initials</button><button type="button" data-add="name">Name</button><button type="button" data-add="date">Date</button><button type="button" data-add="text">Text</button></div>
    <div class="sg-group"><button type="button" id="sg-undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>↶</button><button type="button" id="sg-redo" aria-label="Redo" title="Redo (Ctrl+Y)" disabled>↷</button>
     <button type="button" id="sg-zoom-out" aria-label="Zoom out">−</button><span id="sg-zoom" class="sg-zoom" aria-live="polite">100%</span><button type="button" id="sg-zoom-in" aria-label="Zoom in">+</button><button type="button" id="sg-fit">Fit</button>
     <label class="sg-page-nav">Page <input id="sg-pageno" type="number" min="1" value="1" inputmode="numeric" aria-label="Go to page"> of <span id="sg-pages">1</span></label></div>
    <div class="sg-group sg-end"><button type="button" id="sg-reset">Start over</button><button type="button" class="primary" id="sg-download">Download signed PDF</button></div>
   </div>
   <p id="sg-status" class="note" role="status" aria-live="polite"></p>
   <div id="sg-viewer" class="sg-viewer" tabindex="-1" aria-label="Document pages"></div>
  </div>
  <dialog id="sg-dialog" class="sg-dialog" aria-labelledby="sg-dtitle">
   <h2 id="sg-dtitle">Add your signature</h2>
   <div id="sg-saved" hidden><p class="note">Use one you made earlier:</p><div id="sg-saved-list" class="sg-saved-list"></div></div>
   <div class="sg-tabs" role="tablist" aria-label="How to make your signature"><button type="button" role="tab" data-tab="draw" aria-selected="true">Draw</button><button type="button" role="tab" data-tab="type" aria-selected="false" tabindex="-1">Type</button><button type="button" role="tab" data-tab="upload" aria-selected="false" tabindex="-1">Upload</button></div>
   <div data-pane="draw"><canvas id="sg-pad" class="sg-pad" aria-label="Signature drawing area. Draw with a mouse, finger or stylus. To use the keyboard, choose Type instead."></canvas><div class="btns"><button type="button" id="sg-clear">Clear</button></div></div>
   <div data-pane="type" hidden><label for="sg-type-in">Type your name</label><input id="sg-type-in" autocomplete="name" maxlength="60"><div id="sg-type-preview" class="sg-type-preview" aria-hidden="true"></div></div>
   <div data-pane="upload" hidden><label for="sg-up-in">Choose an image of your signature (PNG with a transparent background works best)</label><input id="sg-up-in" type="file" accept="image/png,image/jpeg,image/webp">
    <label class="check"><input id="sg-up-white" type="checkbox" checked> Make a white background transparent</label><img id="sg-up-preview" class="sg-up-preview" alt="Preview of the uploaded signature" hidden></div>
   <fieldset class="sg-ink"><legend>Ink colour</legend><label class="check"><input type="radio" name="sg-ink" value="black" checked> Black</label><label class="check"><input type="radio" name="sg-ink" value="blue"> Blue</label></fieldset>
   <p id="sg-err" class="err" aria-live="polite"></p>
   <div class="btns"><button type="button" class="primary" id="sg-use">Use this signature</button><button type="button" id="sg-cancel">Cancel</button></div>
  </dialog>
  <dialog id="sg-tdialog" class="sg-dialog" aria-labelledby="sg-ttitle">
   <h2 id="sg-ttitle">Add text</h2>
   <div id="sg-date-row" hidden><label for="sg-date-fmt">Date format</label><select id="sg-date-fmt"><option value="short">Day/month/year (numbers)</option><option value="long">Day month year (words)</option><option value="iso">Year-month-day (ISO)</option></select></div>
   <label for="sg-t-in">Text</label><input id="sg-t-in" maxlength="200">
   <label for="sg-t-size">Text size</label><select id="sg-t-size"><option value="9">Small (9 pt)</option><option value="11">11 pt</option><option value="12" selected>Normal (12 pt)</option><option value="14">14 pt</option><option value="18">Large (18 pt)</option><option value="24">24 pt</option></select>
   <p id="sg-terr" class="err" aria-live="polite"></p>
   <div class="btns"><button type="button" class="primary" id="sg-t-ok">Add to page</button><button type="button" id="sg-t-cancel">Cancel</button></div>
  </dialog>
  <dialog id="sg-confirm" class="sg-dialog" aria-labelledby="sg-ctitle">
   <h2 id="sg-ctitle">Ready to download?</h2>
   <p>Check that each signature and piece of text is in the right place: <strong id="sg-summary"></strong></p>
   <label class="check"><input id="sg-confirm-skip" type="checkbox"> Don't ask again for this document</label>
   <div class="btns"><button type="button" class="primary" id="sg-confirm-yes">Download signed PDF</button><button type="button" id="sg-confirm-no">Go back and check</button></div>
  </dialog>
  <dialog id="sg-reset-confirm" class="sg-dialog" aria-labelledby="sg-rtitle">
   <h2 id="sg-rtitle">Start over?</h2><p>The signatures and text you've added haven't been downloaded yet and will be lost.</p>
   <div class="btns"><button type="button" class="primary" id="sg-reset-yes">Start over</button><button type="button" id="sg-reset-no">Keep editing</button></div>
  </dialog>`,
 init(el) { /* Behaviour lives in assets/sign-pdf.js, which is loaded only on this page. */ }},
{id: "edit-pdf", cat: "files", name: "Edit PDF", desc: "Change or remove text, white out, redact, draw, highlight and fill forms.",
 ui: `<div id="ep-start">${dropUI("ep-in", "application/pdf,.pdf", "Choose a PDF to edit", false)}<p id="ep-msg" class="note" aria-live="polite">Your document stays on your device. Nothing is uploaded.</p></div>
  <div id="ep-work" hidden>
   <p id="ep-file" class="file-picked"></p>
   <div class="sg-bar ep-bar" role="toolbar" aria-label="Editing tools">
    <div class="sg-group ep-tools" role="group" aria-label="Tool">
     <button type="button" data-tool="select" aria-pressed="true" title="Select, move and resize">↖ Select</button>
     <button type="button" data-tool="edit" aria-pressed="false" title="Click a line of text to change it">✎ Edit text</button>
     <button type="button" data-tool="text" aria-pressed="false" title="Click on a page to add text">T Add text</button>
     <button type="button" data-tool="whiteout" aria-pressed="false" title="Drag to cover something">▭ Whiteout</button>
     <button type="button" data-tool="redact" aria-pressed="false" title="Drag to black out and permanently remove">■ Redact</button>
     <button type="button" data-tool="highlight" aria-pressed="false" title="Drag to highlight">▮ Highlight</button>
     <button type="button" data-tool="rect" aria-pressed="false" title="Drag to draw a box">□ Box</button>
     <button type="button" data-tool="draw" aria-pressed="false" title="Draw freehand">✏ Draw</button>
     <button type="button" id="ep-image-btn" title="Add a picture">🖼 Image</button><input id="ep-image-in" type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Choose an image to add">
    </div>
    <div class="sg-group ep-props" aria-label="Style">
     <label class="ep-prop">Colour <input id="ep-color" type="color" value="#111827"></label>
     <label class="ep-prop ep-for-text">Font <select id="ep-font"><option value="helv">Sans (Helvetica)</option><option value="times">Serif (Times)</option><option value="cour">Mono (Courier)</option></select></label>
     <label class="ep-prop ep-for-text">Size <select id="ep-size"><option>8</option><option>9</option><option>10</option><option>11</option><option selected>12</option><option>14</option><option>16</option><option>18</option><option>24</option><option>32</option><option>48</option></select></label>
     <label class="ep-prop ep-for-text check"><input id="ep-bold" type="checkbox"> Bold</label>
     <label class="ep-prop ep-for-line">Line <select id="ep-width"><option value="1">Thin</option><option value="2" selected>Medium</option><option value="4">Thick</option></select></label>
    </div>
    <div class="sg-group"><button type="button" id="ep-undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>↶</button><button type="button" id="ep-redo" aria-label="Redo" title="Redo (Ctrl+Y)" disabled>↷</button>
     <button type="button" id="ep-zoom-out" aria-label="Zoom out">−</button><span id="ep-zoom" class="sg-zoom" aria-live="polite">100%</span><button type="button" id="ep-zoom-in" aria-label="Zoom in">+</button><button type="button" id="ep-fit">Fit</button>
     <label class="sg-page-nav">Page <input id="ep-pageno" type="number" min="1" value="1" inputmode="numeric" aria-label="Go to page"> of <span id="ep-pages">1</span></label></div>
    <div class="sg-group sg-end"><button type="button" id="ep-reset">Start over</button><button type="button" class="primary" id="ep-download">Download edited PDF</button></div>
   </div>
   <p id="ep-hint" class="note ep-hint"></p>
   <div id="ep-forms-bar" class="ep-forms-bar" hidden><span id="ep-forms-count"></span><label class="check"><input id="ep-flatten" type="checkbox"> Make answers permanent (flatten the form)</label></div>
   <p id="ep-status" class="note" role="status" aria-live="polite"></p>
   <div id="ep-viewer" class="sg-viewer" tabindex="-1" aria-label="Document pages"></div>
  </div>
  <dialog id="ep-tdialog" class="sg-dialog" aria-labelledby="ep-ttitle">
   <h2 id="ep-ttitle">Add text</h2>
   <label for="ep-t-in">Text</label><textarea id="ep-t-in" rows="3" maxlength="2000"></textarea>
   <div class="row"><div><label for="ep-t-font">Font</label><select id="ep-t-font"><option value="helv">Sans (Helvetica)</option><option value="times">Serif (Times)</option><option value="cour">Mono (Courier)</option></select></div>
    <div><label for="ep-t-size">Size (pt)</label><input id="ep-t-size" type="number" min="4" max="96" step="0.5" value="12"></div>
    <div><label for="ep-t-color">Colour</label><input id="ep-t-color" type="color" value="#111827"></div></div>
   <label class="check"><input id="ep-t-bold" type="checkbox"> Bold</label>
   <div id="ep-cover-row" hidden><label for="ep-cover-color">Background to cover the old text with</label><input id="ep-cover-color" type="color" value="#ffffff"><p class="note">The original line is covered and your text is written on top. Matched from the page; change it if the background isn't plain.</p></div>
   <p id="ep-terr" class="err" aria-live="polite"></p>
   <div class="btns"><button type="button" class="primary" id="ep-t-ok">Add to page</button><button type="button" id="ep-t-remove" hidden>Remove the line instead</button><button type="button" id="ep-t-cancel">Cancel</button></div>
  </dialog>
  <dialog id="ep-confirm" class="sg-dialog" aria-labelledby="ep-ctitle">
   <h2 id="ep-ctitle">Ready to download?</h2>
   <p id="ep-summary"></p>
   <p id="ep-redact-note" class="note" hidden>Pages with redactions are flattened into images, so the blacked-out content is permanently removed. Text on those pages can no longer be selected or searched, and bookmarks and document properties are removed from the file.</p>
   <div class="btns"><button type="button" class="primary" id="ep-confirm-yes">Download edited PDF</button><button type="button" id="ep-confirm-no">Go back</button></div>
  </dialog>
  <dialog id="ep-reset-confirm" class="sg-dialog" aria-labelledby="ep-rtitle">
   <h2 id="ep-rtitle">Start over?</h2><p>Your changes haven't been downloaded yet and will be lost.</p>
   <div class="btns"><button type="button" class="primary" id="ep-reset-yes">Start over</button><button type="button" id="ep-reset-no">Keep editing</button></div>
  </dialog>`,
 init(el) { /* Behaviour lives in assets/edit-pdf.js, which is loaded only on this page. */ }},
{id: "split-pdf", cat: "files", name: "Split PDF", desc: "Split a PDF into several files by page range, or one per page.",
 ui: `${dropUI("sp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="sp-file" class="file-picked" hidden></p>
  <div class="row"><div><label for="sp-mode">How to split</label><select id="sp-mode"><option value="extract">Chosen pages into one PDF</option><option value="ranges">Make one PDF for each range</option><option value="every">Make one PDF for every page</option></select></div>
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
{id: "extract-pages", cat: "files", name: "Extract PDF pages", desc: "Pick pages from a PDF and save them as a new PDF.",
 ui: `${dropUI("xp-in", "application/pdf,.pdf", "Choose a PDF file", false)}<p id="xp-file" class="file-picked" hidden></p>
  <div id="xp-work" hidden>
   <div class="row"><div><label for="xp-pages">Pages to extract</label><input id="xp-pages" placeholder="e.g. 1-3, 5, 8-" autocomplete="off"></div>
    <div><label for="xp-out-mode">Save as</label><select id="xp-out-mode"><option value="one">One PDF with all chosen pages</option><option value="each">A separate PDF for each page</option></select></div></div>
   <div class="btns xp-quick" role="group" aria-label="Quick selection"><button type="button" data-sel="all">All</button><button type="button" data-sel="none">None</button><button type="button" data-sel="odd">Odd pages</button><button type="button" data-sel="even">Even pages</button><button type="button" data-sel="invert">Invert</button></div>
   <p class="note">Click pages to choose them, or type page numbers above. Chosen pages are saved in page order.</p>
   <div id="xp-grid" class="xp-grid" role="group" aria-label="Pages"></div>
  </div>
  <div class="btns"><button class="primary" id="xp-go" disabled>Extract pages</button></div><p id="xp-msg" class="note" aria-live="polite">Choose a PDF to start.</p><div id="xp-out"></div>`,
 init(el) {
  let file = null, count = 0, doc = null, observer = null; const chosen = new Set();
  const go = $("#xp-go", el), msg = $("#xp-msg", el), input = $("#xp-pages", el), grid = $("#xp-grid", el);
  // Page set <-> "1-3, 5, 8-" text.
  const toText = () => { const s = [...chosen].sort((a, b) => a - b), out = []; for (let i = 0; i < s.length; i++) { let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++; out.push(j > i ? `${s[i] + 1}-${s[j] + 1}` : `${s[i] + 1}`); i = j; } return out.join(", "); };
  const sync = (fromInput) => {
    if (!fromInput) input.value = toText();
    $$(".xp-page", grid).forEach(b => b.setAttribute("aria-pressed", String(chosen.has(+b.dataset.i))));
    go.disabled = !chosen.size; go.textContent = chosen.size ? `Extract ${plural(chosen.size, "page")}` : "Extract pages";
  };
  input.addEventListener("input", () => {
    chosen.clear();
    try { if (input.value.trim()) pageGroups(input.value, count).flat().forEach(i => chosen.add(i)); input.removeAttribute("aria-invalid"); say(msg, chosen.size ? `${plural(chosen.size, "page")} chosen.` : "Choose pages to extract."); }
    catch (e) { input.setAttribute("aria-invalid", "true"); say(msg, e.message, true); }
    sync(true);
  });
  grid.addEventListener("click", ev => { const b = ev.target.closest(".xp-page"); if (!b) return; const i = +b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); sync(); });
  $(".xp-quick", el).addEventListener("click", ev => {
    const k = ev.target.closest("[data-sel]")?.dataset.sel; if (!k) return;
    const all = Array.from({length: count}, (_, i) => i), prev = new Set(chosen); chosen.clear();
    ({all: () => all, none: () => [], odd: () => all.filter(i => i % 2 === 0), even: () => all.filter(i => i % 2 === 1), invert: () => all.filter(i => !prev.has(i))})[k]().forEach(i => chosen.add(i));
    sync();
  });
  // Small previews, drawn only when they scroll into view.
  const thumb = async (b) => {
    if (b.dataset.done || !doc) return; b.dataset.done = "1";
    try { const p = await doc.getPage(+b.dataset.i + 1), v1 = p.getViewport({scale: 1}), vp = p.getViewport({scale: Math.min(2, 220 / v1.width)}), c = b.querySelector("canvas");
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await p.render({canvasContext: x, viewport: vp}).promise; p.cleanup(); } catch { delete b.dataset.done; }
  };
  wireDrop(el, "xp-in", async f => {
    file = f[0]; go.disabled = true; $("#xp-out", el).innerHTML = ""; chosen.clear(); observer?.disconnect(); doc?.destroy(); doc = null;
    try {
      count = (await openPdf(file)).getPageCount(); doc = await openPdfJs(file);
      const p = $("#xp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)} · ${plural(count, "page")}`;
      grid.innerHTML = Array.from({length: count}, (_, i) => `<button type="button" class="xp-page" data-i="${i}" aria-pressed="false" aria-label="Page ${i + 1}"><canvas aria-hidden="true"></canvas><span>${i + 1}</span></button>`).join("");
      observer = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && thumb(e.target)), {rootMargin: "200px"});
      $$(".xp-page", grid).forEach(b => observer.observe(b));
      $("#xp-work", el).hidden = false; input.value = ""; sync(); say(msg, "Click the pages you want, or type them in.");
    } catch (e) { file = null; $("#xp-work", el).hidden = true; say(msg, e.message, true); }
  });
  go.onclick = async () => {
    busy(go, true, "Extracting…");
    try {
      const {PDFDocument} = await pdfLib(), src = await openPdf(file), base = baseName(file), idx = [...chosen].sort((a, b) => a - b), items = [];
      const sets = $("#xp-out-mode", el).value === "each" ? idx.map(i => [i]) : [idx];
      for (const set of sets) {
        const out = await PDFDocument.create(); (await out.copyPages(src, set)).forEach(p => out.addPage(p));
        const label = set.length === 1 ? `page-${set[0] + 1}` : `pages-${toText().replace(/\s+/g, "").replace(/,/g, "_")}`;
        items.push({name: `${base}-${label}.pdf`, blob: new Blob([await out.save({useObjectStreams: false})], {type: "application/pdf"}), note: plural(set.length, "page")});
      }
      showResults($("#xp-out", el), items);
      say(msg, items.length === 1 ? `Your new PDF with ${plural(idx.length, "page")} is ready.` : `${items.length} PDFs are ready. Download them one by one or all as a ZIP.`);
    } catch (e) { say(msg, e.message, true); } finally { busy(go, false); sync(); }
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
  <div class="row"><div><label for="cp-goal">Size limit</label><select id="cp-goal"><option value="0" selected>No limit: choose a level</option><option value="100">Under 100 KB</option><option value="200">Under 200 KB</option><option value="300">Under 300 KB</option><option value="500">Under 500 KB</option><option value="1024">Under 1 MB</option><option value="2048">Under 2 MB</option><option value="5120">Under 5 MB</option></select></div>
  <div id="cp-level-wrap"><label for="cp-level">Compression</label><select id="cp-level"><option value="72,0.55">Strong: smallest file (72 dpi)</option><option value="110,0.65" selected>Balanced (110 dpi)</option><option value="150,0.75">Light: best quality (150 dpi)</option></select></div></div>
  <p id="cp-goal-note" class="note" hidden>Finds the best quality that fits under the limit, for upload forms with a maximum file size. Very long documents may not fit under the smallest limits.</p>
  <p class="note">Pages are saved as images, so text in the compressed PDF can't be selected or searched. Best for scans and photo-heavy documents.</p>
  <div class="btns"><button class="primary" id="cp-go" disabled>Compress PDF</button></div><p id="cp-msg" class="note" aria-live="polite">Choose a PDF to start.</p><div id="cp-out"></div>`,
 init(el) {
  let file = null; const go = $("#cp-go", el), msg = $("#cp-msg", el);
  const goal = $("#cp-goal", el), goalOn = () => +goal.value > 0;
  goal.onchange = () => { $("#cp-level-wrap", el).hidden = goalOn(); $("#cp-goal-note", el).hidden = !goalOn(); };
  wireDrop(el, "cp-in", f => { file = f[0]; $("#cp-out", el).innerHTML = ""; const p = $("#cp-file", el); p.hidden = false; p.textContent = `${file.name} · ${fsize(file.size)}`; go.disabled = false; say(msg, "Choose a level or a size limit, then compress."); });
  // Renders every page as a JPEG at the given resolution and quality, and returns the new PDF.
  const build = async (src, dpi, q, label) => {
    const {PDFDocument} = await pdfLib(), out = await PDFDocument.create();
    for (let i = 1; i <= src.numPages; i++) {
      say(msg, `${label}page ${i} of ${src.numPages}…`);
      const page = await src.getPage(i), v1 = page.getViewport({scale: 1}), vp = page.getViewport({scale: dpi / 72});
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(vp.width)); c.height = Math.max(1, Math.ceil(vp.height));
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await page.render({canvasContext: x, viewport: vp}).promise; page.cleanup();
      const img = await out.embedJpg(new Uint8Array(await (await canvasBlob(c, "image/jpeg", q)).arrayBuffer()));
      out.addPage([v1.width, v1.height]).drawImage(img, {x: 0, y: 0, width: v1.width, height: v1.height});
      c.width = c.height = 0;
    }
    return new Blob([await out.save()], {type: "application/pdf"});
  };
  // Settings from best quality to smallest file, used when aiming for a size limit.
  const LADDER = [[150, 0.8], [150, 0.7], [125, 0.65], [110, 0.6], [96, 0.55], [80, 0.5], [72, 0.45], [60, 0.4], [50, 0.35]];
  go.onclick = async () => {
    busy(go, true, "Compressing…");
    let src;
    try {
      const name = `${baseName(file)}-compressed.pdf`, limit = +goal.value * 1024, cap = goal.selectedOptions[0].textContent.replace(/^Under /, "");
      if (limit && file.size <= limit) { $("#cp-out", el).innerHTML = ""; return say(msg, `This PDF is already ${fsize(file.size)}, under the ${cap} limit. You can use the original as it is.`); }
      src = await openPdfJs(file);
      if (!limit) {
        const [dpi, q] = $("#cp-level", el).value.split(",").map(Number), blob = await build(src, dpi, q, "Compressing "), saved = 1 - blob.size / file.size;
        if (saved <= 0.02) { $("#cp-out", el).innerHTML = ""; return say(msg, `This PDF is already well compressed (${fsize(file.size)}); compressing would not make it smaller. Keep the original.`); }
        showResults($("#cp-out", el), [{name, blob, note: `${fsize(file.size)} → ${fsize(blob.size)}`}]);
        return say(msg, `Reduced by ${Math.round(saved * 100)}%.`);
      }
      // Binary search along the ladder for the best quality that fits; file size falls steadily along it.
      let lo = 0, hi = LADDER.length - 1, best = null, smallest = null, tries = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, [dpi, q] = LADDER[mid];
        const blob = await build(src, dpi, q, `Try ${++tries}: ${dpi} dpi, `);
        if (mid === LADDER.length - 1) smallest = blob;
        if (blob.size <= limit) { best = {blob, dpi}; hi = mid - 1; } else lo = mid + 1;
      }
      if (best) {
        showResults($("#cp-out", el), [{name, blob: best.blob, note: `${fsize(file.size)} → ${fsize(best.blob.size)} (under ${cap}, ${best.dpi} dpi)`}]);
        return say(msg, `Done: ${fsize(best.blob.size)}, under your ${cap} limit, at the best quality that fits.`);
      }
      smallest ||= await build(src, ...LADDER[LADDER.length - 1], "Smallest setting: ");
      if (smallest.size < file.size) showResults($("#cp-out", el), [{name, blob: smallest, note: `${fsize(file.size)} → ${fsize(smallest.size)}`}]); else $("#cp-out", el).innerHTML = "";
      say(msg, `Couldn't get under ${cap}: the smallest this PDF goes is ${fsize(smallest.size)} (${src.numPages} pages). Try a higher limit, or split the PDF and send it in parts.`, true);
    } catch (e) { say(msg, e.message, true); } finally { src?.destroy(); busy(go, false); }
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
  <div><label for="ix-mode">How to compress</label><select id="ix-mode"><option value="quality">Choose the quality</option><option value="size">Aim for a file size</option></select></div>
  <div id="ix-qwrap"><label for="ix-q">Quality: <span id="ix-qv">70</span>%</label><input id="ix-q" type="range" min="30" max="95" value="70"></div>
  <div id="ix-twrap" hidden><label for="ix-target">Maximum size per image</label><select id="ix-target"><option value="20">20 KB</option><option value="50">50 KB</option><option value="100" selected>100 KB</option><option value="200">200 KB</option><option value="500">500 KB</option><option value="1000">1 MB</option><option value="2000">2 MB</option></select></div></div>
  <p id="ix-tnote" class="note" hidden>Each image gets the highest quality that fits. If that isn't enough, it is made smaller in width too. Useful for visa, passport and job application forms.</p>
  <div class="btns"><button class="primary" id="ix-go" disabled>Compress</button></div><p id="ix-msg" class="note" aria-live="polite">Choose one or more images.</p><div id="ix-out"></div>`,
 init(el) {
  imageTool(el, "ix", (f, o) => ({type: o.type, quality: o.q, maxWidth: +$("#ix-max", el).value || 0, targetBytes: $("#ix-mode", el).value === "size" ? +$("#ix-target", el).value * 1024 : 0}), true);
  const sync = () => { const size = $("#ix-mode", el).value === "size"; $("#ix-qwrap", el).hidden = size; $("#ix-twrap", el).hidden = !size; $("#ix-tnote", el).hidden = !size; };
  $("#ix-mode", el).addEventListener("change", sync); $("#ix-type", el).addEventListener("change", sync); sync();
 }},
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

{id: "time-duration",cat:"general",name:"Hours calculator",desc:"Work hours with breaks, overnight shifts and a weekly timesheet with pay.",
ui:`<div class="row"><div><label for="dur-start">Start time</label><input id="dur-start" type="time"></div><div><label for="dur-end">End time</label><input id="dur-end" type="time"></div><div><label for="dur-break">Break (minutes)</label><input id="dur-break" type="number" min="0" step="1" value="0"></div></div><label class="check"><input id="dur-next" type="checkbox"> End on next day</label><div id="dur-out" class="out" aria-live="polite"></div><p class="note">Earlier end times automatically count as overnight. For equal times, select next day for 24 hours. Supports shifts up to 24 hours. Uses clock times without daylight-saving adjustments.</p>
 <h2 class="panel-title">Weekly timesheet and pay</h2>
 <div class="tablewrap"><table class="ts"><thead><tr><th scope="col">Day</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Break (min)</th><th scope="col">Hours</th></tr></thead><tbody>${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => `<tr><th scope="row">${d}</th><td><input type="time" id="ts-s${i}" aria-label="${d} start"${i < 5 ? ' value="09:00"' : ""}></td><td><input type="time" id="ts-e${i}" aria-label="${d} end"${i < 5 ? ' value="17:30"' : ""}></td><td><input type="number" id="ts-b${i}" aria-label="${d} break in minutes" min="0" step="1" value="${i < 5 ? 30 : 0}"></td><td class="ts-h" id="ts-h${i}"></td></tr>`).join("")}</tbody></table></div>
 <div class="row"><div><label for="ts-round">Round each day to the nearest</label><select id="ts-round"><option value="0">No rounding</option><option value="5">5 minutes</option><option value="6">6 minutes (tenth of an hour)</option><option value="15">15 minutes (quarter hour)</option></select></div></div>
 <div class="row"><div><label for="ts-rate">Hourly rate (£, optional)</label><input id="ts-rate" inputmode="decimal" placeholder="e.g. 12.71"></div><div><label for="ts-ot">Overtime after (hours a week)</label><input id="ts-ot" type="number" min="0" step="0.5" placeholder="e.g. 40"></div><div><label for="ts-otx">Overtime rate</label><select id="ts-otx"><option value="1.5">Time and a half (×1.5)</option><option value="2">Double time (×2)</option><option value="1.25">×1.25</option><option value="1">Same rate</option></select></div></div>
 <div id="ts-out" class="out" aria-live="polite"></div><div class="btns"><button id="ts-clear">Clear the week</button><button id="ts-copy">Copy summary</button><button id="ts-csv">Download timesheet (CSV)</button></div>`,
init(el){
const parse=s=>{if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s))return NaN;const [h,m]=s.split(":").map(Number);return h*60+m;};
const run=()=>{const a=parse($("#dur-start",el).value),b=parse($("#dur-end",el).value),raw=$("#dur-break",el).value.trim(),br=Number(raw),o=$("#dur-out",el);
if(!Number.isFinite(a)||!Number.isFinite(b)){o.textContent="Choose a start and end time.";return;}
if(raw===""||!Number.isInteger(br)||br<0||br>1440){o.textContent="Enter a whole break duration from 0 to 1,440 minutes.";return;}
const total=b-a+(($("#dur-next",el).checked||b<a)?1440:0);
if(total>1440){o.textContent="Maximum shift is 24 hours. Check the next-day option.";return;}
if(br>total){o.textContent="Break cannot exceed shift duration.";return;}
const n=total-br;o.innerHTML='<p class="big">'+plural(Math.floor(n/60),"hour")+' '+plural(n%60,"minute")+'</p><p class="sub">'+(n/60).toFixed(2)+' decimal hours after breaks · '+plural(n,"minute")+' total</p><p class="sub">Total shift: '+plural(Math.floor(total/60),"hour")+' '+plural(total%60,"minute")+' · Break: '+plural(br,"minute")+'</p>';
};
// Weekly timesheet: each row is a shift (overnight when the end is earlier than the start).
const hm=m=>`${Math.floor(m/60)}h ${String(m%60).padStart(2,"0")}m`;
let summary="",rowsOut=[];
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const sheet=()=>{
 let mins=0,days=0,bad=[];rowsOut=[];const rnd=Number($("#ts-round",el).value)||0;
 for(let i=0;i<7;i++){const s=parse($(`#ts-s${i}`,el).value),e=parse($(`#ts-e${i}`,el).value),b=Number($(`#ts-b${i}`,el).value||0),cell=$(`#ts-h${i}`,el);
  if(!Number.isFinite(s)||!Number.isFinite(e)){cell.textContent="–";continue;}
  const len=e-s+(e<=s?1440:0);
  if(!Number.isFinite(b)||b<0||b>=len){cell.textContent="Check break";bad.push(i);continue;}
  const w=rnd?Math.round((len-b)/rnd)*rnd:len-b;cell.textContent=hm(w);mins+=w;days++;rowsOut.push([DAYS[i],$(`#ts-s${i}`,el).value,$(`#ts-e${i}`,el).value,b,hm(w),(w/60).toFixed(2)]);}
 const rate=num($("#ts-rate",el).value),otAfter=Number($("#ts-ot",el).value),otx=Number($("#ts-otx",el).value),o=$("#ts-out",el);
 const hours=mins/60,otHours=Number.isFinite(otAfter)&&$("#ts-ot",el).value!==""&&hours>otAfter?hours-otAfter:0,basic=hours-otHours;
 const pay=rate>0?basic*rate+otHours*rate*otx:null;
 const items=[[hm(mins),"Total hours"],[hours.toFixed(2),"Decimal hours"],[plural(days,"day"),"Days worked"]];
 if(otHours)items.push([otHours.toFixed(2),"Overtime hours"]);
 if(pay!=null)items.push([gbp(pay),"Gross pay before tax"]);
 o.innerHTML=`<div class="stats">${stats(items)}</div>`+(bad.length?`<p class="err">Check the break on ${bad.map(i=>["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i]).join(", ")}: it must be shorter than the shift.</p>`:"")+(pay!=null?`<p class="note">Pay is before tax and National Insurance. See take-home pay with the <a href="uk-take-home-pay-calculator.html">UK take-home pay calculator</a>.</p>`:"");
 summary=`Total ${hm(mins)} (${hours.toFixed(2)} hours) over ${plural(days,"day")}`+(otHours?`, including ${otHours.toFixed(2)} overtime hours`:"")+(pay!=null?`. Gross pay ${gbp(pay)}.`:".");
};
$("#ts-clear",el).onclick=()=>{for(let i=0;i<7;i++){$(`#ts-s${i}`,el).value="";$(`#ts-e${i}`,el).value="";$(`#ts-b${i}`,el).value=0;}sheet();};
$("#ts-copy",el).onclick=e=>copy(summary,e.target);
$("#ts-csv",el).onclick=()=>saveBlob(new Blob(["\uFEFFDay,Start,End,Break (min),Hours,Decimal hours\n"+rowsOut.map(r=>r.join(",")).join("\n")+`\nTotal,,,,,${rowsOut.reduce((t,r)=>t+Number(r[5]),0).toFixed(2)}`],{type:"text/csv"}),"timesheet.csv");
const both=()=>{run();sheet();};
el.addEventListener("input",both);el.addEventListener("change",both);both();
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


{id: "date-difference", cat: "general", name: "Date difference calculator", desc: "Count days, weeks and UK working days between dates, or add days to a date.",
 ui: `<div class="row"><div><label for="dd-start">Start date</label><input id="dd-start" type="date"></div><div><label for="dd-end">End date</label><input id="dd-end" type="date"></div></div>
  <div class="row"><div><label for="dd-region">Leave out UK bank holidays</label><select id="dd-region"><option value="">No, weekends only</option><option value="england-and-wales">England and Wales</option><option value="scotland">Scotland</option><option value="northern-ireland">Northern Ireland</option></select></div></div>
  <label class="check"><input id="dd-inclusive" type="checkbox"> Include both start and end dates</label><div class="btns"><button id="dd-swap">Swap dates</button></div><div class="out" id="dd-result" aria-live="polite"></div>
  <h2 class="panel-title">Add or subtract days</h2>
  <div class="row"><div><label for="da-from">From date</label><input id="da-from" type="date"></div><div><label for="da-n">Days to add (use a minus sign to go back)</label><input id="da-n" type="number" value="30" step="1"></div>
  <div><label for="da-kind">Count</label><select id="da-kind"><option value="calendar">Calendar days</option><option value="working">Working days (uses the bank holiday choice above)</option></select></div></div>
  <div class="out" id="da-result" aria-live="polite"></div>
  <p class="note">Calendar totals include weekends. The end date is excluded unless inclusive counting is selected. Bank holidays come from GOV.UK and cover 2019 to 2028. Time zones and daylight saving do not change the result.</p>`,
 init(el) {
  const DAY = 86400000;
  const parse = s => {
   if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
   const [y, m, d] = s.split("-").map(Number);
   const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(0, 0, 0, 0);
   return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.getTime() : NaN;
  };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const long = t => new Date(t).toLocaleDateString("en-GB", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
  let holidays = null;
  const loadHolidays = async () => holidays ||= await (await fetch(vendorUrl("uk-bank-holidays.json"))).json();
  const regionSet = () => { const r = $("#dd-region", el).value; return r && holidays ? new Set(holidays[r]) : null; };
  const inRange = t => { const y = new Date(t).getUTCFullYear(); return y >= 2019 && y <= 2028; };
  const isWorking = (t, hol) => { const d = new Date(t).getUTCDay(); return d !== 0 && d !== 6 && !(hol && hol.has(iso(t))); };
  const run = async () => {
   if ($("#dd-region", el).value && !holidays) { try { await loadHolidays(); } catch { $("#dd-result", el).innerHTML = '<p class="err">Bank holidays couldn\'t be loaded. Check your connection.</p>'; return; } }
   const hol = regionSet(), a = parse($("#dd-start", el).value), b = parse($("#dd-end", el).value), o = $("#dd-result", el);
   if (!Number.isFinite(a) || !Number.isFinite(b)) o.innerHTML = '<p class="sub">Choose two valid dates.</p>';
   else if (b < a) o.innerHTML = '<p class="err">End date must be on or after start date.</p>';
   else {
    const days = Math.round((b - a) / DAY) + ($("#dd-inclusive", el).checked ? 1 : 0);
    let weekdays = 0, bank = 0;
    for (let i = 0; i < days; i++) { const t = a + i * DAY, d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) { weekdays++; if (hol && hol.has(iso(t))) bank++; } }
    const warn = hol && !(inRange(a) && inRange(b + DAY * ($("#dd-inclusive", el).checked ? 0 : -1))) ? '<p class="err">Bank holiday data covers 2019 to 2028, so dates outside those years only skip weekends.</p>' : "";
    o.innerHTML = '<p class="big">' + plural(days, "day") + '</p><p class="sub">' + plural(Math.floor(days / 7), "week") + ' and ' + plural(days % 7, "day") + '</p>'
      + '<div class="stats" style="margin-top:14px">' + stats(hol ? [[weekdays - bank, "Working days"], [bank, "Bank holidays skipped"], [days - weekdays, "Weekend days"]] : [[weekdays, "Weekdays (Mon–Fri)"], [days - weekdays, "Weekend days"]]) + '</div>' + warn;
   }
   const f = parse($("#da-from", el).value), n = Number($("#da-n", el).value), r = $("#da-result", el);
   if (!Number.isFinite(f) || !Number.isInteger(n) || Math.abs(n) > 36500) { r.innerHTML = '<p class="sub">Choose a date and a whole number of days.</p>'; return; }
   let t = f;
   if ($("#da-kind", el).value === "calendar") t = f + n * DAY;
   else { const step = Math.sign(n); for (let left = Math.abs(n); left > 0;) { t += step * DAY; if (isWorking(t, hol)) left--; } }
   r.innerHTML = '<p class="big">' + long(t) + '</p><p class="sub">' + (n >= 0 ? plural(n, $("#da-kind", el).value === "working" ? "working day" : "day") + " after " : plural(-n, $("#da-kind", el).value === "working" ? "working day" : "day") + " before ") + long(f) + ($("#da-kind", el).value === "working" ? (hol ? ", skipping weekends and bank holidays" : ", skipping weekends") : "") + '</p>';
  };
  $("#dd-swap", el).onclick = () => { const a = $("#dd-start", el), b = $("#dd-end", el); [a.value, b.value] = [b.value, a.value]; run(); };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
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
{id: "password-generator", cat: "general", name: "Password generator", desc: "Strong random passwords and passphrases, made on your device.",
 ui: `<div class="seg" role="radiogroup" aria-label="Type"><label class="check"><input type="radio" name="pmode" value="chars" checked> Random characters</label><label class="check"><input type="radio" name="pmode" value="words"> Passphrase (random words)</label></div>
  <div id="p-chars"><label for="pl">Length: <span id="plv">16</span></label><input type="range" id="pl" min="8" max="64" value="16">
  <div class="row" style="margin-top:16px"><label class="check"><input type="checkbox" id="pu" checked> Capital letters</label><label class="check"><input type="checkbox" id="pw" checked> Small letters</label><label class="check"><input type="checkbox" id="pd" checked> Numbers</label><label class="check"><input type="checkbox" id="ps" checked> Symbols</label></div>
  <label class="check"><input type="checkbox" id="pa"> Exclude look-alike characters (I, l, 1, O, 0)</label></div>
  <div id="p-words" hidden><div class="row"><div><label for="pwn">Number of words</label><select id="pwn"><option>3</option><option selected>4</option><option>5</option><option>6</option><option>7</option></select></div>
  <div><label for="pwsep">Between words</label><select id="pwsep"><option value="-">Hyphen -</option><option value=".">Full stop .</option><option value=" ">Space</option><option value="">Nothing</option></select></div></div>
  <label class="check"><input type="checkbox" id="pwcap" checked> Capitalise each word</label> <label class="check"><input type="checkbox" id="pwnum" checked> Add a number</label>
  <p class="note">Words come from the EFF long word list (7,776 words, CC BY 3.0).</p></div>
  <div class="row"><div><label for="pcount">How many</label><select id="pcount"><option>1</option><option>5</option><option>10</option></select></div></div>
  <div class="out"><div id="po" class="pw-list" aria-live="polite"></div><div class="meter" aria-hidden="true"><i id="pmeter"></i></div><p class="sub" id="pst"></p></div>
  <div class="btns"><button class="primary" id="pg">Generate new</button><button id="pc">Copy</button></div>`,
 init(el) {
  const sets = {pu: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", pw: "abcdefghijklmnopqrstuvwxyz", pd: "0123456789", ps: "!@#$%^&*()-_=+[]{};:,.?/"};
  const rnd = n => { const limit = Math.floor(4294967296 / n) * n; let v; do { v = crypto.getRandomValues(new Uint32Array(1))[0]; } while (v >= limit); return v % n; };
  let words = null, last = [];
  const strength = bits => bits < 40 ? ["Weak", 25, "err"] : bits < 60 ? ["Fair", 50, "mid"] : bits < 80 ? ["Strong", 75, "good"] : ["Very strong", 100, "good"];
  const showAll = (list, bits, note) => {
    last = list;
    $("#po", el).innerHTML = list.map(p => `<p class="big mono pw">${esc(p)}</p>`).join("");
    const [label, pct, cls] = strength(bits), m = $("#pmeter", el);
    m.style.width = pct + "%"; m.className = cls;
    $("#pst", el).textContent = `${label} · about ${Math.round(bits)} bits of randomness · ${note} · Generated on your device`;
    $("#pc", el).textContent = list.length > 1 ? "Copy all" : "Copy";
  };
  const genChars = n => {
    const len = +$("#pl", el).value; $("#plv", el).textContent = len;
    const on = Object.keys(sets).filter(k => $("#" + k, el).checked);
    if (!on.length) { $("#po", el).innerHTML = ""; $("#pst", el).innerHTML = `<span class="err">Tick at least one type of character.</span>`; return; }
    const active = Object.fromEntries(on.map(k => [k, $("#pa", el).checked ? sets[k].replace(/[Il1O0]/g, "") : sets[k]]));
    const pool = on.map(k => active[k]).join(""), one = () => { let p; do { p = Array.from({length: len}, () => pool[rnd(pool.length)]).join(""); } while (!on.every(k => [...p].some(c => active[k].includes(c)))); return p; };
    showAll(Array.from({length: n}, one), len * Math.log2(pool.length), `${len} characters`);
  };
  const genWords = async n => {
    if (!words) {
      $("#pst", el).textContent = "Loading word list…";
      try { words = (await (await fetch(vendorUrl("eff-wordlist.txt"))).text()).split("\n").map(w => w.trim()).filter(Boolean); }
      catch { $("#pst", el).innerHTML = `<span class="err">The word list couldn't be loaded. Check your connection and try again.</span>`; return; }
    }
    const count = +$("#pwn", el).value, sep = $("#pwsep", el).value, cap = $("#pwcap", el).checked, num = $("#pwnum", el).checked;
    const one = () => { const w = Array.from({length: count}, () => { const x = words[rnd(words.length)]; return cap ? x[0].toUpperCase() + x.slice(1) : x; }); if (num) w.splice(rnd(count + 1), 0, String(rnd(100))); return w.join(sep); };
    showAll(Array.from({length: n}, one), count * Math.log2(words.length) + (num ? Math.log2(100) + Math.log2(count + 1) : 0), `${count} random words`);
  };
  const gen = () => {
    const words = $("[name=pmode]:checked", el).value === "words", n = +$("#pcount", el).value;
    $("#p-chars", el).hidden = words; $("#p-words", el).hidden = !words;
    words ? genWords(n) : genChars(n);
  };
  el.addEventListener("input", gen); el.addEventListener("change", gen); $("#pg", el).onclick = gen;
  $("#pc", el).onclick = e => copy(last.join("\n"), e.target); gen();
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
{id: "base64", cat: "advanced", name: "Base64 encoder and decoder", desc: "Encode or decode Base64 text, images and files, with full Unicode support.",
 ui: `${B64_TEXT.ui}
  <h2 class="panel-title">Image or file to Base64</h2>
  ${dropUI("b64-in", "*/*", "Choose an image or file", false)}<p id="b64-file" class="file-picked" hidden></p>
  <div id="b64-file-out" hidden><img id="b64-preview" class="b64-preview" alt="Preview of the chosen image" hidden>
   <div class="row"><div><label for="b64-format">Output</label><select id="b64-format"><option value="uri">Data URI (for HTML and CSS)</option><option value="raw">Base64 only</option><option value="css">CSS background-image</option><option value="img">HTML &lt;img&gt; tag</option></select></div></div>
   <label for="b64-text">Base64</label><textarea id="b64-text" class="mono" readonly></textarea><div class="btns"><button class="primary" id="b64-copy">Copy</button></div></div>
  <h2 class="panel-title">Base64 to file</h2>
  <label for="b64-back">Paste Base64 or a data URI</label><textarea id="b64-back" class="mono" placeholder="data:image/png;base64,iVBORw0KGgo… or plain Base64"></textarea>
  <div class="btns"><button id="b64-save">Download as file</button></div><img id="b64-back-preview" class="b64-preview" alt="Preview of the decoded image" hidden><p id="b64-back-msg" class="note" aria-live="polite"></p>`,
 init(el) {
  B64_TEXT.init(el);
  let uri = "", name = "";
  const fmt = () => { const raw = uri.slice(uri.indexOf(",") + 1), v = $("#b64-format", el).value; $("#b64-text", el).value = v === "raw" ? raw : v === "css" ? `background-image: url("${uri}");` : v === "img" ? `<img src="${uri}" alt="">` : uri; };
  pickOneFile(el, "b64", f => {
    const p = $("#b64-file", el); p.hidden = false;
    if (f.size > 20 * 1048576) { p.textContent = `${f.name} is ${fsize(f.size)}. Choose a file under 20 MB; Base64 makes files a third bigger.`; return; }
    const r = new FileReader();
    r.onload = () => {
      uri = r.result; name = f.name; const img = $("#b64-preview", el);
      img.hidden = !/^data:image\//.test(uri); if (!img.hidden) img.src = uri;
      p.textContent = `${f.name} · ${fsize(f.size)} → ${fsize(uri.length - uri.indexOf(",") - 1)} of Base64`;
      $("#b64-file-out", el).hidden = false; fmt();
    };
    r.readAsDataURL(f);
  });
  $("#b64-format", el).onchange = fmt;
  $("#b64-copy", el).onclick = e => copy($("#b64-text", el).value, e.target);
  $("#b64-save", el).onclick = () => {
    const m = $("#b64-back-msg", el), src = $("#b64-back", el).value.trim(), img = $("#b64-back-preview", el);
    const head = /^data:([^;,]+)?(;base64)?,/i.exec(src), type = head?.[1] || "application/octet-stream";
    let b64 = (head ? src.slice(head[0].length) : src).replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - b64.length % 4) % 4);
    try {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), ext = ({"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf", "text/plain": "txt", "application/json": "json"})[type] || "bin";
      const blob = new Blob([bytes], {type}); saveBlob(blob, `decoded.${ext}`);
      img.hidden = !type.startsWith("image/"); if (!img.hidden) img.src = URL.createObjectURL(blob);
      say(m, `Decoded ${fsize(bytes.length)} as decoded.${ext}.`);
    } catch { img.hidden = true; say(m, "That isn't valid Base64. Check for missing or extra characters.", true); }
  };
 }},
{id: "url-encoder", cat: "advanced", name: "URL encoder and decoder", desc: "Make text safe for links, or read encoded URLs.",
 ...twoWay(encodeURIComponent, s => decodeURIComponent(s.replace(/\+/g, " ")), "Encode", "Decode", "That text has a broken % sequence, so it can’t be decoded.")},
{id: "hash-generator", cat: "advanced", name: "Hash generator", desc: "MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or files.",
 ui: `<label for="ht">Text to hash</label><textarea id="ht" class="mono" placeholder="Type or paste text here"></textarea>
  ${dropUI("hf-in", "*/*", "Or choose a file to get its checksum", false)}<p id="hf-file" class="file-picked" hidden></p>
  <label class="check"><input id="hash-upper" type="checkbox"> Uppercase hexadecimal</label>
  <label for="hash-expect">Compare with an expected hash (optional)</label><input id="hash-expect" class="mono" placeholder="Paste the checksum from the download page" autocomplete="off" spellcheck="false">
  <p id="hash-match" class="note" aria-live="polite"></p><div class="out hashes" id="ho"></div>`,
 init(el) {
  const algs = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"], o = $("#ho", el);
  if (!window.crypto || !crypto.subtle) { o.innerHTML = `<p class="err">Hashing needs the site to be opened over https.</p>`; return; }
  o.innerHTML = algs.map(a => `<div><label>${a}</label><code data-h="${a}"></code><button data-copy="${a}">Copy ${a}</button></div>`).join("");
  let revision = 0, source = null;
  const show = () => {
    const up = $("#hash-upper", el).checked, want = $("#hash-expect", el).value.trim().toLowerCase(), m = $("#hash-match", el);
    let hit = null;
    for (const a of algs) { const c = $(`[data-h="${a}"]`, el), v = c.dataset.v || ""; c.textContent = up ? v.toUpperCase() : v; c.parentElement.classList.toggle("match", !!want && v === want); if (want && v === want) hit = a; }
    if (!want) { m.textContent = ""; m.className = "note"; }
    else if (hit) { m.textContent = `✓ Match: the ${hit} hash is identical, so the ${source ? "file" : "text"} is unchanged.`; m.className = "note ok-msg"; }
    else { m.textContent = "✗ No match. The file or text is different from the original, or the expected hash uses another algorithm."; m.className = "err"; }
  };
  const run = async bytes => {
    const current = ++revision;
    algs.forEach(a => { const c = $(`[data-h="${a}"]`, el); c.dataset.v = ""; c.textContent = ""; });
    for (const a of algs) {
      const hex = a === "MD5" ? md5(bytes) : [...new Uint8Array(await crypto.subtle.digest(a, bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
      if (current !== revision) return;
      $(`[data-h="${a}"]`, el).dataset.v = hex;
    }
    show();
  };
  const fromText = () => { source = null; $("#hf-file", el).hidden = true; run(new TextEncoder().encode($("#ht", el).value)); };
  pickOneFile(el, "hf", async f => {
    const p = $("#hf-file", el); p.hidden = false;
    if (f.size > 1024 * 1048576) { p.textContent = `${f.name} is ${fsize(f.size)}. Files up to 1 GB can be hashed in the browser.`; return; }
    p.textContent = `Hashing ${f.name} (${fsize(f.size)})…`; source = f;
    await run(new Uint8Array(await f.arrayBuffer()));
    p.textContent = `Hashes of ${f.name} · ${fsize(f.size)}. Type in the text box to hash text instead.`;
  });
  o.addEventListener("click", e => { const a = e.target.dataset.copy; if (a) copy($(`[data-h="${a}"]`, el).textContent, e.target); });
  $("#hash-upper", el).addEventListener("change", show);
  $("#hash-expect", el).addEventListener("input", show);
  $("#ht", el).addEventListener("input", fromText); fromText();
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
  <label for="tu">Unix timestamp (seconds or milliseconds)</label><input id="tu" class="mono" inputmode="numeric"><label for="tu-unit" style="margin-top:12px">Timestamp unit</label><select id="tu-unit"><option value="auto">Auto-detect</option><option value="seconds">Seconds</option><option value="milliseconds">Milliseconds</option></select><div class="btns"><button id="tu-now">Use current time</button></div><p id="tuo" class="note" aria-live="polite"></p><div id="tdc" class="discord-codes" hidden><p class="dc-title">Discord timestamp codes</p><p class="note">Paste a code into a Discord message and everyone sees the time in their own time zone. Previews here are in UK English.</p><div class="table-wrap"><table><thead><tr><th scope="col">Code</th><th scope="col">Style</th><th scope="col">Preview</th><th scope="col"><span class="sr-only">Copy</span></th></tr></thead><tbody></tbody></table></div></div>
  <label for="td" style="margin-top:20px">Date and time</label><input id="td" type="datetime-local" step="1"><label for="td-zone" style="margin-top:12px">Interpret date in</label><select id="td-zone"><option value="local">Your local time zone</option><option value="utc">UTC</option></select><p id="tdo" class="note" aria-live="polite"></p>`,
 init(el) {
  const tick = () => $("#tn", el).textContent = Math.floor(Date.now() / 1000);
  tick(); const iv = setInterval(tick, 1000); cleanup = () => clearInterval(iv);
  $("#tu", el).value = Math.floor(Date.now() / 1000);
  const fromU = () => {
    const box = $("#tdc", el);
    box.hidden = true;
    $("tbody", box).innerHTML = "";

    const raw = $("#tu", el).value.trim(), o = $("#tuo", el), unit = $("#tu-unit", el).value;
    if (!/^[+-]?[0-9]+$/.test(raw)) { o.textContent = "Enter a whole timestamp without letters or decimals."; return; }
    const v = Number(raw);
    if (!Number.isSafeInteger(v)) { o.textContent = "Timestamp is too large to represent accurately."; return; }
    const ms = unit === "milliseconds" || (unit === "auto" && Math.abs(v) > 1e11);
    const d = new Date(ms ? v : v * 1000);
    if (!Number.isFinite(d.getTime())) { o.textContent = "Timestamp is outside the supported date range."; return; }
    o.innerHTML = `Interpreted as ${ms ? "milliseconds" : "seconds"}.<br>Local: <b>${d.toLocaleString("en-GB", {dateStyle:"full",timeStyle:"medium"})}</b><br>UTC (ISO 8601): <b>${d.toISOString()}</b>`;
    discord(d);
  };
  // Discord timestamp codes: Discord shows <t:seconds:style> in each reader's own time zone and language.
  const discord = d => {
    const s = Math.floor(d.getTime() / 1000), box = $("#tdc", el), gb = (opts) => d.toLocaleString("en-GB", opts);
    const diff = (d - Date.now()) / 1000, units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    const [unit, size] = units.find(([, n]) => Math.abs(diff) >= n) || units[units.length - 1];
    const rel = new Intl.RelativeTimeFormat("en-GB", {numeric: "auto"}).format(Math.round(diff / size), unit);
    const styles = [["t", "Short time", gb({hour: "2-digit", minute: "2-digit"})], ["T", "Long time", gb({hour: "2-digit", minute: "2-digit", second: "2-digit"})],
      ["d", "Short date", gb({day: "2-digit", month: "2-digit", year: "numeric"})], ["D", "Long date", gb({day: "numeric", month: "long", year: "numeric"})],
      ["f", "Short date and time", gb({day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"})],
      ["F", "Long date and time", gb({weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"})], ["R", "Relative", rel]];
    box.hidden = false;
    $("tbody", box).innerHTML = styles.map(([k, name, preview]) => `<tr><td><code>&lt;t:${s}:${k}&gt;</code></td><td>${name}</td><td>${esc(preview)}</td><td><button type="button" data-code="&lt;t:${s}:${k}&gt;">Copy</button></td></tr>`).join("");
  };
  $("#tdc", el).addEventListener("click", e => { const b = e.target.closest("button[data-code]"); if (b) copy(b.dataset.code, b); });
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
    const r = ukPay(g, pc), row = (l, v, c = "") => `<tr class="${c}"><th scope="row">${l}</th><td>${gbp(v)}</td><td>${gbp(v / 12)}</td><td>${gbp(v / 52)}</td></tr>`;
    o.innerHTML = `<p class="big">${gbp(r.net / 12)} a month</p><p class="sub">Your take-home pay after tax, NI and pension</p>
      <div class="tablewrap" style="margin-top:14px"><table><tr><th></th><th>Year</th><th>Month</th><th>Week</th></tr>
      ${row("Gross pay", r.gross)}${row("Pension", -r.pen)}${row("Income tax", -r.tax)}${row("National Insurance", -r.ni)}${row("Take-home pay", r.net, "total")}</table></div>`;
  };
  el.addEventListener("input", run); run();
 }},
{id: "loan-calculator", cat: "finance", name: "Loan repayment calculator", desc: "Monthly payment, total interest, repayment schedule and overpayments.",
 ui: `<div class="row"><div><label for="la">Amount borrowed (£)</label><input id="la" inputmode="decimal" value="10000"></div><div><label for="lr">Interest rate (APR %)</label><input id="lr" inputmode="decimal" value="6.9"></div></div>
  <div class="row"><div><label for="ly">Years</label><input id="ly" type="number" min="0" value="5"></div><div><label for="lm">Extra months</label><input id="lm" type="number" min="0" max="11" value="0"></div><div><label for="lx">Overpay each month (£, optional)</label><input id="lx" inputmode="decimal" value="0"></div></div>
  <details class="loan-early"><summary>Pay off early: lump sum or full settlement</summary>
  <div class="row"><div><label for="ll">One-off lump sum (£)</label><input id="ll" inputmode="decimal" value="0"></div><div><label for="llm">Paid after month</label><input id="llm" type="number" min="1" value="12"></div><div><label for="ls">Settle in full after month (optional)</label><input id="ls" type="number" min="1" placeholder="e.g. 24"></div></div>
  <p class="note">A lump sum lowers the balance and keeps the same monthly payment, so the loan ends sooner. Settling estimates what you'd still owe after that month's payment, and what you'd avoid paying.</p></details><div class="out" id="lo"></div>`,
 init(el) {
  let sched = [];
  const run = () => {
    const P = num($("#la", el).value), apr = num($("#lr", el).value), r = apr / 1200, years = Number($("#ly", el).value), months = Number($("#lm", el).value), n = years * 12 + months, o = $("#lo", el), extra = num($("#lx", el).value) || 0;
    if (!(P > 0) || !Number.isFinite(apr) || apr < 0 || !Number.isInteger(years) || years < 0 || !Number.isInteger(months) || months < 0 || months > 11 || !(n > 0) || n > 1200) return o.innerHTML = `<p class="err">Enter a positive amount, non-negative APR, and a term of 1–1,200 months (extra months 0–11).</p>`;
    if (extra < 0) return o.innerHTML = `<p class="err">Overpayments can't be negative.</p>`;
    const lump = num($("#ll", el).value) || 0, lumpAt = Number($("#llm", el).value), settleRaw = $("#ls", el).value.trim(), settleAt = settleRaw ? Number(settleRaw) : 0;
    if (lump < 0) return o.innerHTML = `<p class="err">The lump sum can't be negative.</p>`;
    if (lump > 0 && !(Number.isInteger(lumpAt) && lumpAt >= 1 && lumpAt <= n)) return o.innerHTML = `<p class="err">Enter the month of the lump sum as a whole number from 1 to ${n}.</p>`;
    if (settleRaw && !(Number.isInteger(settleAt) && settleAt >= 1 && settleAt <= n)) return o.innerHTML = `<p class="err">Enter the settlement month as a whole number from 1 to ${n}.</p>`;
    const pay = r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
    // Month-by-month schedule, including any regular overpayment and a one-off lump sum paid after that month's payment.
    sched = []; let bal = P, paidInt = 0;
    for (let m = 1; bal > 0.005 && m <= n; m++) {
      const i = bal * r; let due = Math.min(bal + i, pay + extra);
      if (lump > 0 && m === lumpAt) due = Math.min(bal + i, due + lump);
      bal = bal + i - due; paidInt += i; sched.push({m, pay: due, interest: i, principal: due - i, bal: Math.max(0, bal)});
    }
    const months_ = sched.length, totalPaid = sched.reduce((t, x) => t + x.pay, 0), years_ = [];
    for (let y = 0; y * 12 < months_; y++) { const rows = sched.slice(y * 12, y * 12 + 12); years_.push({y: y + 1, pay: rows.reduce((t, x) => t + x.pay, 0), interest: rows.reduce((t, x) => t + x.interest, 0), principal: rows.reduce((t, x) => t + x.principal, 0), bal: rows[rows.length - 1].bal}); }
    const over = extra > 0 || lump > 0, what = [extra > 0 ? `overpaying ${gbp(extra)} a month` : "", lump > 0 ? `a ${gbp(lump)} lump sum after month ${lumpAt}` : ""].filter(Boolean).join(" and ");
    const saving = over ? `<p class="note ok-msg">${what[0].toUpperCase() + what.slice(1)} clears it ${dur(n - months_)} sooner and saves ${gbp(pay * n - P - paidInt)} in interest.</p>` : "";
    // Settling in full after a given month: the balance left then, the interest still to come, and the extra
    // interest a UK lender may add (up to 58 days on most personal loans; the lender's settlement figure is exact).
    let settle = "";
    if (settleAt) {
      if (settleAt >= months_) settle = `<p class="note">The loan is already cleared by month ${months_}, so there's nothing left to settle after month ${settleAt}.</p>`;
      else {
        const left = sched[settleAt - 1].bal, future = sched.slice(settleAt).reduce((t, x) => t + x.interest, 0), extraInt = left * (apr / 100) * 58 / 365;
        settle = `<div class="settle"><p class="sub" style="margin:14px 0 6px"><strong>Settling in full after month ${settleAt}</strong></p><div class="stats">${stats([[gbp(left), "Balance left"], [gbp(left + extraInt), "Settlement, with up to 58 days' interest"], [gbp(Math.max(0, future - extraInt)), "Interest saved, at least"]])}</div>
          <p class="note">Lenders can usually add up to 58 days' interest when you settle, and some fixed-rate loans have a small fee. Ask your lender for a settlement figure: that's the exact amount. For a closer estimate, use the <a href="early-loan-settlement-calculator.html">early loan settlement calculator</a>.</p></div>`;
      }
    }
    o.innerHTML = `<p class="big">${gbp(pay)} a month</p><p class="sub">for ${dur(n)}${over ? `, cleared in ${dur(months_)} with ${what}` : ""}</p>
      <div class="stats" style="margin-top:14px">${stats([[gbp(over ? totalPaid : pay * n), "Total repaid"], [gbp(over ? paidInt : pay * n - P), "Total interest"]])}</div>${saving}${settle}
      <details class="schedule"><summary>Repayment schedule by year</summary><div class="tablewrap"><table><tr><th>Year</th><th>Paid</th><th>Interest</th><th>Capital</th><th>Balance left</th></tr>${years_.map(x => `<tr><th scope="row">${x.y}</th><td>${gbp(x.pay)}</td><td>${gbp(x.interest)}</td><td>${gbp(x.principal)}</td><td>${gbp(x.bal)}</td></tr>`).join("")}</table></div>
      <div class="btns"><button type="button" id="l-csv">Download monthly schedule (CSV)</button></div></details>`;
    $("#l-csv", o).onclick = () => saveBlob(new Blob(["﻿Month,Payment,Interest,Capital,Balance\n" + sched.map(x => [x.m, x.pay, x.interest, x.principal, x.bal].map(v => typeof v === "number" && !Number.isInteger(v) ? v.toFixed(2) : v).join(",")).join("\n")], {type: "text/csv"}), "loan-schedule.csv");
  };
  el.addEventListener("input", run); run();
 }},
{id: "loan-settlement", cat: "finance", name: "Early loan settlement calculator", desc: "Settlement figure and interest saved for a loan or car finance (PCP or HP).",
 ui: `<div class="row"><div><label for="es-mode">I know</label><select id="es-mode"><option value="loan">The amount borrowed and the term</option><option value="stmt">My monthly payment and payments left</option></select></div><div><label for="es-apr">APR (%)</label><input id="es-apr" inputmode="decimal" value="9.9"></div></div>
  <div class="row es-loan"><div><label for="es-amt">Amount borrowed (£)</label><input id="es-amt" inputmode="decimal" value="15000"></div><div><label for="es-term">Term (months)</label><input id="es-term" type="number" min="2" max="600" value="60"></div><div><label for="es-made">Payments made so far</label><input id="es-made" type="number" min="0" value="24"></div></div>
  <div class="row es-stmt" style="display:none"><div><label for="es-pay">Monthly payment (£)</label><input id="es-pay" inputmode="decimal" value="314.86"></div><div><label for="es-left">Payments left</label><input id="es-left" type="number" min="1" max="600" value="36"></div></div>
  <div class="row"><div><label for="es-bal">Final balloon payment (£, PCP car finance; 0 if none)</label><input id="es-bal" inputmode="decimal" value="0"></div></div>
  <div class="row"><div><label for="es-days">Days until settlement (0–30)</label><input id="es-days" type="number" min="0" max="30" value="28"></div><div><label for="es-when">Agreement taken out</label><select id="es-when"><option value="new">On or after 1 February 2011</option><option value="old">Before 1 February 2011</option></select></div></div>
  <div class="out" id="es-out" aria-live="polite"></div>
  <p class="note">Assumes you ask just after a monthly payment, so no other payment falls due before you settle. Your lender's settlement statement gives the exact figure.</p>`,
 init(el) {
  const run = () => {
    const o = $("#es-out", el), stmt = $("#es-mode", el).value === "stmt", apr = num($("#es-apr", el).value), days = Number($("#es-days", el).value), isNew = $("#es-when", el).value === "new";
    $(".es-loan", el).style.display = stmt ? "none" : ""; $(".es-stmt", el).style.display = stmt ? "" : "none";
    if (!Number.isFinite(apr) || apr < 0 || apr > 1000) return o.innerHTML = `<p class="err">Enter an APR of 0% or more.</p>`;
    if (!(Number.isInteger(days) && days >= 0 && days <= 30)) return o.innerHTML = `<p class="err">Enter the days until settlement as a whole number from 0 to 30. Lenders use 28 days after they receive your request.</p>`;
    // Statutory method: the APR is an annual effective rate; the monthly rate is its 12th root.
    const A = apr / 100, i = Math.pow(1 + A, 1 / 12) - 1, pv = (p, n) => i ? p * (1 - Math.pow(1 + i, -n)) / i : p * n;
    const B = num($("#es-bal", el).value || "0");
    if (!(Number.isFinite(B) && B >= 0)) return o.innerHTML = `<p class="err">The final balloon payment must be £0 or more.</p>`;
    let pay, left;
    if (stmt) {
      pay = num($("#es-pay", el).value); left = Number($("#es-left", el).value);
      if (!(pay > 0) || !(Number.isInteger(left) && left >= 1 && left <= 600)) return o.innerHTML = `<p class="err">Enter your monthly payment and the number of payments left (1 to 600).</p>`;
    } else {
      const P = num($("#es-amt", el).value), N = Number($("#es-term", el).value), made = Number($("#es-made", el).value);
      if (!(P > 0) || !(Number.isInteger(N) && N >= 2 && N <= 600)) return o.innerHTML = `<p class="err">Enter the amount borrowed and a term of 2 to 600 months.</p>`;
      if (!(Number.isInteger(made) && made >= 0 && made < N)) return o.innerHTML = `<p class="err">Payments made must be a whole number from 0 to ${N - 1}.</p>`;
      if (B >= P * Math.pow(1 + i, N)) return o.innerHTML = `<p class="err">The final payment is too large for that amount, rate and term.</p>`;
      // With a balloon (PCP), the monthly payments repay the amount borrowed less the present value of the final payment.
      const vN = Math.pow(1 + i, -N); pay = i ? (P - B * vN) * i / (1 - vN) : (P - B) / N; left = N - made;
      if (!(pay > 0)) return o.innerHTML = `<p class="err">The final payment is too large for that amount, rate and term.</p>`;
    }
    // Amount to settle d days after the last payment, the most a lender could ask if it defers the settlement
    // date by a month (more than a year left), and the compensation allowed on newer agreements over £8,000.
    const at = (n, d) => (pv(pay, n) + B * Math.pow(1 + i, -n)) * Math.pow(1 + A, d / 365);
    const figure = at(left, days), t = days / 365;
    const deferred = left > 12 ? (pv(pay, left) + B * Math.pow(1 + i, -left)) * Math.pow(1 + A, t + 1 / 12) + pay * (1 - Math.pow(1 + A, t)) : figure;
    const remaining = pay * left + B, comp = isNew && figure > 8000 ? Math.min((left > 12 ? 0.01 : 0.005) * figure, remaining - figure) : 0;
    const worst = deferred + comp, savedMin = Math.max(0, remaining - worst), savedMax = Math.max(0, remaining - figure);
    let html = `<p class="big">${gbp(figure)} to settle</p><p class="sub">in ${plural(days, "day")}, instead of ${plural(left, "more payment")} of ${gbp(pay)}${B > 0 ? ` and a final payment of ${gbp(B)}` : ""} (${gbp(remaining)})</p>
      <div class="stats" style="margin-top:14px">${stats([[gbp(savedMax), "Interest saved"], [gbp(worst), "Highest likely figure"], [gbp(savedMin), "Saved, at the least"]])}</div>`;
    const why = [];
    if (deferred > figure) why.push(`up to ${gbp(deferred - figure)} more if your lender works out the rebate one month later, which the rules allow when more than a year is left`);
    if (comp > 0) why.push(`up to ${gbp(comp)} early repayment compensation (${left > 12 ? "1%" : "0.5%"} of the amount repaid), allowed because more than £8,000 is being repaid early`);
    html += why.length ? `<p class="note">The highest likely figure adds ${why.join(", and ")}. Many lenders charge less, or nothing.</p>` : `<p class="note">With a year or less left and no more than £8,000 repaid early, the lender can't add a deferral or compensation, so the figure should be close.</p>`;
    if (B > 0) html += `<p class="note">Car finance: settling includes the ${gbp(B)} final payment, so you own the car. If you'd rather hand it back, PCP and hire purchase let you end the agreement once you've paid half the total amount payable (voluntary termination), or return the car at the end instead of paying the final payment.</p>`;
    if (isNew && figure <= 8000 && left > 0) html += `<p class="note ok-msg">No early repayment compensation: you're repaying ${gbp(figure)}, below the £8,000 a year threshold.</p>`;
    // Settling later: the figure and the interest still saved after more payments.
    const rows = [];
    for (let k = 6; k < left; k += k < 24 ? 6 : 12) { const f = at(left - k, days); rows.push(`<tr><th scope="row">${plural(k, "more payment")}</th><td>${gbp(f)}</td><td>${gbp(pay * (left - k) + B - f)}</td></tr>`); if (rows.length >= 8) break; }
    if (rows.length) html += `<details class="schedule"><summary>If you settle later</summary><div class="tablewrap"><table><tr><th>After</th><th>Settlement figure</th><th>Interest saved</th></tr><tr><th scope="row">Now</th><td>${gbp(figure)}</td><td>${gbp(savedMax)}</td></tr>${rows.join("")}</table></div><p class="note">Before any deferral or compensation. Settling sooner always saves more interest.</p></details>`;
    o.innerHTML = html;
  };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
 }},
{id: "mortgage-overpayment", cat: "finance", name: "Mortgage overpayment calculator", desc: "See how overpaying or a lump sum shortens your mortgage and cuts interest.",
 ui: `<div class="row"><div><label for="mo-bal">Mortgage balance (£)</label><input id="mo-bal" inputmode="decimal" value="200000"></div><div><label for="mo-rate">Interest rate (%)</label><input id="mo-rate" inputmode="decimal" value="4.5"></div></div>
  <div class="row"><div><label for="mo-y">Years left</label><input id="mo-y" type="number" min="0" max="40" value="25"></div><div><label for="mo-m">Extra months</label><input id="mo-m" type="number" min="0" max="11" value="0"></div><div><label for="mo-x">Overpay each month (£)</label><input id="mo-x" inputmode="decimal" value="0"></div></div>
  <div class="row"><div><label for="mo-l">One-off lump sum (£)</label><input id="mo-l" inputmode="decimal" value="0"></div><div><label for="mo-lm">Paid after month</label><input id="mo-lm" type="number" min="1" value="12"></div>
   <div><label for="mo-mode">After the lump sum</label><select id="mo-mode"><option value="term">Keep the payment, end sooner</option><option value="pay">Keep the end date, pay less</option></select></div></div>
  <div class="row"><div><label for="mo-t">Or: mortgage-free in (years, optional)</label><input id="mo-t" type="number" min="1" max="40" placeholder="e.g. 15"></div></div>
  <div class="out" id="mo-out"></div>`,
 init(el) {
  const run = () => {
    const B = num($("#mo-bal", el).value), rate = num($("#mo-rate", el).value), r = rate / 1200, n = Number($("#mo-y", el).value) * 12 + Number($("#mo-m", el).value);
    const extra = num($("#mo-x", el).value) || 0, lump = num($("#mo-l", el).value) || 0, lumpAt = Number($("#mo-lm", el).value), lower = $("#mo-mode", el).value === "pay", target = Number($("#mo-t", el).value) || 0, o = $("#mo-out", el);
    if (!(B > 0) || !Number.isFinite(rate) || rate < 0 || !Number.isInteger(n) || n < 1 || n > 480) return o.innerHTML = `<p class="err">Enter a positive balance, a rate of 0% or more, and 1 month to 40 years left.</p>`;
    if (extra < 0 || lump < 0) return o.innerHTML = `<p class="err">Overpayments can't be negative.</p>`;
    if (lump > 0 && !(Number.isInteger(lumpAt) && lumpAt >= 1 && lumpAt <= n)) return o.innerHTML = `<p class="err">Enter the lump sum month as a whole number from 1 to ${n}.</p>`;
    const pmt = (P, m) => r ? P * r / (1 - Math.pow(1 + r, -m)) : P / m, base = pmt(B, n), baseInterest = base * n - B;
    // Month by month with overpayments. A lump sum either shortens the term or, if chosen, lowers the payment for the remaining term.
    let bal = B, pay = base, interest = 0, months = 0, newPay = null; const yearBal = [];
    for (let m = 1; bal > 0.005 && m <= n; m++) {
      const i = bal * r; interest += i;
      let out = Math.min(bal + i, pay + extra);
      if (lump > 0 && m === lumpAt) out = Math.min(bal + i, out + lump);
      bal = bal + i - out; months = m;
      if (lump > 0 && m === lumpAt && lower && bal > 0.005) { pay = pmt(bal, n - m); newPay = pay; }
      if (m % 12 === 0) yearBal.push(Math.max(0, bal));
    }
    if (months % 12) yearBal.push(0);
    const saved = baseInterest - interest, sooner = n - months, overYear1 = extra * Math.min(12, months) + (lump > 0 && lumpAt <= 12 ? lump : 0);
    let html = `<p class="big">${gbp(base)} a month</p><p class="sub">to clear ${gbp(B)} in ${dur(n)}, with ${gbp(baseInterest)} of interest</p>`;
    if (extra > 0 || lump > 0) {
      html += `<div class="stats" style="margin-top:14px">${stats([[dur(months), "Mortgage-free in"], [gbp(saved), "Interest saved"], [sooner > 0 ? dur(sooner) : "Same end date", "Sooner"]])}</div>`;
      if (newPay !== null) html += `<p class="note ok-msg">After the lump sum your monthly payment drops to ${gbp(newPay)}${extra > 0 ? ` (plus your ${gbp(extra)} overpayment)` : ""}.</p>`;
      if (overYear1 > B * 0.1) html += `<p class="note">You'd overpay ${gbp(overYear1)} in the first year, more than 10% of the balance (${gbp(B * 0.1)}). Many fixed and tracker deals charge an early repayment charge above 10% a year, so check your mortgage terms.</p>`;
      else html += `<p class="note">First-year overpayments: ${gbp(overYear1)}, within 10% of the balance (${gbp(B * 0.1)}), the allowance many lenders give without a charge.</p>`;
    }
    if (target) {
      if (target * 12 >= n) html += `<p class="note">You're already due to finish within ${plural(target, "year")}.</p>`;
      else { const need = pmt(B, target * 12) - base; html += `<p class="note ok-msg">To be mortgage-free in ${plural(target, "year")}, overpay about <strong>${gbp(need)} a month</strong> (${gbp(base + need)} in total), saving about ${gbp(baseInterest - ((base + need) * target * 12 - B))} in interest.</p>`; }
    }
    if (extra > 0 || lump > 0) {
      const rows = yearBal.map((b, k) => { const y = k + 1, m = Math.min(y * 12, n), noOver = r ? B * Math.pow(1 + r, m) - base * (Math.pow(1 + r, m) - 1) / r : B - base * m; return `<tr><th scope="row">${y}</th><td>${gbp(Math.max(0, noOver))}</td><td>${gbp(b)}</td></tr>`; }).join("");
      html += `<details class="schedule"><summary>Balance year by year</summary><div class="tablewrap"><table><tr><th>Year</th><th>Without overpaying</th><th>With overpaying</th></tr>${rows}</table></div></details>`;
    }
    o.innerHTML = html;
  };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
 }},
{id: "savings-calculator", cat: "finance", name: "Savings calculator", desc: "See how regular saving and compound interest grow.",
 ui: `<div class="row"><div><label for="vs">Starting amount (£)</label><input id="vs" inputmode="decimal" value="1000"></div><div><label for="vm">Monthly deposit (£)</label><input id="vm" inputmode="decimal" value="100"></div></div>
  <div class="row"><div><label for="vr">Interest rate (AER %)</label><input id="vr" inputmode="decimal" value="4"></div><div><label for="vy">Years</label><input id="vy" type="number" min="1" max="50" value="10"></div></div><div class="out" id="vo"></div>
  <details class="aer-conv"><summary>AER calculator: convert a gross rate to AER, or back</summary>
  <div class="row"><div><label for="ar">Rate (%)</label><input id="ar" inputmode="decimal" value="5"></div><div><label for="af">Interest paid</label><select id="af"><option value="12" selected>Monthly</option><option value="4">Quarterly</option><option value="2">Twice a year</option><option value="1">Yearly</option><option value="365">Daily</option></select></div><div><label for="ad">This rate is</label><select id="ad"><option value="gross" selected>The gross rate</option><option value="aer">The AER</option></select></div></div>
  <div class="out" id="ao"></div><p class="note">AER = (1 + gross rate ÷ payments a year)<sup>payments a year</sup> − 1. Banks show both: the gross rate is what's paid each time, the AER lets you compare accounts that pay at different frequencies.</p></details>`,
 init(el) {
  const run = () => {
    const s = num($("#vs", el).value), d = num($("#vm", el).value), y = Number($("#vy", el).value), aer = num($("#vr", el).value), o = $("#vo", el);
    if (![s, d, y, aer].every(Number.isFinite) || s < 0 || d < 0 || aer <= -100 || !Number.isInteger(y) || y < 1 || y > 50) return o.innerHTML = `<p class="err">Enter non-negative amounts, an AER above -100%, and 1–50 whole years.</p>`;
    const r = Math.pow(1 + aer / 100, 1 / 12) - 1;
    let bal = s, rows = "";
    for (let i = 1; i <= y; i++) { for (let m = 0; m < 12; m++) bal = bal * (1 + r) + d; const dep = s + d * 12 * i; rows += `<tr><th scope="row">Year ${i}</th><td>${gbp(dep)}</td><td>${gbp(bal - dep)}</td><td>${gbp(bal)}</td></tr>`; }
    const dep = s + d * 12 * y;
    o.innerHTML = `<p class="big">${gbp(bal)}</p><p class="sub">after ${plural(y, "year")}: ${gbp(dep)} paid in and ${gbp(bal - dep)} interest</p>
      <div class="tablewrap" style="margin-top:14px"><table><tr><th></th><th>Paid in</th><th>Interest</th><th>Balance</th></tr>${rows}</table></div>`;
  };
  // Gross rate <-> AER for a given number of interest payments a year.
  const conv = () => {
    const rate = num($("#ar", el).value), n = Number($("#af", el).value), fromGross = $("#ad", el).value === "gross", o = $("#ao", el);
    if (!Number.isFinite(rate) || rate <= -100 || rate > 1000) return o.innerHTML = `<p class="err">Enter a rate between -100% and 1,000%.</p>`;
    const pct = v => `${v.toLocaleString("en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2})}%`;
    const freq = {12: "monthly", 4: "quarterly", 2: "twice a year", 1: "yearly", 365: "daily"}[n];
    if (fromGross) {
      const aer = (Math.pow(1 + rate / 100 / n, n) - 1) * 100;
      o.innerHTML = `<p class="big">${pct(aer)} AER</p><p class="sub">${pct(rate)} gross, paid ${freq}. £10,000 earns about ${gbp(10000 * aer / 100)} in a year.</p>`;
    } else {
      const gross = (Math.pow(1 + rate / 100, 1 / n) - 1) * n * 100;
      o.innerHTML = `<p class="big">${pct(gross)} gross</p><p class="sub">paid ${freq}, for ${pct(rate)} AER. £10,000 earns about ${gbp(10000 * rate / 100)} in a year.</p>`;
    }
  };
  el.addEventListener("input", e => (e.target.closest(".aer-conv") ? conv : run)()); el.addEventListener("change", conv); run(); conv();
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
{id: "budget-planner", cat: "finance", name: "50/30/20 budget planner", desc: "Split your pay into needs, wants and savings, and compare with what you spend.",
 ui: `<div class="row"><div><label for="bi">Take-home pay (£)</label><input id="bi" inputmode="decimal" value="2200"></div><div><label for="bf">Paid</label><select id="bf"><option value="12" selected>Monthly</option><option value="13">Every 4 weeks</option><option value="26">Every 2 weeks (fortnightly)</option><option value="52">Weekly</option><option value="1">Yearly (after tax)</option></select></div></div><div class="out" id="bo"></div>
  <details class="bp-actual"><summary>Compare with what you actually spend</summary><p class="note">Enter what you spend in the same period as your pay.</p>
  <div class="row"><div><label for="ban">Needs: bills, rent, food, travel (£)</label><input id="ban" inputmode="decimal" placeholder="e.g. 1250"></div><div><label for="baw">Wants (£)</label><input id="baw" inputmode="decimal" placeholder="e.g. 500"></div><div><label for="bas">Savings and extra debt payments (£)</label><input id="bas" inputmode="decimal" placeholder="e.g. 200"></div></div><div class="out" id="bao"></div></details>
  <p class="note">Needs are bills you must pay: rent, council tax, energy, food, transport, minimum debt payments. Wants are everything optional. The last 20% goes to savings or paying debt off faster.</p>`,
 init(el) {
  const run = () => {
    const i = num($("#bi", el).value), per = Number($("#bf", el).value), o = $("#bo", el);
    if (!(i > 0)) return o.innerHTML = `<p class="err">Enter your income after tax.</p>`;
    // Splits are shown for the period you're paid; other periods use the yearly total (52 weeks, 26 fortnights, 13 four-week periods).
    const year = i * per, label = {1: "a year", 12: "a month", 13: "every 4 weeks", 26: "a fortnight", 52: "a week"}[per];
    const split = (amount, what) => `<div class="stats">${stats([[gbp(amount * .5), `Needs (50%) ${what}`], [gbp(amount * .3), `Wants (30%) ${what}`], [gbp(amount * .2), `Savings and debt (20%) ${what}`]])}</div>`;
    const also = [[12, "a month"], [52, "a week"]].filter(([p]) => p !== per).map(([p, l]) => `${gbp(year / p * .5)} / ${gbp(year / p * .3)} / ${gbp(year / p * .2)} ${l}`);
    o.innerHTML = split(i, label) + `<p class="note">That's ${gbp(year)} a year after tax. Needs / wants / savings: ${also.join("; ")}.</p>`;
    // Optional comparison with real spending in the same period.
    const vals = ["#ban", "#baw", "#bas"].map(id => $(id, el).value.trim()), ao = $("#bao", el);
    if (vals.every(v => v === "")) return ao.innerHTML = "";
    const [n, w, sv] = vals.map(v => v === "" ? 0 : num(v));
    if (![n, w, sv].every(v => Number.isFinite(v) && v >= 0)) return ao.innerHTML = `<p class="err">Spending amounts must be £0 or more.</p>`;
    const spent = n + w + sv, left = i - spent, pct = v => `${(v / i * 100).toFixed(0)}%`;
    const row = (name, act, share) => { const target = i * share, d = act - target; return `<tr><th scope="row">${name}</th><td>${gbp(act)} (${pct(act)})</td><td>${gbp(target)} (${share * 100}%)</td><td>${Math.abs(d) < 0.005 ? "On target" : d > 0 ? `${gbp(d)} over` : `${gbp(-d)} under`}</td></tr>`; };
    ao.innerHTML = `<div class="tablewrap"><table><tr><th>${esc(label[0].toUpperCase() + label.slice(1))}</th><th>You spend</th><th>50/30/20 target</th><th>Difference</th></tr>${row("Needs", n, .5)}${row("Wants", w, .3)}${row("Savings and debt", sv, .2)}</table></div>`
      + (left >= 0 ? `<p class="note ok-msg">${gbp(left)} left unallocated ${label}. Adding it to savings would put ${pct(sv + left)} towards savings and debt.</p>` : `<p class="err">You're spending ${gbp(-left)} more than you take home ${label}.</p>`)
      + (n > i * .5 ? `<p class="note">Needs take ${pct(n)} of your pay. That's common with UK housing costs: aim to keep wants down so you can still save something.</p>` : "");
  };
  el.addEventListener("input", run); el.addEventListener("change", run); run();
 }}
];

// Each tool has its own static, indexable page. Keep in sync with scripts/content.mjs (checked by tests).
const SLUGS = {
  "sign-pdf": "sign-pdf.html",
  "edit-pdf": "edit-pdf.html",
  "extract-pages": "extract-pdf-pages.html",
  "merge-word": "merge-word-documents.html",
  "pdf-to-excel": "pdf-to-excel.html", "excel-to-pdf": "excel-to-pdf.html", "csv-to-excel": "csv-to-excel.html", "excel-to-csv": "excel-to-csv.html", "merge-excel": "merge-excel-files.html", "excel-to-json": "excel-to-json.html", "remove-duplicate-rows": "remove-duplicate-rows.html", "excel-viewer": "excel-viewer.html",
  "merge-pdf": "merge-pdf.html", "split-pdf": "split-pdf.html", "rotate-pdf": "rotate-pdf.html", "delete-pdf-pages": "delete-pdf-pages.html", "jpg-to-pdf": "jpg-to-pdf.html", "pdf-to-jpg": "pdf-to-jpg.html", "pdf-to-word": "pdf-to-word.html", "word-to-pdf": "word-to-pdf.html", "compress-pdf": "compress-pdf.html", "image-converter": "image-converter.html", "image-compressor": "image-compressor.html", "image-resizer": "image-resizer.html",
  "time-duration": "time-duration-calculator.html", "aspect-ratio": "aspect-ratio-calculator.html", "text-sorter": "text-line-sorter.html",
  "date-difference": "date-difference-calculator.html", "bmi-calculator": "bmi-calculator.html", "word-counter": "word-counter.html",
  "case-converter": "case-converter.html", "password-generator": "password-generator.html", "unit-converter": "unit-converter.html",
  "age-calculator": "age-calculator.html", "percentage-calculator": "percentage-calculator.html", "json-formatter": "json-formatter.html",
  "base64": "base64-encoder-decoder.html", "url-encoder": "url-encoder-decoder.html", "hash-generator": "hash-generator.html",
  "uuid-generator": "uuid-generator.html", "timestamp-converter": "unix-timestamp-converter.html", "colour-converter": "colour-converter.html",
  "take-home-pay": "uk-take-home-pay-calculator.html", "loan-calculator": "loan-repayment-calculator.html", "loan-settlement": "early-loan-settlement-calculator.html", "mortgage-overpayment": "mortgage-overpayment-calculator.html", "savings-calculator": "savings-calculator.html",
  "debt-payoff": "debt-payoff-calculator.html", "vat-calculator": "vat-calculator.html", "budget-planner": "budget-planner.html"
};
const CATS = [
  {id: "files", name: "PDF & image"},
  {id: "office", name: "Office & data"},
  {id: "general", name: "General"},
  {id: "advanced", name: "Developer"},
  {id: "finance", name: "Finance"}
];
const app = $("#app");
const DEF_DESC = $('meta[name="description"]').content, DEF_TITLE = document.title;

// Small icon glyph for each tool card.
const ICONS = {"sign-pdf": "✍", "edit-pdf": "✎", "extract-pages": "⇱", "mortgage-overpayment": "⌂", "loan-settlement": "✓", "merge-word": "W+", "pdf-to-excel": "XLS", "excel-to-pdf": "PDF", "csv-to-excel": "CSV", "excel-to-csv": "⇢", "merge-excel": "⊞", "excel-to-json": "{ }", "remove-duplicate-rows": "≠", "excel-viewer": "▤",
  "merge-pdf": "⧉", "split-pdf": "✂", "rotate-pdf": "↻", "delete-pdf-pages": "⌫", "jpg-to-pdf": "JPG", "pdf-to-jpg": "PDF", "pdf-to-word": "W", "word-to-pdf": "DOC", "compress-pdf": "⇲", "image-converter": "⇆", "image-compressor": "◫", "image-resizer": "⤢",
  "time-duration": "◷", "aspect-ratio": "▭", "text-sorter": "⇅", "date-difference": "▦", "bmi-calculator": "♡", "word-counter": "¶",
  "case-converter": "Aa", "password-generator": "✱", "unit-converter": "⇄", "age-calculator": "✦", "percentage-calculator": "%",
  "json-formatter": "{ }", "base64": "64", "url-encoder": "%20", "hash-generator": "#", "uuid-generator": "ID", "timestamp-converter": "⏱",
  "colour-converter": "◐", "take-home-pay": "£", "loan-calculator": "⌂", "savings-calculator": "↗", "debt-payoff": "↘", "vat-calculator": "VAT", "budget-planner": "◔"};
const HOME_ORDER = ["files", "office", "finance", "general", "advanced"];
const POPULAR = [["Merge PDF", "merge-pdf.html"], ["Sign PDF", "sign-pdf.html"], ["Edit PDF", "edit-pdf.html"], ["PDF to Word", "pdf-to-word.html"], ["JPG to PDF", "jpg-to-pdf.html"], ["PDF to Excel", "pdf-to-excel.html"], ["UK take-home pay", "uk-take-home-pay-calculator.html"], ["VAT", "vat-calculator.html"],
  ["Loan repayments", "loan-repayment-calculator.html"], ["Word counter", "word-counter.html"], ["Password generator", "password-generator.html"], ["Percentage", "percentage-calculator.html"]];
// Pages that are not in TOOLS but deserve their own card on the home page.
const EXTRA_CARDS = {
  finance: [{name: "Salary after tax table", desc: "Take-home pay for common UK salaries from £18,000 to £150,000.", href: "salary-after-tax.html", icon: "≡"}],
  general: [{name: "Automation builder", desc: "Chain text steps into a reusable workflow that runs in your browser.", href: "automation-builder.html", icon: "⚙"}],
};
const cards = cat => [...TOOLS.filter(x => x.cat === cat).map(x => ({name: x.name, desc: x.desc, href: SLUGS[x.id], icon: ICONS[x.id] || "✦"})), ...(EXTRA_CARDS[cat] || [])];

// Home page markup. scripts/build.mjs pre-renders this into index.html so the page is
// complete on first paint (no layout shift) and every tool link is crawlable without JavaScript.
function homeHTML() {
  const cats = HOME_ORDER.map(id => CATS.find(c => c.id === id));
  return `<div class="wrap">
    <section class="home-hero">
      <span class="eyebrow">FREE · PRIVATE · NO SIGN-UP</span>
      <h1>Free PDF tools, converters and <em>UK calculators</em></h1>
      <p class="lede">${CATS.reduce((t, c) => t + cards(c.id).length, 0)} fast, simple tools for PDFs, Excel, images, money, writing and code. Everything runs in your browser, so nothing you type leaves your device.</p>
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
}

function showHome(scrollTo) {
  document.title = DEF_TITLE;
  $('meta[name="description"]').content = DEF_DESC;
  if (!$(".home-hero", app)) app.innerHTML = homeHTML();
  const q = $("#q");
  if (!q.dataset.wired) {
    q.dataset.wired = "1";
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
  }
  if (scrollTo) $("#" + scrollTo).scrollIntoView();
}

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const id = location.hash.slice(1);
  // Old #tool links (bookmarks, shared links) move to the tool's own page.
  if (SLUGS[id]) { location.replace(SLUGS[id]); return; }
  showHome(CATS.some(c => c.id === id) ? id : null);
}
// Embedded calculators have no site header or footer.
if ($("#siteName")) $("#siteName").textContent = SITE;
$$(".sn").forEach(s => s.textContent = SITE);
if ($("#yr")) $("#yr").textContent = new Date().getFullYear();
// "Add this calculator to your website": copy the embed code.
document.addEventListener("click", e => { const b = e.target.closest(".embed-copy"); if (b) copy(b.closest(".embed-box").querySelector("textarea").value, b); });
$(".skip-link")?.addEventListener("click", e => { e.preventDefault(); app.focus(); app.scrollIntoView(); });
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

// Header category menus: one open at a time, hover on desktop, Escape and outside clicks close,
// arrow keys move through a menu, and on narrow screens a menu button shows them as an accordion.
const siteMenu = $("#site-menu"), siteHead = $(".site-head"), menuBtn = $(".menu-btn");
if (siteMenu && siteHead) {
  const menus = $$("details.mm", siteMenu);
  const wide = matchMedia("(min-width: 1001px)"), hover = matchMedia("(hover: hover) and (pointer: fine)");
  const closeAll = except => menus.forEach(m => { if (m !== except) m.open = false; });
  const setDrawer = on => {
    siteHead.classList.toggle("menu-open", on);
    menuBtn?.setAttribute("aria-expanded", String(on));
    menuBtn?.setAttribute("aria-label", on ? "Close menu" : "Menu");
    if (!on) closeAll();
  };
  menus.forEach(m => {
    m.addEventListener("toggle", () => { if (m.open) closeAll(m); });
    // Desktop: open on hover, with a short grace period so the pointer can travel to the panel.
    let timer = 0, hoverOpened = 0;
    m.addEventListener("mouseenter", () => {
      if (!wide.matches || !hover.matches) return;
      clearTimeout(timer); timer = setTimeout(() => { if (!m.open) { m.open = true; hoverOpened = Date.now(); } }, 90);
    });
    m.addEventListener("mouseleave", () => {
      if (!wide.matches || !hover.matches) return;
      clearTimeout(timer); timer = setTimeout(() => { m.open = false; }, 220);
    });
    // A click right after hover opened the menu keeps it open instead of toggling it shut.
    $("summary", m).addEventListener("click", e => { if (m.open && Date.now() - hoverOpened < 600) { e.preventDefault(); hoverOpened = 0; } });
  });
  siteMenu.addEventListener("keydown", e => {
    const m = e.target.closest("details.mm");
    if (e.key === "Escape") {
      if (m?.open) { m.open = false; $("summary", m).focus(); e.preventDefault(); }
      else if (siteHead.classList.contains("menu-open")) { setDrawer(false); menuBtn?.focus(); e.preventDefault(); }
      return;
    }
    if (!m || !m.open || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    const items = [$("summary", m), ...$$(".mm-panel a", m)], i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  });
  siteMenu.addEventListener("click", e => { if (e.target.closest(".mm-panel a, .mm-link")) { closeAll(); setDrawer(false); } });
  document.addEventListener("click", e => {
    if (siteMenu.contains(e.target) || menuBtn?.contains(e.target)) return;
    closeAll(); if (siteHead.classList.contains("menu-open")) setDrawer(false);
  });
  menuBtn?.addEventListener("click", () => {
    const on = !siteHead.classList.contains("menu-open");
    setDrawer(on);
    // Open the section for the page you are on, so its tools are one tap away.
    if (on) { const cur = $(".mm.is-current", siteMenu); if (cur) cur.open = true; }
  });
  wide.addEventListener("change", () => setDrawer(false));
}

// Header search on every page: type to find any tool, arrow keys to choose, Enter to open.
const searchBtn = $(".search-btn"), searchBox = $("#site-search");
if (searchBtn && searchBox) {
  const input = $("#site-q", searchBox), list = $("#site-results", searchBox);
  const index = [...TOOLS.map(t => ({name: t.name, desc: t.desc, href: SLUGS[t.id], cat: (CATS.find(c => c.id === t.cat) || {}).name || ""})),
    ...Object.entries(EXTRA_CARDS).flatMap(([cat, xs]) => xs.map(x => ({...x, cat: (CATS.find(c => c.id === cat) || {}).name || ""})))];
  let active = -1, shown = [];
  const render = () => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    shown = terms.length ? index.filter(t => terms.every(w => (t.name + " " + t.desc + " " + t.cat).toLowerCase().includes(w))).slice(0, 8) : [];
    active = shown.length ? 0 : -1;
    list.innerHTML = shown.map((t, i) => `<li role="option" id="site-opt-${i}" aria-selected="${i === active}"><a href="${t.href}"><strong>${esc(t.name)}</strong><span>${esc(t.cat)}</span></a></li>`).join("")
      + (terms.length && !shown.length ? `<li class="none">No tools match. Try a shorter word.</li>` : "");
    input.setAttribute("aria-activedescendant", active >= 0 ? `site-opt-${active}` : "");
  };
  const move = d => { if (!shown.length) return; active = (active + d + shown.length) % shown.length; $$("li[role=option]", list).forEach((li, i) => li.setAttribute("aria-selected", String(i === active))); input.setAttribute("aria-activedescendant", `site-opt-${active}`); };
  const open = () => { searchBox.hidden = false; searchBtn.setAttribute("aria-expanded", "true"); input.focus(); };
  const close = () => { searchBox.hidden = true; searchBtn.setAttribute("aria-expanded", "false"); };
  searchBtn.addEventListener("click", () => {
    const homeQ = $("#q");
    if (homeQ) { homeQ.focus(); homeQ.scrollIntoView({block: "center"}); return; }
    searchBox.hidden ? open() : close();
  });
  input.addEventListener("input", render);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); location.href = shown[active].href; }
    else if (e.key === "Escape") { close(); searchBtn.focus(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !$("#q") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); open(); }
  });
  document.addEventListener("click", e => { if (!searchBox.hidden && !searchBox.contains(e.target) && !searchBtn.contains(e.target)) close(); });
}
