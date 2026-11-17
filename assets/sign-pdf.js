/* ToolsBravo Sign PDF.
   Everything happens in the browser: pdf.js draws the page previews, pdf-lib writes signatures and
   text onto the original PDF. Nothing is uploaded or stored. Positions are kept in PDF points in the
   page's displayed (rotated) orientation, so zoom and screen size never change where things land. */
(() => {
const root = document.querySelector('body[data-tool="sign-pdf"] .panel');
if (!root) return;
const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
const INK = {black: "#111827", blue: "#1d3f9e"};
const TEXT_SCALE = 1.25, BASELINE = 0.88; // text box height and baseline as multiples of font size

const state = {file: null, bytes: null, doc: null, pages: [], scale: 1, elements: [], images: new Map(), saved: {signature: [], initials: []},
  history: [], future: [], selected: null, dirty: false, confirmed: false, renderToken: 0, current: 0};
let uid = 0;
const viewer = q("#sg-viewer"), status = q("#sg-status");
const announce = m => { status.textContent = m; };
const clone = els => els.map(e => ({...e}));

/* ---------- history ---------- */
function commit(message) {
  state.history.push(clone(state.elements)); if (state.history.length > 100) state.history.shift();
  state.future = []; state.dirty = true; syncHistory(); if (message) announce(message);
}
function syncHistory() { q("#sg-undo").disabled = !state.history.length; q("#sg-redo").disabled = !state.future.length; }
function undo() { if (!state.history.length) return; state.future.push(clone(state.elements)); state.elements = state.history.pop(); state.selected = null; drawElements(); syncHistory(); announce("Undone."); }
function redo() { if (!state.future.length) return; state.history.push(clone(state.elements)); state.elements = state.future.pop(); state.selected = null; drawElements(); syncHistory(); announce("Redone."); }

/* ---------- loading ---------- */
async function load(file) {
  const msg = q("#sg-msg");
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return say(msg, `${file.name} isn't a PDF. Choose a .pdf file.`, true);
  if (state.elements.length && state.dirty && !window.confirm?.("Replace the current document? Signatures you've added will be lost.")) return;
  reset(true);
  say(msg, `Opening ${file.name}…`);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {PDFDocument} = await pdfLib();
    try { await PDFDocument.load(bytes.slice()); }
    catch (e) { throw new Error(/encrypt/i.test(e.message) ? `${file.name} is password-protected or has security restrictions, so it can't be signed here. Open it in your PDF reader, save a copy without a password, then try again.` : `${file.name} could not be read as a PDF. It may be damaged.`); }
    const doc = await openPdfJs({name: file.name, arrayBuffer: async () => bytes.slice().buffer});
    state.file = file; state.bytes = bytes; state.doc = doc; state.pages = [];
    for (let i = 1; i <= doc.numPages; i++) { const page = await doc.getPage(i), vp = page.getViewport({scale: 1}); state.pages.push({page, vp, w: vp.width, h: vp.height, rendered: 0}); }
    q("#sg-start").hidden = true; q("#sg-work").hidden = false;
    q("#sg-pages").textContent = doc.numPages; q("#sg-pageno").max = doc.numPages;
    q("#sg-file").textContent = `${file.name} · ${fsize(file.size)} · ${plural(doc.numPages, "page")}`;
    fit(); announce(`Opened ${file.name}. Add a signature with the Signature button.`);
  } catch (e) { reset(true); say(msg, e.message, true); }
}
function reset(keepMessage) {
  state.renderToken++;
  if (state.doc) state.doc.destroy();
  Object.assign(state, {file: null, bytes: null, doc: null, pages: [], elements: [], history: [], future: [], selected: null, dirty: false, confirmed: false, current: 0});
  state.images.clear(); state.saved = {signature: [], initials: []};
  viewer.innerHTML = ""; q("#sg-work").hidden = true; q("#sg-start").hidden = false; syncHistory();
  if (!keepMessage) say(q("#sg-msg"), "Document cleared from this page. Choose another PDF to sign.");
}

/* ---------- pages ---------- */
let observer = null;
function layoutPages() {
  observer?.disconnect();
  viewer.innerHTML = "";
  const token = ++state.renderToken;
  observer = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) renderPage(+en.target.dataset.page, token);
  }, {root: null, threshold: [0, .25, .5, .75]});
  state.pages.forEach((p, i) => {
    const wrap = document.createElement("div");
    wrap.className = "sg-page"; wrap.dataset.page = i; wrap.style.width = p.w * state.scale + "px"; wrap.style.height = p.h * state.scale + "px";
    wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", `Page ${i + 1} of ${state.pages.length}`);
    wrap.innerHTML = `<canvas aria-hidden="true"></canvas><div class="sg-layer"></div><span class="sg-num" aria-hidden="true">${i + 1}</span>`;
    viewer.appendChild(wrap); observer.observe(wrap); p.rendered = 0;
  });
  q("#sg-zoom").textContent = Math.round(state.scale * 100) + "%";
  drawElements();
}
async function renderPage(i, token) {
  const p = state.pages[i]; if (!p || p.rendered === state.scale) return;
  p.rendered = state.scale;
  const wrap = viewer.querySelector(`.sg-page[data-page="${i}"]`); if (!wrap) return;
  const canvas = wrap.querySelector("canvas"), dpr = Math.min(window.devicePixelRatio || 1, 2), vp = p.page.getViewport({scale: state.scale * dpr});
  const c = document.createElement("canvas"); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  try { await p.page.render({canvasContext: x, viewport: vp}).promise; } catch { p.rendered = 0; return; }
  if (token !== state.renderToken) return;
  canvas.width = c.width; canvas.height = c.height; canvas.getContext("2d").drawImage(c, 0, 0); wrap.classList.add("rendered");
}
// The current page is the one covering the upper part of the viewer.
let navLockUntil = 0;
function trackCurrent() {
  if (performance.now() < navLockUntil || !state.pages.length) return;
  const v = viewer.getBoundingClientRect(), probe = v.top + Math.min(v.height * 0.3, 200);
  let best = 0;
  for (const w of viewer.querySelectorAll(".sg-page")) { const r = w.getBoundingClientRect(); if (r.top <= probe) best = +w.dataset.page; else break; }
  state.current = best; q("#sg-pageno").value = best + 1;
}
let scrollRaf = 0;
viewer.addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; trackCurrent(); }); });
["wheel", "touchstart", "keydown"].forEach(t => viewer.addEventListener(t, () => { navLockUntil = 0; }, {passive: true}));
function goToPage(i) {
  i = Math.min(state.pages.length - 1, Math.max(0, i));
  state.current = i; q("#sg-pageno").value = i + 1; navLockUntil = performance.now() + 1500;
  const w = pageEl(i); if (w) viewer.scrollTop += w.getBoundingClientRect().top - viewer.getBoundingClientRect().top - 12;
}
function setScale(s, keepPage = true) {
  const page = state.current;
  state.scale = Math.min(4, Math.max(0.25, s)); layoutPages();
  if (keepPage) goToPage(page);
}
function fit() {
  const avail = Math.max(240, viewer.clientWidth - 24), widest = Math.max(...state.pages.map(p => p.w));
  setScale(Math.min(1.5, avail / widest), false);
}
const pageEl = i => viewer.querySelector(`.sg-page[data-page="${i}"]`);

