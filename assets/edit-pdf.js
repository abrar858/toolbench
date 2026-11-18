/* ToolsBravo Edit PDF.
   Everything happens in the browser: pdf.js draws the previews and finds the existing text and form fields,
   pdf-lib writes the changes onto the original PDF. Nothing is uploaded or stored.
   Positions are kept in PDF points in each page's displayed (rotated) orientation, as in Sign PDF.

   Tools: edit existing text (cover the line and write the new text in a matching style), add text,
   whiteout, redact (pages with redactions are flattened to images so the content is really gone),
   highlight, box, freehand drawing, images, and filling existing form fields. */
(() => {
const root = document.querySelector('body[data-tool="edit-pdf"] .panel');
if (!root) return;
const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
const LINE = 1.25, BASELINE = 0.88; // text line height and baseline as multiples of font size
const FONTS = {helv: "Helvetica, Arial, sans-serif", times: '"Times New Roman", Times, serif', cour: '"Courier New", Courier, monospace'};
const HIGHLIGHT = "#ffd60a";
const HINTS = {
  select: "Select: click an item to move it, drag its corner to resize, Delete to remove it.",
  edit: "Edit text: click a highlighted line of text to change or remove it.",
  text: "Add text: click where the text should go.",
  whiteout: "Whiteout: drag over anything to cover it. It hides content visually; use Redact for anything confidential.",
  redact: "Redact: drag over confidential content. On download it's permanently removed, not just covered.",
  highlight: "Highlight: drag over text to highlight it.",
  rect: "Box: drag to draw a rectangle outline.",
  draw: "Draw: draw freehand with a mouse, finger or stylus.",
};

const state = {file: null, bytes: null, doc: null, pdfjs: null, pages: [], scale: 1, elements: [], images: new Map(), tool: "select",
  fields: [], fieldValues: new Map(), history: [], future: [], selected: null, dirty: false, renderToken: 0, current: 0};
let uid = 0;
const viewer = q("#ep-viewer"), status = q("#ep-status");
const announce = m => { status.textContent = m; };
const clone = els => els.map(e => ({...e, cover: e.cover && {...e.cover}, points: e.points && e.points.map(p => [...p])}));

/* ---------- history (elements and form values) ---------- */
const snapshot = () => ({els: clone(state.elements), fields: new Map(state.fieldValues)});
function restore(s) { state.elements = s.els; state.fieldValues = s.fields; state.selected = null; drawElements(); drawFields(); syncHistory(); }
function commit(message) {
  state.history.push(snapshot()); if (state.history.length > 150) state.history.shift();
  state.future = []; state.dirty = true; syncHistory(); if (message) announce(message);
}
function syncHistory() { q("#ep-undo").disabled = !state.history.length; q("#ep-redo").disabled = !state.future.length; }
function undo() { if (!state.history.length) return; state.future.push(snapshot()); restore(state.history.pop()); announce("Undone."); }
function redo() { if (!state.future.length) return; state.history.push(snapshot()); restore(state.future.pop()); announce("Redone."); }
const hasChanges = () => state.elements.length > 0 || state.fieldValues.size > 0;

/* ---------- loading ---------- */
async function load(file) {
  const msg = q("#ep-msg");
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return say(msg, `${file.name} isn't a PDF. Choose a .pdf file.`, true);
  if (hasChanges() && state.dirty && !window.confirm?.("Replace the current document? Your changes will be lost.")) return;
  reset(true);
  say(msg, `Opening ${file.name}…`);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {PDFDocument} = await pdfLib();
    try { await PDFDocument.load(bytes.slice()); }
    catch (e) { throw new Error(/encrypt/i.test(e.message) ? `${file.name} is password-protected or has security restrictions, so it can't be edited here. Open it in your PDF reader, save a copy without a password, then try again.` : `${file.name} could not be read as a PDF. It may be damaged.`); }
    state.pdfjs = await pdfJs();
    const doc = await openPdfJs({name: file.name, arrayBuffer: async () => bytes.slice().buffer});
    state.file = file; state.bytes = bytes; state.doc = doc; state.pages = [];
    for (let i = 1; i <= doc.numPages; i++) { const page = await doc.getPage(i), vp = page.getViewport({scale: 1}); state.pages.push({page, vp, w: vp.width, h: vp.height, rendered: 0, lines: null}); }
    await findFields();
    q("#ep-start").hidden = true; q("#ep-work").hidden = false;
    q("#ep-pages").textContent = doc.numPages; q("#ep-pageno").max = doc.numPages;
    q("#ep-file").textContent = `${file.name} · ${fsize(file.size)} · ${plural(doc.numPages, "page")}`;
    q("#ep-forms-bar").hidden = !state.fields.length;
    q("#ep-forms-count").textContent = state.fields.length ? `This PDF has ${plural(state.fields.length, "form field")}. Click a field to fill it in.` : "";
    setTool("select"); fit();
    announce(`Opened ${file.name}. Choose a tool: Edit text changes existing text, Whiteout and Redact remove things.`);
  } catch (e) { reset(true); say(msg, e.message, true); }
}
function reset(keepMessage) {
  state.renderToken++;
  if (state.doc) state.doc.destroy();
  Object.assign(state, {file: null, bytes: null, doc: null, pages: [], elements: [], fields: [], history: [], future: [], selected: null, dirty: false, current: 0});
  state.images.clear(); state.fieldValues = new Map();
  viewer.innerHTML = ""; q("#ep-work").hidden = true; q("#ep-start").hidden = false; syncHistory();
  if (!keepMessage) say(q("#ep-msg"), "Document cleared from this page. Choose another PDF to edit.");
}

/* ---------- form fields (filled with pdf-lib on download) ---------- */
async function findFields() {
  state.fields = [];
  for (const [i, p] of state.pages.entries()) {
    let annots = [];
    try { annots = await p.page.getAnnotations(); } catch { continue; }
    for (const a of annots) {
      if (a.subtype !== "Widget" || !a.fieldName || a.readOnly || a.hidden) continue;
      const kind = a.fieldType === "Tx" ? "text" : a.fieldType === "Ch" ? "choice" : a.fieldType === "Btn" && a.checkBox ? "checkbox" : a.fieldType === "Btn" && a.radioButton ? "radio" : null;
      if (!kind) continue;
      const [x1, y1, x2, y2] = p.vp.convertToViewportRectangle(a.rect);
      state.fields.push({page: i, name: a.fieldName, kind, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
        value: a.fieldValue ?? "", options: (a.options || []).map(o => ({value: o.exportValue ?? o.displayValue, label: o.displayValue ?? o.exportValue})),
        on: a.buttonValue ?? a.exportValue ?? "Yes", multiline: !!a.multiLine, id: a.id});
    }
  }
}
const fieldValue = f => state.fieldValues.has(f.name) ? state.fieldValues.get(f.name)
  : f.kind === "checkbox" ? (f.value && f.value !== "Off") : f.kind === "radio" ? (f.value && f.value !== "Off" ? f.value : "") : (Array.isArray(f.value) ? f.value[0] ?? "" : f.value);
function drawFields() {
  qa(".ep-field").forEach(n => n.remove());
  const s = state.scale;
  state.fields.forEach((f, k) => {
    const layer = pageEl(f.page)?.querySelector(".ep-forms"); if (!layer) return;
    const v = fieldValue(f), label = `Form field ${f.name.split(".").pop()} on page ${f.page + 1}`;
    let n;
    if (f.kind === "checkbox" || f.kind === "radio") {
      n = document.createElement("input"); n.type = f.kind === "checkbox" ? "checkbox" : "radio";
      if (f.kind === "radio") { n.name = "ep-radio-" + f.name; n.value = f.on; n.checked = v === f.on; } else n.checked = !!v;
    } else if (f.kind === "choice") {
      n = document.createElement("select");
      n.innerHTML = `<option value=""></option>` + f.options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
      n.value = v;
    } else { n = document.createElement(f.multiline ? "textarea" : "input"); n.value = v; n.style.fontSize = Math.max(8, Math.min(f.h * 0.7, 14)) * s + "px"; }
    n.className = "ep-field"; n.dataset.k = k; n.setAttribute("aria-label", label);
    Object.assign(n.style, {left: f.x * s + "px", top: f.y * s + "px", width: f.w * s + "px", height: f.h * s + "px"});
    layer.appendChild(n);
  });
}
viewer.addEventListener("change", ev => {
  const n = ev.target.closest(".ep-field"); if (!n) return;
  const f = state.fields[+n.dataset.k]; commit();
  state.fieldValues.set(f.name, f.kind === "checkbox" ? n.checked : f.kind === "radio" ? (n.checked ? f.on : "") : n.value);
  if (f.kind === "radio") drawFields();
  announce(`Filled in ${f.name.split(".").pop()}.`);
});

/* ---------- pages ---------- */
let observer = null;
function layoutPages() {
  observer?.disconnect();
  viewer.innerHTML = "";
  const token = ++state.renderToken;
  observer = new IntersectionObserver(entries => { for (const en of entries) if (en.isIntersecting) renderPage(+en.target.dataset.page, token); }, {threshold: [0, .25]});
  state.pages.forEach((p, i) => {
    const wrap = document.createElement("div");
    wrap.className = "sg-page ep-page"; wrap.dataset.page = i; wrap.style.width = p.w * state.scale + "px"; wrap.style.height = p.h * state.scale + "px";
    wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", `Page ${i + 1} of ${state.pages.length}`);
    wrap.innerHTML = `<canvas aria-hidden="true"></canvas><div class="ep-lines"></div><div class="sg-layer"></div><div class="ep-forms"></div><span class="sg-num" aria-hidden="true">${i + 1}</span>`;
    viewer.appendChild(wrap); observer.observe(wrap); p.rendered = 0;
  });
  q("#ep-zoom").textContent = Math.round(state.scale * 100) + "%";
  drawElements(); drawFields();
}
async function renderPage(i, token) {
  const p = state.pages[i]; if (!p || p.rendered === state.scale) return;
  p.rendered = state.scale;
  const wrap = pageEl(i); if (!wrap) return;
  const canvas = wrap.querySelector("canvas"), dpr = Math.min(window.devicePixelRatio || 1, 2), vp = p.page.getViewport({scale: state.scale * dpr});
  const c = document.createElement("canvas"); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  // Form fields are shown as inputs on top, so their own appearance isn't painted underneath.
  const opts = {canvasContext: x, viewport: vp, annotationMode: state.fields.length ? state.pdfjs.AnnotationMode.ENABLE_FORMS : state.pdfjs.AnnotationMode.ENABLE};
  try { await p.page.render(opts).promise; } catch { p.rendered = 0; return; }
  if (token !== state.renderToken) return;
  canvas.width = c.width; canvas.height = c.height; canvas.getContext("2d").drawImage(c, 0, 0); wrap.classList.add("rendered");
  if (state.tool === "edit") showLines(i);
}
let navLockUntil = 0;
function trackCurrent() {
  if (performance.now() < navLockUntil || !state.pages.length) return;
  const v = viewer.getBoundingClientRect(), probe = v.top + Math.min(v.height * 0.3, 200);
  let best = 0;
  for (const w of viewer.querySelectorAll(".sg-page")) { const r = w.getBoundingClientRect(); if (r.top <= probe) best = +w.dataset.page; else break; }
  state.current = best; q("#ep-pageno").value = best + 1;
}
let scrollRaf = 0;
viewer.addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; trackCurrent(); }); });
["wheel", "touchstart", "keydown"].forEach(t => viewer.addEventListener(t, () => { navLockUntil = 0; }, {passive: true}));
function goToPage(i) {
  i = Math.min(state.pages.length - 1, Math.max(0, i));
  state.current = i; q("#ep-pageno").value = i + 1; navLockUntil = performance.now() + 1500;
  const w = pageEl(i); if (w) viewer.scrollTop += w.getBoundingClientRect().top - viewer.getBoundingClientRect().top - 12;
}
function setScale(s, keepPage = true) { const page = state.current; state.scale = Math.min(4, Math.max(0.25, s)); layoutPages(); if (keepPage) goToPage(page); }
function fit() { const avail = Math.max(240, viewer.clientWidth - 24), widest = Math.max(...state.pages.map(p => p.w)); setScale(Math.min(1.5, avail / widest), false); }
const pageEl = i => viewer.querySelector(`.sg-page[data-page="${i}"]`);

