import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("timestamp converter clears Discord output before every validation", () => {
  const source = fs.readFileSync(new URL("../assets/tools.js", import.meta.url), "utf8");
  const start = source.indexOf("const fromU = () => {");
  assert.notEqual(start, -1);
  const body = source.slice(start, source.indexOf("const discord =", start));
  assert.match(body, /const box = \$("#tdc", el\);/);
  assert.match(body, /box\.hidden = true;/);
  assert.match(body, /\$\("tbody", box\)\.innerHTML = "";/);
  assert.ok(body.indexOf("box.hidden = true;") < body.indexOf("if (!/^[+\\-]?[0-9]+\$/.test(raw))"));
});
