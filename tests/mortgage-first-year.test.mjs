import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../assets/tools.js', import.meta.url), 'utf8');
const start = script.indexOf('{id: "mortgage-overpayment"');
const end = script.indexOf('\n{id: "', start + 1);
assert.ok(start >= 0 && end > start, 'Mortgage tool definition exists');
const source = script.slice(start, end).trim().replace(/,$/, '');
const fields = {
  'mo-bal': '1000', 'mo-rate': '0', 'mo-y': '1', 'mo-m': '0',
  'mo-x': '1000', 'mo-l': '500', 'mo-lm': '12', 'mo-mode': 'term', 'mo-t': ''
};
const elements = Object.fromEntries(Object.entries(fields).map(([id, value]) => [id, {value}]));
elements['mo-out'] = {innerHTML: ''};
const context = {
  num: v => parseFloat(String(v).replace(/[,£\s]/g, '')),
  gbp: n => n.toLocaleString('en-GB', {style: 'currency', currency: 'GBP'}),
  dur: m => m === 1 ? '1 month' : m + ' months',
  plural: (n, w) => n + ' ' + w + (n === 1 ? '' : 's'),
  stats: a => a.map(([v, label]) => v + ' ' + label).join(' '),
  $: selector => elements[selector.slice(1)]
};
const tool = vm.runInNewContext('(' + source + ')', context);
tool.init({addEventListener() {}});
const render = changes => {
  for (const [id, value] of Object.entries(changes)) elements[id].value = String(value);
  // init registers a fresh run closure; invoke through its input handler.
  let run;
  tool.init({addEventListener(event, fn) { if (event === 'input') run = fn; }});
  run();
  return elements['mo-out'].innerHTML;
};
test('lump sum scheduled after mortgage payoff is not counted', () => {
  const html = render({'mo-bal':1000,'mo-x':1000,'mo-l':500,'mo-lm':12});
  assert.match(html, /(?:First-year overpayments:|You'd overpay) £916\.67/);
  assert.doesNotMatch(html, /£1,500\.00/);
});
test('lump sum actually paid is counted, capped by remaining balance', () => {
  const html = render({'mo-bal':1000,'mo-x':0,'mo-l':2000,'mo-lm':1});
  assert.match(html, /(?:First-year overpayments:|You'd overpay) £916\.67/);
});
test('monthly overpayments are capped at outstanding balance', () => {
  const html = render({'mo-bal':1000,'mo-x':2000,'mo-l':0,'mo-lm':12});
  assert.match(html, /(?:First-year overpayments:|You'd overpay) £916\.67/);
  assert.doesNotMatch(html, /£2,000\.00/);
});
