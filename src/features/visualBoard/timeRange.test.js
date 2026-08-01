import assert from 'node:assert/strict';
import test from 'node:test';
import { isTimestampWithinTimeRange, parseTimeOfDay } from './timeRange.js';

const at = (hours, minutes, seconds, milliseconds = 0) => (
  Date.UTC(2026, 6, 20, hours, minutes, seconds, milliseconds)
);

test('parses second and millisecond UTC times of day', () => {
  assert.equal(parseTimeOfDay('08:09'), 29_340_000);
  assert.equal(parseTimeOfDay('08:09:10'), 29_350_000);
  assert.equal(parseTimeOfDay('08:09:10.25'), 29_350_250);
  assert.equal(parseTimeOfDay('24:00:00'), null);
});

test('matches inclusive time range boundaries', () => {
  assert.equal(isTimestampWithinTimeRange(at(8, 9, 10), '08:09:10', '08:09:15'), true);
  assert.equal(isTimestampWithinTimeRange(at(8, 9, 15), '08:09:10', '08:09:15'), true);
  assert.equal(isTimestampWithinTimeRange(at(8, 9, 15, 1), '08:09:10', '08:09:15'), false);
});

test('supports open-ended and overnight time ranges', () => {
  assert.equal(isTimestampWithinTimeRange(at(9, 0, 0), '08:09:10', ''), true);
  assert.equal(isTimestampWithinTimeRange(at(8, 0, 0), '08:09:10', ''), false);
  assert.equal(isTimestampWithinTimeRange(at(23, 59, 59), '23:59:00', '00:01:00'), true);
  assert.equal(isTimestampWithinTimeRange(at(0, 0, 30), '23:59:00', '00:01:00'), true);
  assert.equal(isTimestampWithinTimeRange(at(12, 0, 0), '23:59:00', '00:01:00'), false);
});

test('keeps untimed messages only when no time filter is active', () => {
  assert.equal(isTimestampWithinTimeRange(null, '', ''), true);
  assert.equal(isTimestampWithinTimeRange(null, '08:00:00', ''), false);
});
