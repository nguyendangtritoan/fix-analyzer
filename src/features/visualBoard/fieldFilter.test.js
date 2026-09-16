import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFieldFilter,
  hasFieldWildcard,
  matchesFieldFilters,
  matchesFieldValue,
} from './fieldFilter.js';

test('creates numeric field filters and rejects invalid tags', () => {
  assert.deepEqual(createFieldFilter('055', ' EUR/USD '), { tag: '55', value: 'EUR/USD' });
  assert.deepEqual(createFieldFilter('270', ''), { tag: '270', value: '' });
  assert.equal(createFieldFilter('symbol', 'EUR/USD'), null);
  assert.equal(createFieldFilter('0', 'value'), null);
});

test('matches every filter using case-insensitive repeated field values', () => {
  const values = {
    55: ['EUR/USD'],
    270: ['1.1501', '1.1502'],
    271: ['1000000'],
  };

  assert.equal(matchesFieldFilters(values, [
    { tag: '55', value: 'eur/usd' },
    { tag: '270', value: '1502' },
  ]), true);
  assert.equal(matchesFieldFilters(values, [{ tag: '271', value: '' }]), true);
  assert.equal(matchesFieldFilters(values, [{ tag: '270', value: '9.99' }]), false);
  assert.equal(matchesFieldFilters(values, [{ tag: '999', value: '' }]), false);
});

test('matches asterisks as case-insensitive full-value wildcards', () => {
  assert.equal(hasFieldWildcard('USD/*'), true);
  assert.equal(hasFieldWildcard('USD/EUR'), false);
  assert.equal(matchesFieldValue('USD/EUR', 'USD/*'), true);
  assert.equal(matchesFieldValue('usd/jpy', 'USD/*'), true);
  assert.equal(matchesFieldValue('EUR/USD', 'USD/*'), false);
  assert.equal(matchesFieldValue('EUR/USD', '*/USD'), true);
  assert.equal(matchesFieldValue('EUR/USD-SPOT', '*/USD*'), true);
  assert.equal(matchesFieldValue('anything', '*'), true);
  assert.equal(matchesFieldValue('', '*'), true);
  assert.equal(matchesFieldValue('USD/EUR', 'USD/**'), true);
});

test('preserves substring matching when no wildcard is present', () => {
  assert.equal(matchesFieldValue('EUR/USD', 'eur'), true);
  assert.equal(matchesFieldValue('EUR/USD', 'USD'), true);
  assert.equal(matchesFieldValue('EUR/USD', 'GBP'), false);
});
