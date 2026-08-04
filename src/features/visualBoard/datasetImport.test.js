import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDatasetCopy } from './datasetExport.js';
import { normalizeCopiedDatasetPaste } from './datasetImport.js';
import { analyzeLogText, parseFixPairs } from './logAnalysis.js';

const sourceText = [
  '8=FIX.4.4|9=80|35=D|49=CLIENT|56=VENUE|52=20260720-08:09:10.000|11=ROUNDTRIP-1|55=BTC/USD|10=000|',
  '8=FIX.4.4|9=90|35=8|49=VENUE|56=CLIENT|52=20260720-08:09:10.005|11=ROUNDTRIP-1|37=VENUE-1|10=000|',
].join('\n');

const secondStart = sourceText.indexOf('\n') + 1;
const messageRanges = [
  { start: 0, end: secondStart - 1, lineNumber: 1 },
  { start: secondStart, end: sourceText.length, lineNumber: 2 },
];

const copy = format => generateDatasetCopy({
  format,
  sourceText,
  messageRanges,
  parsePairs: parseFixPairs,
  tags: { 8: 'BeginString', 9: 'BodyLength', 10: 'CheckSum', 11: 'ClOrdID', 35: 'MsgType' },
});

test('leaves raw, pipe, and SOH-compatible pasted input untouched', () => {
  assert.deepEqual(normalizeCopiedDatasetPaste(sourceText), { text: sourceText, format: 'original' });
  assert.deepEqual(normalizeCopiedDatasetPaste(copy('pipe')), { text: copy('pipe'), format: 'original' });
  assert.deepEqual(normalizeCopiedDatasetPaste(copy('soh')), { text: copy('soh'), format: 'original' });
});

test('round-trips a copied pretty dataset into analyzable FIX messages', () => {
  const normalized = normalizeCopiedDatasetPaste(copy('pretty'));
  const result = analyzeLogText(normalized.text);

  assert.equal(normalized.format, 'pretty');
  assert.equal(result.summary.messageCount, 2);
  assert.deepEqual(result.summary.messageTypeCounts, { D: 1, 8: 1 });
  assert.equal(result.groups[0].messageCount, 2);
});

test('round-trips duplicate-preserving copied JSON', () => {
  const normalized = normalizeCopiedDatasetPaste(copy('json'));
  const result = analyzeLogText(normalized.text);

  assert.equal(normalized.format, 'json');
  assert.equal(result.summary.messageCount, 2);
  assert.equal(result.records[1].fields['37'], 'VENUE-1');
});

test('accepts a single bracketed message and Message Analyzer JSON object', () => {
  const bracketed = copy('pretty').split('\n\n')[0].split('\n').slice(1).join('\n');
  assert.equal(analyzeLogText(normalizeCopiedDatasetPaste(bracketed).text).summary.messageCount, 1);

  const objectJson = JSON.stringify({ 8: 'FIX.4.4', 35: 'D', 11: 'OBJECT-1', 10: '000' });
  assert.equal(analyzeLogText(normalizeCopiedDatasetPaste(objectJson).text).records[0].fields['11'], 'OBJECT-1');
});

test('does not reinterpret unrelated or malformed JSON-like text', () => {
  const invalid = '[not valid JSON]';
  const unrelated = JSON.stringify({ message: 'not a FIX export' });
  assert.deepEqual(normalizeCopiedDatasetPaste(invalid), { text: invalid, format: 'original' });
  assert.deepEqual(normalizeCopiedDatasetPaste(unrelated), { text: unrelated, format: 'original' });
});