/* ---------- existing text: find lines with pdf.js and match their style ---------- */
async function textLines(i) {
  const p = state.pages[i]; if (p.lines) return p.lines;
  const {Util} = state.pdfjs, tc = await p.page.getTextContent(), items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = Util.transform(p.vp.transform, it.transform), fh = Math.hypot(t[2], t[3]);
    if (Math.abs(t[1]) > 0.01 * fh || Math.abs(t[2]) > 0.01 * fh || fh < 2) continue; // only text running left to right on screen
    const style = tc.styles[it.fontName] || {}, w = it.width * Math.abs(t[0]) / Math.hypot(it.transform[0], it.transform[1]) || it.width;
    let bold = false;
    try { if (p.page.commonObjs.has(it.fontName)) bold = /bold|black|heavy|semibold|demi/i.test(p.page.commonObjs.get(it.fontName)?.name || ""); } catch {}
    const fam = /mono/i.test(style.fontFamily || "") ? "cour" : /^serif$/i.test(style.fontFamily || "") ? "times" : "helv";
    items.push({str: it.str, x: t[4], base: t[5], size: fh, w, font: fam, bold});
  }
  // Join pieces on the same baseline that sit close together into one line.
  items.sort((a, b) => a.base - b.base || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const l = lines.find(l => Math.abs(l.base - it.base) < l.size * 0.3 && Math.abs(l.size - it.size) < l.size * 0.25 && it.x - (l.x + l.w) < l.size * 1.2 && it.x > l.x - 1);
    if (l) { const gap = it.x - (l.x + l.w); l.str += (gap > l.size * 0.15 && !/\s$/.test(l.str) && !/^\s/.test(it.str) ? " " : "") + it.str; l.w = Math.max(l.w, it.x + it.w - l.x); }
    else lines.push({...it});
  }
  return (p.lines = lines.map(l => ({...l, str: l.str.replace(/\s+/g, " ").trim()})).filter(l => l.str));
}
async function showLines(i) {
  const wrap = pageEl(i); if (!wrap) return;
  const layer = wrap.querySelector(".ep-lines"), lines = await textLines(i), s = state.scale;
  if (state.tool !== "edit") return;
  layer.innerHTML = lines.map((l, k) => `<button type="button" class="ep-line" data-k="${k}" style="left:${(l.x - 1) * s}px;top:${(l.base - l.size) * s}px;width:${(l.w + 2) * s}px;height:${l.size * 1.2 * s}px" aria-label="Edit text: ${esc(l.str)}"></button>`).join("");
}
function hideLines() { qa(".ep-lines").forEach(l => { l.innerHTML = ""; }); }
// Samples the rendered page: the most common light colour around the line (background) and the darkest ink inside it.
function sampleColours(i, box) {
  const wrap = pageEl(i), c = wrap?.querySelector("canvas"), p = state.pages[i];
  if (!c || !c.width) return {bg: "#ffffff", ink: "#111827"};
  const k = c.width / p.w, x = c.getContext("2d", {willReadFrequently: true});
  const rx = Math.max(0, Math.floor(box.x * k)), ry = Math.max(0, Math.floor(box.y * k)), rw = Math.max(1, Math.min(c.width - rx, Math.ceil(box.w * k))), rh = Math.max(1, Math.min(c.height - ry, Math.ceil(box.h * k)));
  const d = x.getImageData(rx, ry, rw, rh).data, counts = new Map(), dark = [];
  for (let j = 0; j < d.length; j += 4) {
    const key = (d[j] >> 3) << 10 | (d[j + 1] >> 3) << 5 | d[j + 2] >> 3; counts.set(key, (counts.get(key) || 0) + 1);
    dark.push([d[j] + d[j + 1] + d[j + 2], d[j], d[j + 1], d[j + 2]]);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bg = [(top >> 10 & 31) * 8 + 4, (top >> 5 & 31) * 8 + 4, (top & 31) * 8 + 4].map(v => Math.min(255, v));
  dark.sort((a, b) => a[0] - b[0]); const darkest = dark.slice(0, Math.max(1, Math.floor(dark.length * 0.08)));
  const ink = [1, 2, 3].map(n => Math.round(darkest.reduce((t, v) => t + v[n], 0) / darkest.length));
  const hex = rgb => "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");
  const lum = rgb => rgb[0] + rgb[1] + rgb[2];
  return {bg: lum(bg) > 600 ? "#ffffff" : hex(bg), ink: lum(bg) - lum(ink) < 120 ? "#111827" : hex(ink)};
}

