import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PROJECTED_FIELDS,
  collectProjectedFieldValues,
  normalizeFieldTags,
} from './fieldProjection.js';

test('normalizes, deduplicates, and limits projected field tags', () => {
  assert.deepEqual(normalizeFieldTags('270, 271  270,055,invalid,0'), ['270', '271', '55']);
  assert.deepEqual(
    normalizeFieldTags(['8', '9', '35', '49', '52', '56', '270']),
    ['8', '9', '35', '49', '52', '56'].slice(0, MAX_PROJECTED_FIELDS),
  );
});

test('collects every occurrence of each requested tag in message order', () => {
  const pairs = [
    { tag: 269, value: '0' },
    { tag: 270, value: '1858.08' },
    { tag: 271, value: '1.5' },
    { tag: 269, value: '1' },
    { tag: 270, value: '1866.53' },
    { tag: 271, value: '1.5' },
  ];

  assert.deepEqual(collectProjectedFieldValues(pairs, ['270', '269', '999']), {
    270: ['1858.08', '1866.53'],
    269: ['0', '1'],
  });
});
