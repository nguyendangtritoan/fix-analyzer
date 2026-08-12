import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaryKeyFromBeginString, formatDictionaryLabel } from './dictionaryVersion.js';

test('maps FIX and IMIX BeginString values to bundled dictionary keys', () => {
  assert.equal(dictionaryKeyFromBeginString('FIX.4.4'), 'FIX44');
  assert.equal(dictionaryKeyFromBeginString('IMIX.2.0'), 'IMIX20');
  assert.equal(dictionaryKeyFromBeginString('IMIXT.1.0'), 'IMIXT10');
  assert.equal(dictionaryKeyFromBeginString('invalid'), null);
});

test('formats bundled dictionary keys as protocol versions', () => {
  assert.equal(formatDictionaryLabel('FIX44'), 'FIX 4.4');
  assert.equal(formatDictionaryLabel('IMIX20'), 'IMIX 2.0');
  assert.equal(formatDictionaryLabel('IMIXT10'), 'IMIXT 1.0');
});