/* ---------- elements ---------- */
function elementLabel(e) { return `${e.type === "image" ? (e.kind === "initials" ? "Initials" : "Signature") : e.kind === "date" ? "Date" : e.kind === "name" ? "Name" : "Text"} on page ${e.page + 1}`; }
function drawElements() {
  qa(".sg-el").forEach(n => n.remove());
  for (const e of state.elements) {
    const layer = pageEl(e.page)?.querySelector(".sg-layer"); if (!layer) continue;
    const n = document.createElement("div");
    n.className = "sg-el" + (e.id === state.selected ? " selected" : "") + (e.type === "text" ? " sg-text" : "");
    n.dataset.id = e.id; n.dataset.page = e.page; Object.assign(n.dataset, {x: e.x.toFixed(2), y: e.y.toFixed(2), w: e.w.toFixed(2), h: e.h.toFixed(2)});
    n.tabIndex = 0; n.setAttribute("role", "group");
    n.setAttribute("aria-label", `${elementLabel(e)}. Arrow keys move it, plus and minus resize it, Delete removes it${e.type === "text" ? ", Enter edits it" : ""}.`);
    const s = state.scale;
    Object.assign(n.style, {left: e.x * s + "px", top: e.y * s + "px", width: e.w * s + "px", height: e.h * s + "px"});
    n.innerHTML = (e.type === "image" ? `<img src="${state.images.get(e.src)}" alt="" draggable="false">` : `<span style="font-size:${e.size * s}px;line-height:${TEXT_SCALE};color:${e.color}">${esc(e.text)}</span>`)
      + `<button type="button" class="sg-del" aria-label="Remove ${elementLabel(e)}" tabindex="-1">×</button><span class="sg-handle" aria-hidden="true"></span>`;
    layer.appendChild(n);
  }
}
function textSize(text, size) {
  const c = document.createElement("canvas").getContext("2d"); c.font = `${size}px Helvetica, Arial, sans-serif`;
  // Room for the 1.5px borders and 1px padding, so the preview never clips the last character.
  return {w: Math.max(size, c.measureText(text).width) + 6, h: size * TEXT_SCALE};
}
function addElement(e) {
  const p = state.pages[state.current] || state.pages[0], page = state.pages.indexOf(p);
  e.page = page; e.x = Math.max(0, (p.w - e.w) / 2); e.y = Math.min(p.h - e.h, Math.max(0, p.h * 0.7 - e.h / 2)); e.id = "el" + ++uid;
  commit(); state.elements.push(e); state.selected = e.id; drawElements();
  root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus();
  announce(`${elementLabel(e)} added. Drag it into place, or use the arrow keys.`);
}
const byId = id => state.elements.find(e => e.id === id);
function clamp(e) { const p = state.pages[e.page]; e.w = Math.min(e.w, p.w); e.h = Math.min(e.h, p.h); e.x = Math.min(Math.max(0, e.x), p.w - e.w); e.y = Math.min(Math.max(0, e.y), p.h - e.h); }
function resizeBy(e, factor) {
  const nw = Math.max(12, e.w * factor);
  if (e.type === "image") { const r = e.h / e.w; e.w = nw; e.h = nw * r; }
  else { e.size = Math.max(5, Math.min(96, e.size * factor)); Object.assign(e, textSize(e.text, e.size)); }
  clamp(e);
}

