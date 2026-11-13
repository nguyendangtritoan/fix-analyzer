import assert from 'node:assert/strict';
import test from 'node:test';
import { getCaptureDimensions, getCaptureRange, indexMessageRows } from './messageCapture.js';
import { groupify, parseFixMessage } from './parsers.js';

test('capture can select one occurrence across repeated and nested groups without changing source pairs', () => {
  const source = parseFixMessage('8=FIX.4.4|35=D|453=2|448=DEALER|802=2|523=DESK-A|803=1|523=DESK-B|803=2|448=CLIENT|10=000|');
  const original = structuredClone(source);
  const groups = {
    453: { delimiter: 448, fields: [448, 802] },
    802: { delimiter: 523, fields: [523, 803] },
  };
  const { nodes, rows } = indexMessageRows(groupify(source, groups));
  assert.deepEqual(rows.map(({ tag, value }) => ({ tag, value })), original);
  assert.deepEqual(rows.map(row => row.rowIndex), source.map((_, index) => index));
  const parties = rows.filter(row => row.tag === 448);
  const range = getCaptureRange(parties[1].rowIndex, parties[1].rowIndex, rows.length);
  assert.deepEqual(rows.slice(range[0], range[1] + 1).map(row => row.value), ['CLIENT']);
  assert.equal(nodes[2].instances[0][1].instances[1][0].rowIndex, 7);
  assert.deepEqual(source, original);
});

test('ranges include both endpoints and accept selection in either direction', () => {
  assert.deepEqual(getCaptureRange(2, 6, 10), [2, 6]);
  assert.deepEqual(getCaptureRange(6, 2, 10), [2, 6]);
  assert.deepEqual(getCaptureRange(4, 4, 10), [4, 4]);
  assert.deepEqual(getCaptureRange(0, 9, 10), [0, 9]);
});

test('incomplete and out-of-bounds ranges cannot be exported', () => {
  for (const [start, end] of [[null, 2], [0, null], [undefined, 3], [-1, 3], [0, 10], [1.5, 3]]) {
    assert.equal(getCaptureRange(start, end, 10), null);
  }
  assert.equal(getCaptureRange(0, 0, 0), null);
});

test('exports use sharp images and lower resolution for long messages without cropping', () => {
  assert.deepEqual(getCaptureDimensions(960, 500), { width: 1920, height: 1000 });
  const long = getCaptureDimensions(960, 12000);
  assert.ok(long.height <= 16384 && long.height >= 12000);
  assert.ok(long.width * long.height <= 32000000);
  assert.ok(Math.abs(long.width / long.height - 960 / 12000) < .001);
});

test('oversized or invalid images request a smaller selection instead of truncation', () => {
  for (const [width, height] of [[960, 20000], [20000, 100], [6000, 6000], [0, 100], [100, NaN]]) {
    assert.throws(() => getCaptureDimensions(width, height), /smaller range/);
  }
});
