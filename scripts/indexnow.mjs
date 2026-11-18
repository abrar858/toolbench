// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver and others) which pages changed, so they
// re-crawl them sooner. Google does not use IndexNow; it reads sitemap.xml.
//
//   node scripts/indexnow.mjs <before-sha> <after-sha>   # pages changed between two commits
//   node scripts/indexnow.mjs --all                       # every URL in sitemap.xml
//   add --dry-run to print the request without sending it
//
// Before sending, it waits until the live site serves the new version of the first changed page, so
// engines don't fetch a page GitHub Pages hasn't deployed yet. The key file must be at the site root.
import {readFileSync, readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

const HOST = "toolsbravo.com", ORIGIN = `https://${HOST}/`;
const args = process.argv.slice(2), dry = args.includes("--dry-run"), all = args.includes("--all");
const key = readdirSync(".").find(f => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
if (!key || readFileSync(`${key}.txt`, "utf8").trim() !== key) throw new Error("IndexNow key file <key>.txt with the key as its content is missing from the site root");

const sitemapUrls = [...readFileSync("sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
let files;
if (all) files = null;
else {
  const [before, after] = args.filter(a => !a.startsWith("--"));
  if (!before || !after) throw new Error("Pass <before-sha> <after-sha>, or --all");
  const range = /^0+$/.test(before) ? [after] : [`${before}..${after}`];
  files = execFileSync("git", ["diff", "--name-only", ...(range.length === 1 ? [`${after}~1`, after] : range)], {encoding: "utf8"}).split("\n").filter(Boolean);
}
const toUrl = f => f === "index.html" ? ORIGIN : ORIGIN + f;
const urls = all ? sitemapUrls : files.filter(f => /\.html$/.test(f) && !f.includes("/") && f !== "404.html").map(toUrl).filter(u => sitemapUrls.includes(u));
if (!urls.length) { console.log("No changed public pages; nothing to send."); process.exit(0); }

// Wait for GitHub Pages to serve the new version of one changed page (up to 10 minutes).
if (!dry && files) {
  const probe = files.find(f => /\.html$/.test(f) && !f.includes("/") && f !== "404.html");
  const want = createHash("sha256").update(readFileSync(probe)).digest("hex");
  for (let i = 0; i < 40; i++) {
    const body = await fetch(toUrl(probe) + `?indexnow=${Date.now()}`, {headers: {"cache-control": "no-cache"}}).then(r => r.text()).catch(() => "");
    if (createHash("sha256").update(body).digest("hex") === want) { console.log(`Live site serves the new ${probe}.`); break; }
    if (i === 39) console.log(`Live ${probe} still differs after 10 minutes; sending anyway (engines crawl later).`);
    await new Promise(r => setTimeout(r, 15000));
  }
}

const payload = {host: HOST, key, keyLocation: `${ORIGIN}${key}.txt`, urlList: urls.slice(0, 10000)};
console.log(`IndexNow: ${urls.length} URL(s)\n  ${urls.join("\n  ")}`);
if (dry) { console.log("Dry run, not sent."); process.exit(0); }
const r = await fetch("https://api.indexnow.org/indexnow", {method: "POST", headers: {"content-type": "application/json; charset=utf-8"}, body: JSON.stringify(payload)});
console.log(`IndexNow response: HTTP ${r.status} ${r.statusText}`);
// 200 OK and 202 Accepted both mean the submission was received.
if (![200, 202].includes(r.status)) { console.log(await r.text()); process.exitCode = 1; }
