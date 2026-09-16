import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFieldInvestigationLabel,
  summarizeFieldFilters,
  summarizeIndexedFieldFilters,
} from './fieldInvestigation.js';

const records = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
const fieldValues = new Map([
  [1, { 35: ['D'], 55: ['EUR/USD'] }],
  [2, { 35: ['8'], 55: ['EUR/USD'] }],
  [3, { 35: ['D'], 55: ['GBP/USD'] }],
  [4, { 35: ['W'], 55: ['USD/JPY'], 270: ['1.1', '1.2'] }],
]);

test('reports standalone and cumulative counts for each field filter', () => {
  const summary = summarizeFieldFilters(records, fieldValues, [
    { tag: '55', value: 'EUR' },
    { tag: '35', value: 'D' },
  ]);

  assert.equal(summary.totalCount, 4);
  assert.equal(summary.matchedCount, 1);
  assert.deepEqual(summary.rows, [
    { individualCount: 2, cumulativeCount: 2 },
    { individualCount: 2, cumulativeCount: 1 },
  ]);
});

test('summarizes directly from the worker field index without projecting values', () => {
  const index = new Map([
    ['35', new Map([[1, ['D']], [2, ['8']], [3, ['D']], [4, ['W']]])],
    ['55', new Map([[1, ['EUR/USD']], [2, ['EUR/USD']], [3, ['GBP/USD']]])],
  ]);

  assert.deepEqual(summarizeIndexedFieldFilters([1, 2, 3, 4], index, [
    { tag: '55', value: 'EUR' },
    { tag: '35', value: 'D' },
  ]), {
    totalCount: 4,
    matchedCount: 1,
    rows: [
      { individualCount: 2, cumulativeCount: 2 },
      { individualCount: 2, cumulativeCount: 1 },
    ],
  });
});

test('counts field presence and matches any repeated occurrence', () => {
  const summary = summarizeFieldFilters(records, fieldValues, [
    { tag: '270', value: '' },
    { tag: '270', value: '1.2' },
  ]);

  assert.equal(summary.matchedCount, 1);
  assert.equal(summary.rows[0].individualCount, 1);
  assert.equal(summary.rows[1].individualCount, 1);
});

test('uses wildcard field values in aggregate counts', () => {
  const summary = summarizeFieldFilters(records, fieldValues, [
    { tag: '55', value: 'USD/*' },
  ]);

  assert.equal(summary.matchedCount, 1);
  assert.equal(summary.rows[0].individualCount, 1);
});

test('uses the complete scope when no field filter is active', () => {
  assert.deepEqual(summarizeFieldFilters(records, fieldValues, []), {
    totalCount: 4,
    matchedCount: 4,
    rows: [],
  });
});

test('labels comparison tabs from their first filter', () => {
  assert.equal(getFieldInvestigationLabel([], 2), 'Count 2');
  assert.equal(getFieldInvestigationLabel([{ tag: '35', value: 'R' }], 1), '35=R');
  assert.equal(getFieldInvestigationLabel([{ tag: '270', value: '' }], 1), '270 exists');
  assert.equal(getFieldInvestigationLabel([{ tag: '35', value: 'R' }, { tag: '55', value: 'EUR' }], 1), '35=R +1');
});
