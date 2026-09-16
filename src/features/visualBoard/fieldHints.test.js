import assert from 'node:assert/strict';
import test from 'node:test';
import { getTagHints } from './fieldHints.js';

const tags = { 11: 'ClOrdID', 35: 'MsgType', 55: 'Symbol', 270: 'MDEntryPx' };

test('suggests tags by number or field name', () => {
  assert.deepEqual(getTagHints(tags, '35'), [{ tag: '35', name: 'MsgType' }]);
  assert.deepEqual(getTagHints(tags, 'entry'), [{ tag: '270', name: 'MDEntryPx' }]);
});

test('prioritizes common fields for an empty hint query', () => {
  assert.deepEqual(getTagHints(tags, '').map(item => item.tag), ['35', '55', '11', '270']);
});

test('returns every current dataset tag including custom fields', () => {
  const currentTags = ['8', '9', '11', '35', '49', '52', '55', '56', '270', '9999'];
  const hints = getTagHints(tags, '', currentTags);

  assert.equal(hints.length, currentTags.length);
  assert.deepEqual(new Set(hints.map(item => item.tag)), new Set(currentTags));
  assert.deepEqual(hints.find(item => item.tag === '9999'), { tag: '9999', name: 'Tag 9999' });
});
