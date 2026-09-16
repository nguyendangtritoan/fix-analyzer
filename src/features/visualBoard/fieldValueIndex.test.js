import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureIndexedFields, getIndexedFieldValueHints, projectIndexedFields } from './fieldValueIndex.js';

const messages = new Map([
  [1, [{ tag: 55, value: 'EUR/USD' }, { tag: 270, value: '1.1' }, { tag: 270, value: '1.2' }]],
  [2, [{ tag: 55, value: 'GBP/USD' }, { tag: 271, value: '100' }]],
]);

test('indexes only newly requested tags and preserves repeated values', () => {
  const index = new Map();
  let readCount = 0;
  const getPairs = id => {
    readCount += 1;
    return messages.get(id);
  };

  ensureIndexedFields({ index, tags: ['55'], records: messages.keys(), getPairs });
  assert.equal(readCount, 2);
  ensureIndexedFields({ index, tags: ['55'], records: messages.keys(), getPairs });
  assert.equal(readCount, 2);
  ensureIndexedFields({ index, tags: ['55', '270'], records: messages.keys(), getPairs });
  assert.equal(readCount, 4);

  assert.deepEqual(projectIndexedFields({ index, tags: ['55', '270'], recordIds: messages.keys() }), [
    [1, { 55: ['EUR/USD'], 270: ['1.1', '1.2'] }],
    [2, { 55: ['GBP/USD'] }],
  ]);
});

test('suggests distinct field values ranked by matching message count', () => {
  const index = new Map([
    ['35', new Map([
      [1, ['R']],
      [2, ['AG']],
      [3, ['R', 'R']],
      [4, ['D']],
    ])],
  ]);

  assert.deepEqual(getIndexedFieldValueHints({ index, tag: '35', recordIds: [1, 2, 3, 4], limit: 3 }), {
    hints: [
      { value: 'R', messageCount: 2 },
      { value: 'AG', messageCount: 1 },
      { value: 'D', messageCount: 1 },
    ],
    truncated: false,
  });
});

test('bounds high-cardinality value hint collection', () => {
  const index = new Map([['11', new Map([[1, ['A']], [2, ['B']], [3, ['C']]])]]);
  assert.deepEqual(getIndexedFieldValueHints({
    index,
    tag: '11',
    recordIds: [1, 2, 3],
    maximumDistinct: 2,
  }), {
    hints: [
      { value: 'A', messageCount: 1 },
      { value: 'B', messageCount: 1 },
    ],
    truncated: true,
  });
});

test('returns every distinct current value when no explicit limits are supplied', () => {
  const values = Array.from({ length: 30 }, (_, index) => `VALUE-${index + 1}`);
  const index = new Map([['11', new Map(values.map((value, index) => [index + 1, [value]]))]]);
  const result = getIndexedFieldValueHints({ index, tag: '11', recordIds: index.get('11').keys() });

  assert.equal(result.hints.length, 30);
  assert.equal(result.truncated, false);
  assert.deepEqual(new Set(result.hints.map(hint => hint.value)), new Set(values));
});