/* pointer: drag to move (also across pages), drag the corner to resize */
let drag = null;
viewer.addEventListener("pointerdown", ev => {
  const n = ev.target.closest(".sg-el"); if (!n) { if (state.selected) { state.selected = null; drawElements(); } return; }
  const e = byId(n.dataset.id); if (!e) return;
  if (ev.target.closest(".sg-del")) { commit(); state.elements = state.elements.filter(x => x !== e); state.selected = null; drawElements(); announce(`${elementLabel(e)} removed.`); return; }
  ev.preventDefault(); try { n.setPointerCapture(ev.pointerId); } catch {}
  if (state.selected !== e.id) { state.selected = e.id; qa(".sg-el.selected").forEach(x => x.classList.remove("selected")); n.classList.add("selected"); }
  drag = {e, n, before: clone(state.elements), mode: ev.target.closest(".sg-handle") ? "resize" : "move", sx: ev.clientX, sy: ev.clientY, x: e.x, y: e.y, w: e.w, h: e.h, size: e.size, moved: false};
});
viewer.addEventListener("pointermove", ev => {
  if (!drag) return;
  const s = state.scale, dx = (ev.clientX - drag.sx) / s, dy = (ev.clientY - drag.sy) / s, {e, n} = drag;
  if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
  if (drag.mode === "move") {
    const v = viewer.getBoundingClientRect(), edge = 48, step = ev.clientY < v.top + edge ? -14 : ev.clientY > v.bottom - edge ? 14 : 0;
    if (step) { viewer.scrollTop += step; drag.sy -= step; }
    e.x = drag.x + dx; e.y = drag.y + dy; n.style.left = e.x * s + "px"; n.style.top = e.y * s + "px"; n.classList.add("dragging"); }
  else {
    const nw = Math.max(12, drag.w + dx);
    if (e.type === "image") { e.w = nw; e.h = nw * drag.h / drag.w; }
    else { e.size = Math.max(5, Math.min(96, drag.size * nw / drag.w)); Object.assign(e, textSize(e.text, e.size)); n.querySelector("span").style.fontSize = e.size * s + "px"; }
    n.style.width = e.w * s + "px"; n.style.height = e.h * s + "px";
  }
});
const endDrag = ev => {
  if (!drag) return;
  const {e, n, before, moved} = drag; drag = null; n.classList.remove("dragging");
  if (!moved) return;
  if (ev && n) {
    // Dropped over another page? Move it there, keeping the drop point under the pointer.
    n.style.pointerEvents = "none";
    const target = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList?.contains("sg-page"));
    n.style.pointerEvents = "";
    if (target && +target.dataset.page !== e.page) {
      const r = target.getBoundingClientRect(), s = state.scale;
      e.page = +target.dataset.page; e.x = (ev.clientX - r.left) / s - e.w / 2; e.y = (ev.clientY - r.top) / s - e.h / 2;
    }
  }
  clamp(e);
  state.history.push(before); state.future = []; state.dirty = true; syncHistory();
  drawElements(); root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus({preventScroll: true});
  announce(`${elementLabel(e)} placed.`);
};
viewer.addEventListener("pointerup", endDrag);
viewer.addEventListener("pointercancel", () => { if (drag) { const {e, x, y} = drag; e.x = x; e.y = y; drag = null; drawElements(); } });
viewer.addEventListener("dblclick", ev => { const n = ev.target.closest(".sg-el.sg-text"); if (n) editText(byId(n.dataset.id)); });
viewer.addEventListener("focusin", ev => { const n = ev.target.closest(".sg-el"); if (n && state.selected !== n.dataset.id) { state.selected = n.dataset.id; qa(".sg-el.selected").forEach(x => x.classList.remove("selected")); n.classList.add("selected"); } });
viewer.addEventListener("keydown", ev => {
  const n = ev.target.closest(".sg-el"); if (!n) return;
  const e = byId(n.dataset.id); if (!e) return;
  const step = ev.shiftKey ? 10 : 2, moves = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]};
  if (moves[ev.key]) { ev.preventDefault(); commit(); e.x += moves[ev.key][0]; e.y += moves[ev.key][1]; clamp(e); drawElements(); root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus(); }
  else if (ev.key === "+" || ev.key === "=" || ev.key === "-") { ev.preventDefault(); commit(); resizeBy(e, ev.key === "-" ? 1 / 1.1 : 1.1); drawElements(); root.querySelector(`.sg-el[data-id="${e.id}"]`)?.focus(); }
  else if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); commit(); state.elements = state.elements.filter(x => x !== e); state.selected = null; drawElements(); announce(`${elementLabel(e)} removed.`); viewer.focus(); }
  else if (ev.key === "Enter" && e.type === "text") { ev.preventDefault(); editText(e); }
});