/* ---------- elements ---------- */
const NAMES = {text: "Text", whiteout: "Whiteout", redact: "Redaction", highlight: "Highlight", rect: "Box", draw: "Drawing", image: "Image"};
const kindOf = e => e.type === "box" ? e.mode : e.type;
const elementLabel = e => `${e.cover ? "Edited text" : NAMES[kindOf(e)]} on page ${e.page + 1}`;
function textSize(text, size, font, bold) {
  const c = document.createElement("canvas").getContext("2d"); c.font = `${bold ? "bold " : ""}${size}px ${FONTS[font]}`;
  const lines = text.split("\n");
  return {w: Math.max(size, ...lines.map(l => c.measureText(l).width)) + 6, h: size * LINE * lines.length};
}
function drawElements() {
  qa(".sg-el, .ep-cover").forEach(n => n.remove());
  const s = state.scale;
  for (const e of state.elements) {
    const layer = pageEl(e.page)?.querySelector(".sg-layer"); if (!layer) continue;
    if (e.cover) {
      const c = document.createElement("div"); c.className = "ep-cover"; c.style.background = e.cover.color;
      Object.assign(c.style, {left: e.cover.x * s + "px", top: e.cover.y * s + "px", width: e.cover.w * s + "px", height: e.cover.h * s + "px"});
      layer.appendChild(c);
    }
    const n = document.createElement("div"), kind = kindOf(e);
    n.className = `sg-el ep-${kind}` + (e.id === state.selected ? " selected" : "");
    n.dataset.id = e.id; n.dataset.page = e.page; n.dataset.kind = kind; Object.assign(n.dataset, {x: e.x.toFixed(2), y: e.y.toFixed(2), w: e.w.toFixed(2), h: e.h.toFixed(2)});
    n.tabIndex = 0; n.setAttribute("role", "group");
    n.setAttribute("aria-label", `${elementLabel(e)}. Arrow keys move it, plus and minus resize it, Delete removes it${e.type === "text" ? ", Enter edits it" : ""}.`);
    Object.assign(n.style, {left: e.x * s + "px", top: e.y * s + "px", width: e.w * s + "px", height: e.h * s + "px"});
    let inner = "";
    if (e.type === "text") inner = `<span style="font:${e.bold ? "bold " : ""}${e.size * s}px/${LINE} ${FONTS[e.font]};color:${e.color}">${esc(e.text)}</span>`;
    else if (e.type === "image") inner = `<img src="${state.images.get(e.src)}" alt="" draggable="false">`;
    else if (e.type === "draw") inner = `<svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polyline points="${e.points.map(p => p.join(",")).join(" ")}" fill="none" stroke="${e.color}" stroke-width="${e.width * s}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
    else if (e.mode === "whiteout") n.style.background = e.color;
    else if (e.mode === "highlight") n.style.background = HIGHLIGHT + "66";
    else if (e.mode === "rect") n.style.outline = `${e.width * s}px solid ${e.color}`;
    n.innerHTML = inner + `<button type="button" class="sg-del" aria-label="Remove ${elementLabel(e)}" tabindex="-1">×</button><span class="sg-handle" aria-hidden="true"></span>`;
    layer.appendChild(n);
  }
}
function place(e, at) {
  const p = state.pages[e.page];
  if (at) { e.x = at.x; e.y = at.y; } else { e.x = Math.max(0, (p.w - e.w) / 2); e.y = Math.min(p.h - e.h, Math.max(0, p.h * 0.4 - e.h / 2)); }
  e.id = "el" + ++uid; clamp(e);
  commit(); state.elements.push(e); state.selected = e.id; drawElements();
  root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus({preventScroll: true});
  announce(`${elementLabel(e)} added.`);
}
const byId = id => state.elements.find(e => e.id === id);
function clamp(e) { const p = state.pages[e.page]; e.w = Math.min(e.w, p.w); e.h = Math.min(e.h, p.h); e.x = Math.min(Math.max(0, e.x), p.w - e.w); e.y = Math.min(Math.max(0, e.y), p.h - e.h); }
function resizeBy(e, factor) {
  if (e.type === "text") { e.size = Math.max(4, Math.min(96, e.size * factor)); Object.assign(e, textSize(e.text, e.size, e.font, e.bold)); }
  else if (e.type === "image") { const r = e.h / e.w; e.w = Math.max(8, e.w * factor); e.h = e.w * r; }
  else { e.w = Math.max(4, e.w * factor); e.h = Math.max(4, e.h * factor); }
  clamp(e);
}
function removeEl(e) { commit(); state.elements = state.elements.filter(x => x !== e); state.selected = null; drawElements(); announce(`${elementLabel(e)} removed.`); }

/* ---------- tools ---------- */
function setTool(t) {
  state.tool = t;
  qa("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  viewer.dataset.tool = t; q("#ep-hint").textContent = HINTS[t] || "";
  root.classList.toggle("ep-text-props", ["text", "edit", "select"].includes(t));
  root.classList.toggle("ep-line-props", ["rect", "draw", "select"].includes(t));
  if (t === "edit") state.pages.forEach((p, i) => { if (pageEl(i)?.classList.contains("rendered")) showLines(i); }); else hideLines();
  if (t === "whiteout") q("#ep-color").value = "#ffffff"; else if (q("#ep-color").value === "#ffffff" && t !== "select") q("#ep-color").value = "#111827";
}
root.querySelector(".ep-tools").addEventListener("click", ev => { const b = ev.target.closest("[data-tool]"); if (b && state.doc) setTool(b.dataset.tool); });
// Style controls change the selected item, and are the defaults for new ones.
function styleSelected() {
  const e = byId(state.selected); if (!e) return;
  commit();
  const color = q("#ep-color").value, font = q("#ep-font").value, size = +q("#ep-size").value, bold = q("#ep-bold").checked, width = +q("#ep-width").value;
  if (e.type === "text") { Object.assign(e, {color, font, size, bold}, textSize(e.text, size, font, bold)); clamp(e); }
  else if (e.type === "draw" || e.mode === "rect") Object.assign(e, {color, width});
  else if (e.mode === "whiteout") e.color = color;
  drawElements(); root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus({preventScroll: true});
}
["#ep-color", "#ep-font", "#ep-size", "#ep-bold", "#ep-width"].forEach(id => q(id).addEventListener("change", styleSelected));
function showStyle(e) {
  if (!e) return;
  if (e.color) q("#ep-color").value = e.color;
  if (e.type === "text") { q("#ep-font").value = e.font; q("#ep-bold").checked = e.bold; const sz = q("#ep-size"); if (![...sz.options].some(o => +o.value === Math.round(e.size))) sz.add(new Option(Math.round(e.size), Math.round(e.size))); sz.value = String(Math.round(e.size)); }
  if (e.width) q("#ep-width").value = String(e.width);
}

/* ---------- pointer: select/move/resize, drag to create boxes, draw, click to add text ---------- */
let drag = null, make = null;
const pagePoint = (wrap, ev) => { const r = wrap.getBoundingClientRect(); return {x: (ev.clientX - r.left) / state.scale, y: (ev.clientY - r.top) / state.scale}; };
viewer.addEventListener("pointerdown", ev => {
  if (ev.target.closest(".ep-field") || ev.button > 0) return;
  const wrap = ev.target.closest(".sg-page"), n = ev.target.closest(".sg-el"), t = state.tool;
  if (ev.target.closest(".ep-line")) return; // handled on click
  if (n && t !== "draw") {
    const e = byId(n.dataset.id); if (!e) return;
    if (ev.target.closest(".sg-del")) return removeEl(e);
    ev.preventDefault(); try { n.setPointerCapture(ev.pointerId); } catch {}
    if (state.selected !== e.id) { state.selected = e.id; qa(".sg-el.selected").forEach(x => x.classList.remove("selected")); n.classList.add("selected"); showStyle(e); }
    drag = {e, n, before: snapshot(), mode: ev.target.closest(".sg-handle") ? "resize" : "move", sx: ev.clientX, sy: ev.clientY, x: e.x, y: e.y, w: e.w, h: e.h, size: e.size, moved: false};
    return;
  }
  if (!wrap) return;
  if (state.selected) { state.selected = null; qa(".sg-el.selected").forEach(x => x.classList.remove("selected")); }
  const page = +wrap.dataset.page, pt = pagePoint(wrap, ev);
  if (t === "text") { ev.preventDefault(); openText({page, at: pt}); return; }
  if (!["whiteout", "redact", "highlight", "rect", "draw"].includes(t)) return;
  ev.preventDefault(); try { wrap.setPointerCapture(ev.pointerId); } catch {}
  const preview = document.createElement(t === "draw" ? "div" : "div");
  preview.className = `ep-preview ep-${t}`; wrap.querySelector(".sg-layer").appendChild(preview);
  if (t === "draw") {
    preview.innerHTML = `<svg width="100%" height="100%" aria-hidden="true"><polyline fill="none" stroke="${q("#ep-color").value}" stroke-width="${+q("#ep-width").value * state.scale}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    Object.assign(preview.style, {left: 0, top: 0, width: "100%", height: "100%"});
  }
  make = {t, wrap, page, start: pt, points: [[pt.x, pt.y]], preview};
});
viewer.addEventListener("pointermove", ev => {
  if (make) {
    const pt = pagePoint(make.wrap, ev), p = state.pages[make.page];
    pt.x = Math.min(Math.max(0, pt.x), p.w); pt.y = Math.min(Math.max(0, pt.y), p.h);
    const s = state.scale;
    if (make.t === "draw") {
      for (const c of ev.getCoalescedEvents?.() || [ev]) { const cp = pagePoint(make.wrap, c); make.points.push([Math.min(Math.max(0, cp.x), p.w), Math.min(Math.max(0, cp.y), p.h)]); }
      make.preview.querySelector("polyline").setAttribute("points", make.points.map(([x, y]) => `${x * s},${y * s}`).join(" "));
    } else {
      const x = Math.min(pt.x, make.start.x), y = Math.min(pt.y, make.start.y);
      Object.assign(make.preview.style, {left: x * s + "px", top: y * s + "px", width: Math.abs(pt.x - make.start.x) * s + "px", height: Math.abs(pt.y - make.start.y) * s + "px"});
      make.end = pt;
    }
    return;
  }
  if (!drag) return;
  const s = state.scale, dx = (ev.clientX - drag.sx) / s, dy = (ev.clientY - drag.sy) / s, {e, n} = drag;
  if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
  if (drag.mode === "move") {
    const v = viewer.getBoundingClientRect(), edge = 48, step = ev.clientY < v.top + edge ? -14 : ev.clientY > v.bottom - edge ? 14 : 0;
    if (step) { viewer.scrollTop += step; drag.sy -= step; }
    e.x = drag.x + dx; e.y = drag.y + dy; n.style.left = e.x * s + "px"; n.style.top = e.y * s + "px"; n.classList.add("dragging");
  } else if (e.type === "text") {
    const nw = Math.max(12, drag.w + dx);
    e.size = Math.max(4, Math.min(96, drag.size * nw / drag.w)); Object.assign(e, textSize(e.text, e.size, e.font, e.bold));
    n.querySelector("span").style.fontSize = e.size * s + "px"; n.style.width = e.w * s + "px"; n.style.height = e.h * s + "px";
  } else {
    e.w = Math.max(4, drag.w + dx); e.h = e.type === "image" ? e.w * drag.h / drag.w : Math.max(4, drag.h + dy);
    n.style.width = e.w * s + "px"; n.style.height = e.h * s + "px";
  }
});
function finishMake() {
  const m = make; make = null; m.preview.remove();
  const color = q("#ep-color").value, width = +q("#ep-width").value;
  if (m.t === "draw") {
    if (m.points.length < 2) return;
    const pad = width / 2 + 1, xs = m.points.map(p => p[0]), ys = m.points.map(p => p[1]);
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) + pad - x, h = Math.max(...ys) + pad - y;
    const pts = m.points.map(([px, py]) => [+((px - x) / w).toFixed(4), +((py - y) / h).toFixed(4)]);
    place({type: "draw", page: m.page, points: pts, color, width, w, h}, {x, y});
    return;
  }
  if (!m.end) return;
  const x = Math.min(m.start.x, m.end.x), y = Math.min(m.start.y, m.end.y), w = Math.abs(m.end.x - m.start.x), h = Math.abs(m.end.y - m.start.y);
  if (w < 3 || h < 3) return announce("Drag to draw the area, rather than just clicking.");
  place({type: "box", mode: m.t, page: m.page, color: m.t === "whiteout" ? color : m.t === "rect" ? color : undefined, width, w, h}, {x, y});
}
const endDrag = ev => {
  if (make) return finishMake();
  if (!drag) return;
  const {e, n, before, moved} = drag; drag = null; n.classList.remove("dragging");
  if (!moved) return;
  if (ev && e.type !== "text" || ev && !e.cover) {
    // Dropped over another page? Move it there (edited lines stay with their page).
    n.style.pointerEvents = "none";
    const target = !e.cover && document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList?.contains("sg-page"));
    n.style.pointerEvents = "";
    if (target && +target.dataset.page !== e.page) { const r = target.getBoundingClientRect(), s = state.scale; e.page = +target.dataset.page; e.x = (ev.clientX - r.left) / s - e.w / 2; e.y = (ev.clientY - r.top) / s - e.h / 2; }
  }
  clamp(e);
  state.history.push(before); state.future = []; state.dirty = true; syncHistory();
  drawElements(); root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus({preventScroll: true});
  announce(`${elementLabel(e)} placed.`);
};
viewer.addEventListener("pointerup", endDrag);
viewer.addEventListener("pointercancel", () => {
  if (make) { make.preview.remove(); make = null; }
  if (drag) { restore(drag.before); state.history.length && syncHistory(); drag = null; }
});
viewer.addEventListener("click", async ev => {
  const b = ev.target.closest(".ep-line"); if (!b) return;
  const page = +b.closest(".sg-page").dataset.page, line = (await textLines(page))[+b.dataset.k];
  openText({page, line});
});
viewer.addEventListener("dblclick", ev => { const n = ev.target.closest(".sg-el.ep-text"); if (n) openText({edit: byId(n.dataset.id)}); });
viewer.addEventListener("focusin", ev => { const n = ev.target.closest(".sg-el"); if (n && state.selected !== n.dataset.id) { state.selected = n.dataset.id; qa(".sg-el.selected").forEach(x => x.classList.remove("selected")); n.classList.add("selected"); showStyle(byId(n.dataset.id)); } });
viewer.addEventListener("keydown", ev => {
  const n = ev.target.closest(".sg-el"); if (!n) return;
  const e = byId(n.dataset.id); if (!e) return;
  const step = ev.shiftKey ? 10 : 2, moves = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]};
  const refocus = () => root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus();
  if (moves[ev.key]) { ev.preventDefault(); commit(); e.x += moves[ev.key][0]; e.y += moves[ev.key][1]; clamp(e); drawElements(); refocus(); }
  else if (ev.key === "+" || ev.key === "=" || ev.key === "-") { ev.preventDefault(); commit(); resizeBy(e, ev.key === "-" ? 1 / 1.1 : 1.1); drawElements(); refocus(); }
  else if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); removeEl(e); viewer.focus(); }
  else if (ev.key === "Enter" && e.type === "text") { ev.preventDefault(); openText({edit: e}); }
});

