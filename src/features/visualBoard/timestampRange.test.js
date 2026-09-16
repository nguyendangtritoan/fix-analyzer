import assert from 'node:assert/strict';
import test from 'node:test';
import { getTimestampRange } from './timestampRange.js';

test('summarizes more timestamps than can be expanded into function arguments', () => {
  const timestamps = Array.from({ length: 150_000 }, (_, index) => 1_000_000 + index);

  assert.deepEqual(getTimestampRange(timestamps), {
    startTimestampMs: 1_000_000,
    endTimestampMs: 1_149_999,
    durationMs: 149_999,
  });
});

test('supports a value selector and ignores non-finite timestamps', () => {
  const records = [
    { timestamp: null },
    { timestamp: 300 },
    { timestamp: Number.NaN },
    { timestamp: 100 },
  ];

  assert.deepEqual(getTimestampRange(records, record => record.timestamp), {
    startTimestampMs: 100,
    endTimestampMs: 300,
    durationMs: 200,
  });
  assert.deepEqual(getTimestampRange([null, Number.NaN]), {
    startTimestampMs: null,
    endTimestampMs: null,
    durationMs: null,
  });
});