/* ---------- signature dialog: draw, type or upload ---------- */
const dlg = q("#sg-dialog"), pad = q("#sg-pad");
let kind = "signature", padInk = false, uploaded = null;
function openSignature(k) {
  kind = k; q("#sg-dtitle").textContent = k === "initials" ? "Add your initials" : "Add your signature";
  q("#sg-type-in").value = ""; q("#sg-type-in").placeholder = k === "initials" ? "e.g. SP" : "e.g. Sam Patel";
  const saved = state.saved[k];
  q("#sg-saved").hidden = !saved.length;
  q("#sg-saved-list").innerHTML = saved.map((id, i) => `<button type="button" class="sg-saved" data-i="${i}" aria-label="Use saved ${k} ${i + 1}"><img src="${state.images.get(id)}" alt=""></button>`).join("");
  clearPad(); uploaded = null; q("#sg-up-preview").hidden = true; q("#sg-err").textContent = "";
  tab(q("#sg-type-in").value ? "type" : "draw");
  dlg.showModal(); sizePad();
}
function tab(name) {
  qa("[data-tab]").forEach(b => { const on = b.dataset.tab === name; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  qa("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== name; });
  if (name === "draw") sizePad(); if (name === "type") { q("#sg-type-in").focus(); previewType(); }
}
root.addEventListener("click", ev => { const b = ev.target.closest("[data-tab]"); if (b) tab(b.dataset.tab); });
q(".sg-tabs").addEventListener("keydown", ev => {
  const tabs = qa("[data-tab]"), i = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
  if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); const t = tabs[(i + (ev.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; tab(t.dataset.tab); t.focus(); }
});
function sizePad() {
  const r = pad.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (pad.width !== Math.round(r.width * dpr)) { pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr); clearPad(); }
}
function clearPad() { pad.getContext("2d").clearRect(0, 0, pad.width, pad.height); padInk = false; }
let stroke = null;
pad.addEventListener("pointerdown", ev => {
  ev.preventDefault(); try { pad.setPointerCapture(ev.pointerId); } catch {}
  const r = pad.getBoundingClientRect(), k = pad.width / r.width, c = pad.getContext("2d");
  c.lineCap = c.lineJoin = "round"; c.strokeStyle = INK[q("[name=sg-ink]:checked").value]; c.lineWidth = 2.6 * k;
  stroke = {k, r, last: [(ev.clientX - r.left) * k, (ev.clientY - r.top) * k]};
  c.beginPath(); c.arc(stroke.last[0], stroke.last[1], c.lineWidth / 2, 0, Math.PI * 2); c.fillStyle = c.strokeStyle; c.fill(); padInk = true;
});
pad.addEventListener("pointermove", ev => {
  if (!stroke) return;
  const c = pad.getContext("2d"), {k, r} = stroke;
  for (const p of ev.getCoalescedEvents?.() || [ev]) {
    const pt = [(p.clientX - r.left) * k, (p.clientY - r.top) * k], mid = [(stroke.last[0] + pt[0]) / 2, (stroke.last[1] + pt[1]) / 2];
    c.beginPath(); c.moveTo(stroke.mid?.[0] ?? stroke.last[0], stroke.mid?.[1] ?? stroke.last[1]); c.quadraticCurveTo(stroke.last[0], stroke.last[1], mid[0], mid[1]); c.stroke();
    stroke.last = pt; stroke.mid = mid;
  }
});
["pointerup", "pointercancel", "pointerleave"].forEach(t => pad.addEventListener(t, () => { stroke = null; }));
q("#sg-clear").onclick = clearPad;
async function previewType() {
  const v = q("#sg-type-in").value.trim(), out = q("#sg-type-preview");
  out.textContent = v || (kind === "initials" ? "SP" : "Your name");
  out.style.color = INK[q("[name=sg-ink]:checked").value]; out.classList.toggle("empty", !v);
}
q("#sg-type-in").addEventListener("input", previewType);
qa("[name=sg-ink]").forEach(r => r.addEventListener("change", previewType));
q("#sg-up-in").addEventListener("change", async () => {
  const f = q("#sg-up-in").files[0]; q("#sg-up-in").value = ""; if (!f) return;
  try { uploaded = await createImageBitmap(f); q("#sg-up-preview").hidden = false; await previewUpload(); q("#sg-err").textContent = ""; }
  catch { uploaded = null; q("#sg-err").textContent = `${f.name} couldn't be opened as an image. Use a PNG or JPG.`; }
});
q("#sg-up-white").addEventListener("change", () => uploaded && previewUpload());
async function previewUpload() { q("#sg-up-preview").src = (await uploadToCanvas()).toDataURL("image/png"); }
async function uploadToCanvas() {
  const k = Math.min(1, 1200 / Math.max(uploaded.width, uploaded.height)), c = document.createElement("canvas");
  c.width = Math.round(uploaded.width * k); c.height = Math.round(uploaded.height * k);
  const x = c.getContext("2d"); x.drawImage(uploaded, 0, 0, c.width, c.height);
  if (q("#sg-up-white").checked) { const d = x.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { const m = Math.min(d.data[i], d.data[i + 1], d.data[i + 2]); if (m > 230) d.data[i + 3] = 0; else if (m > 200) d.data[i + 3] = Math.round(d.data[i + 3] * (230 - m) / 30); } x.putImageData(d, 0, 0); }
  return c;
}
// Crops to the inked area (plus a little padding) so the placed box hugs the signature.
function trim(c) {
  const x = c.getContext("2d"), {width: w, height: h} = c, d = x.getImageData(0, 0, w, h).data;
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 16) { if (i < l) l = i; if (i > r) r = i; if (y < t) t = y; if (y > b) b = y; }
  if (r < 0) return null;
  const p = Math.round(Math.max(w, h) * 0.02), o = document.createElement("canvas");
  l = Math.max(0, l - p); t = Math.max(0, t - p); r = Math.min(w - 1, r + p); b = Math.min(h - 1, b + p);
  o.width = r - l + 1; o.height = b - t + 1; o.getContext("2d").drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
async function makeSignature() {
  const pane = qa("[data-pane]").find(p => !p.hidden).dataset.pane;
  let c;
  if (pane === "draw") { if (!padInk) throw new Error("Draw your " + kind + " in the box first."); c = pad; }
  else if (pane === "type") {
    const v = q("#sg-type-in").value.trim(); if (!v) throw new Error("Type your " + (kind === "initials" ? "initials" : "name") + " first.");
    await document.fonts.load('600 96px "Dancing Script"').catch(() => {});
    c = document.createElement("canvas"); const x = c.getContext("2d"); x.font = '600 96px "Dancing Script", cursive';
    c.width = Math.ceil(x.measureText(v).width + 60); c.height = 160;
    x.font = '600 96px "Dancing Script", cursive'; x.fillStyle = INK[q("[name=sg-ink]:checked").value]; x.textBaseline = "middle"; x.fillText(v, 30, 84);
  } else { if (!uploaded) throw new Error("Choose an image of your " + kind + " first."); c = await uploadToCanvas(); }
  const t = trim(c); if (!t) throw new Error("That " + kind + " is empty. Try again.");
  return t.toDataURL("image/png");
}
q("#sg-use").onclick = async () => {
  try {
    const url = await makeSignature(), id = "img" + ++uid; state.images.set(id, url); state.saved[kind].push(id);
    dlg.close(); placeImage(id);
  } catch (e) { q("#sg-err").textContent = e.message; }
};
q("#sg-saved-list").addEventListener("click", ev => { const b = ev.target.closest(".sg-saved"); if (!b) return; dlg.close(); placeImage(state.saved[kind][+b.dataset.i]); });
q("#sg-cancel").onclick = () => dlg.close();
function placeImage(id) {
  const img = new Image();
  img.onload = () => { const w = kind === "initials" ? 54 : 150, h = w * img.naturalHeight / img.naturalWidth; addElement({type: "image", kind, src: id, w, h: Math.min(h, 90)}); };
  img.src = state.images.get(id);
}

/* ---------- text, name and date ---------- */
const tdlg = q("#sg-tdialog");
let editing = null;
function dateText(fmt) { const d = new Date(); return fmt === "long" ? d.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"}) : fmt === "iso" ? d.toISOString().slice(0, 10) : d.toLocaleDateString("en-GB"); }
function openText(k, e) {
  editing = e || null; const kindNow = e ? e.kind : k;
  q("#sg-ttitle").textContent = e ? "Edit text" : kindNow === "name" ? "Add your name" : kindNow === "date" ? "Add the date" : "Add text";
  q("#sg-date-row").hidden = kindNow !== "date";
  q("#sg-t-in").value = e ? e.text : kindNow === "date" ? dateText(q("#sg-date-fmt").value) : "";
  q("#sg-t-size").value = String(e ? Math.round(e.size) : 12); q("#sg-terr").textContent = ""; tdlg.dataset.kind = kindNow;
  tdlg.showModal(); q("#sg-t-in").select();
}
q("#sg-date-fmt").addEventListener("change", () => { q("#sg-t-in").value = dateText(q("#sg-date-fmt").value); });
function editText(e) { if (e) openText(e.kind, e); }
q("#sg-t-ok").onclick = () => {
  const text = q("#sg-t-in").value.trim(), size = +q("#sg-t-size").value;
  if (!text) { q("#sg-terr").textContent = "Type the text first."; return; }
  tdlg.close();
  if (editing) { commit(); Object.assign(editing, {text, size}, textSize(text, size)); clamp(editing); drawElements(); announce("Text updated."); root.querySelector(`.sg-el[data-id="${editing.id}"]`)?.focus(); editing = null; return; }
  addElement({type: "text", kind: tdlg.dataset.kind, text, size, color: "#111827", ...textSize(text, size)});
};
q("#sg-t-in").addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); q("#sg-t-ok").click(); } });
q("#sg-t-cancel").onclick = () => { tdlg.close(); editing = null; };

