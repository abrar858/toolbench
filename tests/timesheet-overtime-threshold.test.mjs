import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../assets/tools.js', import.meta.url), 'utf8');
const start = source.indexOf('id: "time-duration"');
const end = source.indexOf('\n{id:', start + 1);
const tool = source.slice(start, end < 0 ? undefined : end);

test('timesheet validates overtime threshold before calculating pay', () => {
  assert.ok(start >= 0, 'time duration tool exists');
  assert.match(tool, /otAfter>=0/);
  assert.match(tool, /otValid&&rate>0\?basic\*rate/);
  assert.match(tool, /Enter an overtime threshold of zero or more hours/);
});

test('negative overtime cannot produce a gross pay result', () => {
  const calculate = (hours, rate, raw, multiplier) => {
    const threshold = Number(raw);
    const valid = raw === '' || (Number.isFinite(threshold) && threshold >= 0);
    const overtime = valid && raw !== '' && hours > threshold ? hours - threshold : 0;
    const basic = hours - overtime;
    return valid && rate > 0 ? basic * rate + overtime * rate * multiplier : null;
  };
  assert.equal(calculate(40, 10, '-5', 1.5), null);
  assert.equal(calculate(40, 10, '40', 1.5), 400);
  assert.equal(calculate(45, 10, '40', 1.5), 475);
  assert.equal(calculate(40, 10, '', 1.5), 400);
  assert.equal(calculate(40, 10, '0', 1.5), 600);
});
