import assert from 'node:assert/strict';
import test from 'node:test';
import { compareText } from './textDiff.js';

const reconstruct = (rows, side) => rows
  .filter(row => row[`${side}Line`] !== null)
  .map(row => row[`${side}Segments`].map(segment => segment.text).join(''))
  .join('\n');

test('aligns inserted and removed lines without shifting the unchanged text', () => {
  const { rows } = compareText('start\nremoved\nshared\nend', 'start\nshared\nadded\nend');
  assert.deepEqual(rows.map(row => row.type), ['equal', 'removed', 'equal', 'added', 'equal']);
  assert.deepEqual(rows.map(row => [row.leftLine, row.rightLine]), [[1, 1], [2, null], [3, 2], [null, 3], [4, 4]]);
});

test('highlights multiple character edits within a FIX line, preserving the raw delimiter', () => {
  const left = '8=FIX.4.4\u000135=D\u000155=MSFT\u000154=1\u000138=100\u0001';
  const right = '8=FIX.4.4\u000135=D\u000155=AAPL\u000154=2\u000138=1000\u0001';
  const { rows } = compareText(left, right);
  assert.equal(rows[0].type, 'changed');
  assert.equal(reconstruct(rows, 'left'), left);
  assert.equal(reconstruct(rows, 'right'), right);
  assert.ok(rows[0].leftSegments.some(segment => !segment.changed && segment.text.includes('8=FIX.4.4')));
  assert.equal(rows[0].rightSegments.filter(segment => segment.changed).map(segment => segment.text).join(''), 'AAPL20');
});

test('pairs similar changed lines when the same block contains an unrelated deletion', () => {
  const { rows } = compareText('start\nINFO Request sent\nthreadId=215\nend', 'start\nthreadId=149\nend');
  assert.deepEqual(rows.map(row => row.type), ['equal', 'removed', 'changed', 'equal']);
  assert.equal(rows[2].leftText, 'threadId=215');
  assert.equal(rows[2].rightText, 'threadId=149');
});

test('compares whitespace, duplicate fields, arbitrary text, and final newlines literally', () => {
  const left = 'request 😀\n\t448=ONE|448=TWO|\nlast';
  const right = 'request 😃\n 448=TWO|448=ONE|\nlast\n';
  const { rows } = compareText(left, right);
  assert.equal(reconstruct(rows, 'left'), left);
  assert.equal(reconstruct(rows, 'right'), right);
  assert.deepEqual(rows[0].leftSegments.find(segment => segment.changed), { text: '😀', changed: true });
  assert.equal(rows.at(-1).type, 'added');
  assert.equal(rows.at(-1).rightText, '');
});

test('normalizes CRLF and handles identical or empty text', () => {
  assert.ok(compareText('one\r\ntwo\r\n', 'one\ntwo\n').rows.every(row => row.type === 'equal'));
  assert.deepEqual(compareText('', ''), { rows: [] });
  assert.equal(compareText('', 'new').rows[0].type, 'added');
  assert.equal(compareText('old', '').rows[0].type, 'removed');
  assert.ok(compareText('same\nsame', 'same\nsame').rows.every(row => row.type === 'equal'));
});

test('retains both sources when unrelated input exceeds the bounded diff search', () => {
  const left = Array.from({ length: 1200 }, (_, index) => `left-${index}`).join('\n');
  const right = Array.from({ length: 1300 }, (_, index) => `right-${index}`).join('\n');
  const { rows } = compareText(left, right);
  assert.equal(reconstruct(rows, 'left'), left);
  assert.equal(reconstruct(rows, 'right'), right);
  assert.equal(rows.length, 1300);
});

test('preserves source text and equal spans across varied edit sequences', () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const makeText = () => Array.from({ length: Math.floor(random() * 15) }, () => (
      Array.from({ length: 1 + Math.floor(random() * 12) }, () => 'abc =|😀'[Math.floor(random() * 7)]).join('')
    )).join('\n');
    const left = makeText();
    const right = makeText();
    const { rows } = compareText(left, right);
    assert.equal(reconstruct(rows, 'left'), left);
    assert.equal(reconstruct(rows, 'right'), right);
    rows.filter(row => row.type === 'changed').forEach(row => {
      const unchanged = side => row[`${side}Segments`].filter(segment => !segment.changed).map(segment => segment.text).join('');
      assert.equal(unchanged('left'), unchanged('right'));
    });
  }
});