/* ---------- toolbar ---------- */
root.querySelector(".sg-bar").addEventListener("click", ev => {
  const b = ev.target.closest("[data-add]"); if (!b || !state.doc) return;
  const k = b.dataset.add; (k === "signature" || k === "initials") ? openSignature(k) : openText(k);
});
q("#sg-undo").onclick = undo; q("#sg-redo").onclick = redo;
q("#sg-zoom-in").onclick = () => setScale(state.scale * 1.25);
q("#sg-zoom-out").onclick = () => setScale(state.scale / 1.25);
q("#sg-fit").onclick = fit;
q("#sg-pageno").addEventListener("change", () => goToPage((+q("#sg-pageno").value || 1) - 1));
q("#sg-reset").onclick = () => { if (state.elements.length && state.dirty) { q("#sg-reset-confirm").showModal(); return; } reset(); };
q("#sg-reset-yes").onclick = () => { q("#sg-reset-confirm").close(); reset(); };
q("#sg-reset-no").onclick = () => q("#sg-reset-confirm").close();
document.addEventListener("keydown", ev => {
  if (q("#sg-work").hidden || document.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
});
window.addEventListener("beforeunload", ev => { if (state.dirty && state.elements.length) { ev.preventDefault(); ev.returnValue = ""; } });
let resizeTimer = null;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.doc && dlg.open) sizePad(); }, 150); });