/* ---------- text dialog: add, edit, or replace an existing line ---------- */
const tdlg = q("#ep-tdialog");
let pending = null;
function openText(opts) {
  pending = opts; const {edit, line, page} = opts;
  const style = edit || (line ? {text: line.str, font: line.font, size: +line.size.toFixed(1), bold: line.bold} : {text: "", font: q("#ep-font").value, size: +q("#ep-size").value, bold: q("#ep-bold").checked});
  let color = edit?.color || q("#ep-color").value;
  if (line) { const box = {x: line.x - 1, y: line.base - line.size * 1.02, w: line.w + 2, h: line.size * 1.3}; const c = sampleColours(page, box); color = c.ink; pending.cover = {...box, color: c.bg}; q("#ep-cover-color").value = c.bg; }
  if (color === "#ffffff") color = "#111827";
  q("#ep-ttitle").textContent = edit ? "Edit text" : line ? "Change this text" : "Add text";
  q("#ep-t-in").value = style.text; q("#ep-t-font").value = style.font; q("#ep-t-size").value = style.size; q("#ep-t-bold").checked = !!style.bold; q("#ep-t-color").value = color;
  q("#ep-cover-row").hidden = !line && !edit?.cover; if (edit?.cover) q("#ep-cover-color").value = edit.cover.color;
  q("#ep-t-remove").hidden = !line; q("#ep-t-ok").textContent = edit ? "Save" : line ? "Replace text" : "Add to page"; q("#ep-terr").textContent = "";
  tdlg.showModal(); q("#ep-t-in").focus(); q("#ep-t-in").select();
}
q("#ep-t-ok").onclick = () => {
  const text = q("#ep-t-in").value.replace(/\s+$/g, ""), font = q("#ep-t-font").value, size = Math.max(4, Math.min(96, +q("#ep-t-size").value || 12)), bold = q("#ep-t-bold").checked, color = q("#ep-t-color").value;
  const p = pending;
  if (!text.trim() && !p.line) { q("#ep-terr").textContent = "Type the text first."; return; }
  tdlg.close();
  if (p.edit) {
    commit(); Object.assign(p.edit, {text, font, size, bold, color}, textSize(text, size, font, bold));
    if (p.edit.cover) p.edit.cover.color = q("#ep-cover-color").value;
    clamp(p.edit); drawElements(); announce("Text updated."); root.querySelector(`.sg-el[data-id="${p.edit.id}"]`)?.focus(); return;
  }
  if (p.line) {
    const l = p.line, cover = {...p.cover, color: q("#ep-cover-color").value};
    if (!text.trim()) return place({type: "box", mode: "whiteout", page: p.page, color: cover.color, w: cover.w, h: cover.h}, {x: cover.x, y: cover.y});
    // Keep the new text on the original baseline and left edge.
    return place({type: "text", page: p.page, text, font, size, bold, color, cover, ...textSize(text, size, font, bold)}, {x: l.x - 1, y: l.base - size * BASELINE});
  }
  place({type: "text", page: p.page ?? state.current, text, font, size, bold, color, ...textSize(text, size, font, bold)}, p.at ? {x: p.at.x, y: p.at.y - size * BASELINE} : null);
};
q("#ep-t-remove").onclick = () => { q("#ep-t-in").value = ""; q("#ep-t-ok").click(); };
q("#ep-t-cancel").onclick = () => { tdlg.close(); pending = null; };
q("#ep-t-in").addEventListener("keydown", ev => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); q("#ep-t-ok").click(); } });

