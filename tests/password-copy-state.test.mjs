import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/tools.js', import.meta.url), 'utf8');
const generator = source.slice(source.indexOf('{id: "password-generator"'), source.indexOf('{id: "unit-converter"'));

test('invalid character selection clears previously generated passwords and disables copy', () => {
  assert.match(generator, /if \(!on\.length\) \{ last = \[\]; \$\("#pc", el\)\.disabled = true;/);
  assert.match(generator, /if \(!on\.length\)[^\n]*\$\("#po", el\)\.innerHTML = "";/);
});

test('successful generation re-enables Copy', () => {
  assert.match(generator, /last = list;\s*\$\("#pc", el\)\.disabled = !list\.length;/);
});

test('word-list failure cannot copy an earlier password', () => {
  assert.match(generator, /catch \{ last = \[\]; \$\("#pc", el\)\.disabled = true;/);
});