/* ---------- export ---------- */
q("#sg-download").onclick = () => {
  if (!state.elements.length) { announce("Add a signature or text first. Use the Signature button."); q("[data-add=signature]").focus(); return; }
  if (state.confirmed) return exportPdf();
  const pages = [...new Set(state.elements.map(e => e.page + 1))].sort((a, b) => a - b);
  q("#sg-summary").textContent = `${plural(state.elements.length, "item")} on page${pages.length > 1 ? "s" : ""} ${pages.join(", ")}.`;
  q("#sg-confirm").showModal();
};
q("#sg-confirm-yes").onclick = () => { if (q("#sg-confirm-skip").checked) state.confirmed = true; q("#sg-confirm").close(); exportPdf(); };
q("#sg-confirm-no").onclick = () => q("#sg-confirm").close();
const dataUrlBytes = u => Uint8Array.from(atob(u.slice(u.indexOf(",") + 1)), c => c.charCodeAt(0));
// A PDF that was edited and re-saved can hold an object under a non-zero generation number
// (for example its catalog as "53 1"), next to the older "53 0" it replaced. pdf-lib keeps both, but
// a rewritten file has one cross-reference entry per number, so strict readers such as Acrobat then
// report "the root object is missing or invalid". Give each such object a fresh number with
// generation 0 and update every reference to it, so the written file is self-consistent.
function normaliseGenerations(pdf, {PDFRef, PDFDict, PDFArray, PDFStream}) {
  const ctx = pdf.context, remap = new Map();
  for (const [ref] of ctx.enumerateIndirectObjects()) if (ref.generationNumber !== 0) remap.set(ref, ctx.nextRef());
  if (!remap.size) return 0;
  for (const [from, to] of remap) { ctx.assign(to, ctx.lookup(from)); ctx.delete(from); }
  const fix = v => (v instanceof PDFRef && remap.get(v)) || v;
  const walk = o => {
    if (o instanceof PDFStream) o = o.dict;
    if (o instanceof PDFDict) { for (const [k, v] of o.entries()) { const n = fix(v); n !== v ? o.set(k, n) : walk(v); } }
    else if (o instanceof PDFArray) { for (let i = 0; i < o.size(); i++) { const v = o.get(i), n = fix(v); n !== v ? o.set(i, n) : walk(v); } }
  };
  for (const [, obj] of ctx.enumerateIndirectObjects()) walk(obj);
  for (const k of ["Root", "Info", "Encrypt"]) if (ctx.trailerInfo[k]) ctx.trailerInfo[k] = fix(ctx.trailerInfo[k]);
  return remap.size;
}
async function exportPdf() {
  const btn = q("#sg-download"); busy(btn, true, "Saving…");
  try {
    const lib = await pdfLib(), {PDFDocument, StandardFonts, rgb, degrees, PDFDict, PDFName} = lib;
    const pdf = await PDFDocument.load(state.bytes.slice());
    normaliseGenerations(pdf, lib); // before anything else looks up pages or adds objects
    const font = await pdf.embedFont(StandardFonts.Helvetica), embedded = new Map();
    const pages = pdf.getPages();
    if (pages.length !== state.pages.length) throw new Error("The document couldn't be read consistently. Nothing was downloaded.");
    for (const e of state.elements) {
      const page = pages[e.page], vp = state.pages[e.page].vp, rot = ((vp.rotation % 360) + 360) % 360;
      if (e.type === "image") {
        if (!embedded.has(e.src)) embedded.set(e.src, await pdf.embedPng(dataUrlBytes(state.images.get(e.src))));
        const [x, y] = vp.convertToPdfPoint(e.x, e.y + e.h); // the image's own bottom-left corner, as displayed
        page.drawImage(embedded.get(e.src), {x, y, width: e.w, height: e.h, rotate: degrees(rot)});
      } else {
        const [x, y] = vp.convertToPdfPoint(e.x + 1, e.y + e.size * BASELINE), c = e.color.match(/\w\w/g).map(h => parseInt(h, 16) / 255);
        try { font.encodeText(e.text); page.drawText(e.text, {x, y, size: e.size, font, color: rgb(c[0], c[1], c[2]), rotate: degrees(rot)}); }
        catch {
          // Characters outside the standard PDF font (for example non-Latin scripts) are drawn as an image instead.
          const cv = document.createElement("canvas"), k = 4; cv.width = Math.ceil(e.w * k); cv.height = Math.ceil(e.h * k);
          const g = cv.getContext("2d"); g.font = `${e.size * k}px Helvetica, Arial, sans-serif`; g.fillStyle = e.color; g.textBaseline = "alphabetic"; g.fillText(e.text, k, e.size * BASELINE * k);
          const img = await pdf.embedPng(dataUrlBytes(cv.toDataURL("image/png"))), [ix, iy] = vp.convertToPdfPoint(e.x, e.y + e.h);
          page.drawImage(img, {x: ix, y: iy, width: e.w, height: e.h, rotate: degrees(rot)});
        }
      }
    }
    // Classic cross-reference table, no object streams: the layout every PDF reader understands,
    // including older phone and desktop apps that refuse compressed (PDF 1.5+) structures.
    const out = await pdf.save({useObjectStreams: false});
    // Never hand over a broken file: reopen what was written and check every page is there.
    const check = await PDFDocument.load(out);
    // Strict readers need: every object at generation 0 (one per number) and a trailer /Root that is the catalog.
    const root = check.context.trailerInfo.Root, catalog = root && check.context.lookup(root);
    let readable = check.getPageCount() === state.pages.length && out.length >= 200 && String.fromCharCode(...out.subarray(0, 5)) === "%PDF-"
      && check.context.enumerateIndirectObjects().every(([ref]) => ref.generationNumber === 0)
      && catalog instanceof PDFDict && catalog.get(PDFName.of("Type")) === PDFName.of("Catalog");
    if (readable) {
      // A second, independent reader (pdf.js) must also open the file and every page in it.
      const verify = await (await pdfJs()).getDocument({data: out.slice(), isEvalSupported: false}).promise;
      try { readable = verify.numPages === state.pages.length; for (let i = 1; readable && i <= verify.numPages; i++) await verify.getPage(i); }
      finally { verify.destroy(); }
    }
    if (!readable) throw new Error("The signed file didn't pass its check, so it wasn't downloaded. Please try again.");
    saveBlob(new Blob([out], {type: "application/pdf"}), `${baseName(state.file)}-signed.pdf`);
    state.dirty = false;
    announce(`Signed PDF downloaded: ${plural(state.elements.length, "item")} added, ${plural(state.pages.length, "page")}, ${fsize(out.length)}.`);
  } catch (e) { announce(e.message || "Something went wrong while saving. Nothing was downloaded."); }
  finally { busy(btn, false); }
}

/* ---------- start ---------- */
wireDrop(root, "sg-in", f => load(f[0]));
})();
