import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFixPairs } from './logAnalysis.js';
import { canCopyDatasetSelection, generateDatasetCopy } from './datasetExport.js';

const sourceText = [
  'ignored diagnostic line',
  'INFO outgoing session: 8=FIX.4.4::9=80::35=W::269=0::270=1.1::269=1::270=1.2::10=000::',
  'INFO incoming session: 8=FIX.4.4<FIELD>9=50<FIELD>35=D<FIELD>11=ORDER-1<FIELD>10=000<FIELD>',
].join('\n');

const firstStart = sourceText.indexOf('8=FIX.4.4');
const secondStart = sourceText.indexOf('8=FIX.4.4', firstStart + 1);
const firstLineStart = sourceText.lastIndexOf('\n', firstStart) + 1;
const secondLineStart = sourceText.lastIndexOf('\n', secondStart) + 1;
const ranges = [
  {
    start: firstStart,
    end: sourceText.indexOf('\n', firstStart),
    originalStart: firstLineStart,
    originalEnd: sourceText.indexOf('\n', firstStart),
    lineNumber: 2,
  },
  {
    start: secondStart,
    end: sourceText.length,
    originalStart: secondLineStart,
    originalEnd: sourceText.length,
    lineNumber: 3,
  },
];

const makeCopy = (format, options = {}) => generateDatasetCopy({
  format,
  sourceText,
  messageRanges: ranges,
  parsePairs: parseFixPairs,
  tags: { 8: 'BeginString', 9: 'BodyLength', 10: 'CheckSum', 11: 'ClOrdID', 35: 'MsgType', 269: 'MDEntryType', 270: 'MDEntryPx' },
  ...options,
});

test('whole-source copy requires pasted text while group copy also permits files', () => {
  assert.equal(canCopyDatasetSelection('text', false), true);
  assert.equal(canCopyDatasetSelection('text', true), true);
  assert.equal(canCopyDatasetSelection('file', false), false);
  assert.equal(canCopyDatasetSelection('file', true), true);
  assert.equal(canCopyDatasetSelection(null, true), false);
});

test('original dataset copy preserves the complete pasted input exactly', () => {
  assert.equal(makeCopy('original', { copyWholeSource: true }), sourceText);
});

test('original group copy contains only the selected source messages', () => {
  assert.equal(makeCopy('original', { messageRanges: [ranges[1]] }), sourceText.slice(secondLineStart));
  assert.match(makeCopy('original', { messageRanges: [ranges[1]] }), /^INFO incoming session:/);
  assert.equal(makeCopy('original', { messageRanges: [ranges[1]] }).includes('ignored diagnostic line'), false);
});

test('normalized dataset copies include every detected message and duplicate field', () => {
  const pipe = makeCopy('pipe');
  assert.match(pipe, /269=0\|270=1\.1\|269=1\|270=1\.2/);
  assert.match(pipe, /\n8=FIX\.4\.4\|9=50\|35=D\|11=ORDER-1/);
  assert.equal(pipe.includes('ignored diagnostic line'), false);

  const soh = makeCopy('soh');
  assert.equal(soh.includes('269=0\u0001270=1.1\u0001269=1'), true);
  assert.equal(soh.split('\n').length, 2);
});

test('pretty and JSON copies include field names and preserve duplicate tags', () => {
  const pretty = makeCopy('pretty');
  assert.match(pretty, /Message 1 · source line 2/);
  assert.match(pretty, /<270> MDEntryPx\s+= 1\.2/);

  const json = JSON.parse(makeCopy('json'));
  assert.equal(json.length, 2);
  assert.equal(json[0].fields.filter(field => field.tag === 269).length, 2);
  assert.deepEqual(json[1].fields.find(field => field.tag === 11), {
    tag: 11,
    name: 'ClOrdID',
    value: 'ORDER-1',
  });
});

test('rejects unknown dataset copy formats', () => {
  assert.throws(() => makeCopy('unknown'), /Unsupported dataset copy format/);
});