/* ---------- images ---------- */
q("#ep-image-btn").onclick = () => state.doc && q("#ep-image-in").click();
q("#ep-image-in").addEventListener("change", async () => {
  const f = q("#ep-image-in").files[0]; q("#ep-image-in").value = ""; if (!f) return;
  try {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const id = "img" + ++uid; state.images.set(id, c.toDataURL("image/png"));
    const w = Math.min(200, state.pages[state.current].w * 0.5);
    place({type: "image", page: state.current, src: id, w, h: w * c.height / c.width});
  } catch { announce(`${f.name} couldn't be opened as an image. Use a PNG or JPG.`); }
});

/* ---------- toolbar ---------- */
q("#ep-undo").onclick = undo; q("#ep-redo").onclick = redo;
q("#ep-zoom-in").onclick = () => setScale(state.scale * 1.25);
q("#ep-zoom-out").onclick = () => setScale(state.scale / 1.25);
q("#ep-fit").onclick = fit;
q("#ep-pageno").addEventListener("change", () => goToPage((+q("#ep-pageno").value || 1) - 1));
q("#ep-reset").onclick = () => { if (hasChanges() && state.dirty) { q("#ep-reset-confirm").showModal(); return; } reset(); };
q("#ep-reset-yes").onclick = () => { q("#ep-reset-confirm").close(); reset(); };
q("#ep-reset-no").onclick = () => q("#ep-reset-confirm").close();
document.addEventListener("keydown", ev => {
  if (q("#ep-work").hidden || document.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
  else if (ev.key === "Escape") setTool("select");
});
window.addEventListener("beforeunload", ev => { if (state.dirty && hasChanges()) { ev.preventDefault(); ev.returnValue = ""; } });

/* ---------- export ---------- */
q("#ep-download").onclick = () => {
  if (!hasChanges()) { announce("Make a change first: choose a tool such as Edit text or Whiteout."); return; }
  const n = state.elements.length, f = state.fieldValues.size, red = state.elements.filter(e => e.mode === "redact");
  q("#ep-summary").textContent = [n && plural(n, "change"), f && plural(f, "form answer")].filter(Boolean).join(" and ") + (red.length ? `, including ${plural(red.length, "redaction")} on page${new Set(red.map(e => e.page)).size > 1 ? "s" : ""} ${[...new Set(red.map(e => e.page + 1))].sort((a, b) => a - b).join(", ")}.` : ".");
  q("#ep-redact-note").hidden = !red.length;
  q("#ep-confirm").showModal();
};
q("#ep-confirm-yes").onclick = () => { q("#ep-confirm").close(); exportPdf(); };
q("#ep-confirm-no").onclick = () => q("#ep-confirm").close();
const dataUrlBytes = u => Uint8Array.from(atob(u.slice(u.indexOf(",") + 1)), c => c.charCodeAt(0));
const hexRgb = (h, rgb) => { const c = h.match(/\w\w/g).map(v => parseInt(v, 16) / 255); return rgb(c[0], c[1], c[2]); };
// See Sign PDF: keeps files that were edited before (generation numbers > 0) readable in Acrobat.
function normaliseGenerations(pdf, {PDFRef, PDFDict, PDFArray, PDFStream}) {
  const ctx = pdf.context, remap = new Map();
  for (const [ref] of ctx.enumerateIndirectObjects()) if (ref.generationNumber !== 0) remap.set(ref, ctx.nextRef());
  if (!remap.size) return;
  for (const [from, to] of remap) { ctx.assign(to, ctx.lookup(from)); ctx.delete(from); }
  const fix = v => (v instanceof PDFRef && remap.get(v)) || v;
  const walk = o => {
    if (o instanceof PDFStream) o = o.dict;
    if (o instanceof PDFDict) { for (const [k, v] of o.entries()) { const n = fix(v); n !== v ? o.set(k, n) : walk(v); } }
    else if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) { const v = o.get(i), n = fix(v); n !== v ? o.set(i, n) : walk(v); } }
  };
  for (const [, obj] of ctx.enumerateIndirectObjects()) walk(obj);
  for (const k of ["Root", "Info", "Encrypt"]) if (ctx.trailerInfo[k]) ctx.trailerInfo[k] = fix(ctx.trailerInfo[k]);
}
// Rasterises a drawing or a non-Latin text item, for drawing as an image.
function elementCanvas(e, k = 4) {
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(e.w * k)); c.height = Math.max(1, Math.ceil(e.h * k));
  const g = c.getContext("2d");
  if (e.type === "draw") {
    g.strokeStyle = e.color; g.lineWidth = e.width * k; g.lineCap = g.lineJoin = "round"; g.beginPath();
    e.points.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x * c.width, y * c.height)); g.stroke();
  } else {
    g.font = `${e.bold ? "bold " : ""}${e.size * k}px ${FONTS[e.font]}`; g.fillStyle = e.color; g.textBaseline = "alphabetic";
    e.text.split("\n").forEach((l, i) => g.fillText(l, k, (e.size * BASELINE + i * e.size * LINE) * k));
  }
  return c;
}
// Paints every change for one page onto a canvas that already shows the page (used for redacted pages).
function paintPage(g, i, k) {
  for (const e of state.elements.filter(e => e.page === i)) {
    if (e.cover) { g.fillStyle = e.cover.color; g.fillRect(e.cover.x * k, e.cover.y * k, e.cover.w * k, e.cover.h * k); }
    if (e.type === "image") { const img = state.images.get(e.src + ":bitmap"); if (img) g.drawImage(img, e.x * k, e.y * k, e.w * k, e.h * k); }
    else if (e.type === "text" || e.type === "draw") g.drawImage(elementCanvas(e, k), e.x * k, e.y * k);
    else if (e.mode === "whiteout") { g.fillStyle = e.color; g.fillRect(e.x * k, e.y * k, e.w * k, e.h * k); }
    else if (e.mode === "highlight") { g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = HIGHLIGHT; g.globalAlpha = 0.4; g.fillRect(e.x * k, e.y * k, e.w * k, e.h * k); g.restore(); }
    else if (e.mode === "rect") { g.strokeStyle = e.color; g.lineWidth = e.width * k; g.strokeRect(e.x * k, e.y * k, e.w * k, e.h * k); }
  }
  // Redactions last, so nothing can be drawn over them.
  g.fillStyle = "#000"; for (const e of state.elements.filter(e => e.page === i && e.mode === "redact")) g.fillRect(e.x * k, e.y * k, e.w * k, e.h * k);
}
async function exportPdf() {
  const btn = q("#ep-download"); busy(btn, true, "Saving…");
  try {
    const lib = await pdfLib(), {PDFDocument, StandardFonts, rgb, degrees, PDFDict, PDFName, BlendMode} = lib;
    let pdf = await PDFDocument.load(state.bytes.slice());
    normaliseGenerations(pdf, lib);
    const pages = pdf.getPages();
    if (pages.length !== state.pages.length) throw new Error("The document couldn't be read consistently. Nothing was downloaded.");
    const redacted = new Set(state.elements.filter(e => e.mode === "redact").map(e => e.page));

    // 1. Form answers.
    if (state.fieldValues.size || (redacted.size && state.fields.length)) {
      const form = pdf.getForm();
      for (const [name, v] of state.fieldValues) {
        const f = state.fields.find(x => x.name === name); let field;
        try { field = form.getField(name); } catch { continue; }
        try {
          if (f.kind === "text") field.setText(String(v));
          else if (f.kind === "checkbox") v ? field.check() : field.uncheck();
          else if (f.kind === "radio") v ? field.select(v) : field.clear();
          else if (f.kind === "choice") v ? field.select(v) : field.clear();
        } catch (e) { throw new Error(`The answer for “${name.split(".").pop()}” couldn't be written${/WinAnsi/.test(e.message) ? " because it uses characters the form's font can't show" : ""}. Nothing was downloaded.`); }
      }
      // Redacted pages are rebuilt as images, so the form is flattened to keep answers and fields consistent.
      if (q("#ep-flatten").checked || redacted.size) form.flatten();
    }

    // 2. Changes on pages without redactions are written as real PDF content (text stays text).
    const fonts = {}, font = async (f, b) => fonts[f + b] ||= await pdf.embedFont(StandardFonts[{helv: b ? "HelveticaBold" : "Helvetica", times: b ? "TimesRomanBold" : "TimesRoman", cour: b ? "CourierBold" : "Courier"}[f]]);
    const embedded = new Map();
    const embedCanvas = async c => pdf.embedPng(dataUrlBytes(c.toDataURL("image/png")));
    for (const e of state.elements) {
      if (redacted.has(e.page)) continue;
      const page = pages[e.page], vp = state.pages[e.page].vp, rot = degrees(((vp.rotation % 360) + 360) % 360);
      const rect = (r, opts) => { const [x, y] = vp.convertToPdfPoint(r.x, r.y + r.h); page.drawRectangle({x, y, width: r.w, height: r.h, rotate: rot, ...opts}); };
      if (e.cover) rect(e.cover, {color: hexRgb(e.cover.color, rgb)});
      if (e.type === "text") {
        const fnt = await font(e.font, e.bold), lines = e.text.split("\n");
        try {
          lines.forEach(l => fnt.encodeText(l));
          lines.forEach((l, k) => { const [x, y] = vp.convertToPdfPoint(e.x + 1, e.y + e.size * BASELINE + k * e.size * LINE); page.drawText(l, {x, y, size: e.size, font: fnt, color: hexRgb(e.color, rgb), rotate: rot}); });
        } catch { const [x, y] = vp.convertToPdfPoint(e.x, e.y + e.h); page.drawImage(await embedCanvas(elementCanvas(e)), {x, y, width: e.w, height: e.h, rotate: rot}); }
      } else if (e.type === "image" || e.type === "draw") {
        let img = e.type === "image" ? embedded.get(e.src) : null;
        if (!img) { img = e.type === "image" ? await pdf.embedPng(dataUrlBytes(state.images.get(e.src))) : await embedCanvas(elementCanvas(e)); if (e.type === "image") embedded.set(e.src, img); }
        const [x, y] = vp.convertToPdfPoint(e.x, e.y + e.h); page.drawImage(img, {x, y, width: e.w, height: e.h, rotate: rot});
      } else if (e.mode === "whiteout") rect(e, {color: hexRgb(e.color, rgb)});
      else if (e.mode === "highlight") rect(e, {color: hexRgb(HIGHLIGHT, rgb), opacity: 0.4, blendMode: BlendMode.Multiply});
      else if (e.mode === "rect") rect(e, {borderColor: hexRgb(e.color, rgb), borderWidth: e.width});
    }

    // 3. Redaction: each affected page is redrawn as an image with the black boxes burned in, its old
    //    content and annotations are dropped, and the document is rebuilt from its pages so nothing
    //    unreachable (the old page content, bookmarks, metadata) is left in the file.
    if (redacted.size) {
      const mid = await pdf.save({useObjectStreams: false}), view = await (await pdfJs()).getDocument({data: mid.slice(), isEvalSupported: false}).promise;
      try {
        for (const e of state.elements.filter(e => e.type === "image" && redacted.has(e.page))) if (!state.images.has(e.src + ":bitmap")) state.images.set(e.src + ":bitmap", await createImageBitmap(await (await fetch(state.images.get(e.src))).blob()));
        const work = await PDFDocument.load(mid), wpages = work.getPages();
        for (const i of [...redacted].sort((a, b) => a - b)) {
          announce(`Removing redacted content from page ${i + 1}…`);
          const vp1 = state.pages[i].vp, k = 200 / 72, pg = await view.getPage(i + 1), vp = pg.getViewport({scale: k});
          const c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
          await pg.render({canvasContext: g, viewport: vp}).promise;
          paintPage(g, i, c.width / vp1.width);
          const jpg = await work.embedJpg(new Uint8Array(await (await canvasBlob(c, "image/jpeg", 0.92)).arrayBuffer()));
          const node = wpages[i].node;
          for (const key of ["Annots", "Thumb", "PieceInfo", "Metadata", "StructParents"]) node.delete(PDFName.of(key));
          node.set(PDFName.of("Contents"), work.context.obj([]));
          node.set(PDFName.of("Resources"), work.context.obj({}));
          const [x, y] = vp1.convertToPdfPoint(0, vp1.height);
          wpages[i].drawImage(jpg, {x, y, width: vp1.width, height: vp1.height, rotate: degrees(((vp1.rotation % 360) + 360) % 360)});
          c.width = c.height = 0;
        }
        pdf = await PDFDocument.create();
        (await pdf.copyPages(work, work.getPageIndices())).forEach(p => pdf.addPage(p));
      } finally { view.destroy(); }
    }

    const out = await pdf.save({useObjectStreams: false});
    // Never hand over a broken file: reopen it with pdf-lib and pdf.js and check every page.
    const check = await PDFDocument.load(out);
    const rootRef = check.context.trailerInfo.Root, catalog = rootRef && check.context.lookup(rootRef);
    let readable = check.getPageCount() === state.pages.length && String.fromCharCode(...out.subarray(0, 5)) === "%PDF-"
      && check.context.enumerateIndirectObjects().every(([ref]) => ref.generationNumber === 0)
      && catalog instanceof PDFDict && catalog.get(PDFName.of("Type")) === PDFName.of("Catalog");
    if (readable) {
      const verify = await (await pdfJs()).getDocument({data: out.slice(), isEvalSupported: false}).promise;
      try { readable = verify.numPages === state.pages.length; for (let i = 1; readable && i <= verify.numPages; i++) await verify.getPage(i); }
      finally { verify.destroy(); }
    }
    if (!readable) throw new Error("The edited file didn't pass its check, so it wasn't downloaded. Please try again.");
    saveBlob(new Blob([out], {type: "application/pdf"}), `${baseName(state.file)}-edited.pdf`);
    state.dirty = false;
    announce(`Edited PDF downloaded: ${plural(state.pages.length, "page")}, ${fsize(out.length)}${redacted.size ? `. Redacted content was permanently removed from ${plural(redacted.size, "page")}` : ""}.`);
  } catch (e) { announce(e.message || "Something went wrong while saving. Nothing was downloaded."); }
  finally { busy(btn, false); }
}

/* ---------- start ---------- */
wireDrop(root, "ep-in", f => load(f[0]));
})();
