import assert from 'node:assert/strict';
import test from 'node:test';
import { compareText } from './textDiff.js';
import { buildTextDiffSections } from './textDiffFolding.js';

const expandSections = sections => sections.flatMap(section => section.type === 'row' ? [section.row] : section.rows);

test('folds long leading and trailing unchanged runs while preserving context and source rows', () => {
  const left = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`);
  const right = left.map((line, index) => index === 5 ? 'changed line' : line);
  const { rows } = compareText(left.join('\n'), right.join('\n'));
  const sections = buildTextDiffSections(rows);
  const folds = sections.filter(section => section.type === 'unchanged');
  assert.deepEqual(folds.map(section => section.rows.length), [3, 4]);
  assert.deepEqual(sections.filter(section => section.type === 'row').map(section => section.row.leftLine), [4, 5, 6, 7, 8]);
  assert.deepEqual(expandSections(sections), rows);
  folds.forEach(section => assert.ok(section.rows.every(row => row.type === 'equal')));
  assert.equal(sections.find(section => section.type === 'row' && section.row.type === 'changed')?.row, rows[5]);
});

test('retains context on both sides of a middle unchanged run', () => {
  const shared = Array.from({ length: 7 }, (_, index) => `context ${index}`).join('\n');
  const { rows } = compareText(`old start\n${shared}\nold end`, `new start\n${shared}\nnew end`);
  const sections = buildTextDiffSections(rows);
  const fold = sections.find(section => section.type === 'unchanged');
  assert.deepEqual(fold.rows.map(row => row.leftLine), [4, 5, 6]);
  assert.deepEqual(sections.filter(section => section.type === 'row').map(section => section.row.leftLine), [1, 2, 3, 7, 8, 9]);
  assert.deepEqual(expandSections(sections), rows);
});

test('keeps short unchanged runs visible and handles identical or empty text', () => {
  const shared = 'one\ntwo\nthree\nfour\nfive\nsix';
  const { rows } = compareText(`old\n${shared}\nend old`, `new\n${shared}\nend new`);
  assert.ok(buildTextDiffSections(rows).every(section => section.type === 'row'));
  assert.deepEqual(buildTextDiffSections([]), []);
  const identical = compareText('one\ntwo\nthree', 'one\ntwo\nthree').rows;
  const sections = buildTextDiffSections(identical);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].type, 'unchanged');
  assert.deepEqual(expandSections(sections), identical);
});

test('never folds added or removed lines, including empty lines', () => {
  for (const [left, right] of [['', 'new\n\ntext'], ['old\n\ntext', '']]) {
    const { rows } = compareText(left, right);
    const sections = buildTextDiffSections(rows);
    assert.ok(sections.every(section => section.type === 'row'));
    assert.deepEqual(expandSections(sections), rows);
  }
});

test('keeps changed log lines fully visible even with long shared fragments', () => {
  const requestPrefix = "request=RequestDto{requesterIndividual='SAMPLE.API', requesterCompany='SAMPLE', requesterLegalEntity='SAMPLE TR', clientRequestId=";
  const requestSuffix = ', baseCurrency=USD, quoteCurrency=CHF, allocations=[], effectiveDateSplit=null, effectivePeriodSplit=null, fxSecurityConversion=false, requestChannel=null}';
  const left = [
    'INFO [14:55:43.104] initiating request',
    'providers=[SampleBank]',
    requestPrefix + "'ORDER-ONE', action=Buy" + requestSuffix,
    'referenceId=1001', 'threadId=215', 'layer=App [LEFT]',
  ].join('\n');
  const right = [
    'INFO [14:53:32.274] initiating request',
    'AnyId=REQUEST-TWO providers=[SampleBank]',
    requestPrefix + "'ORDER-TWO', action=Sell" + requestSuffix,
    'referenceId=1002', 'threadId=149', 'layer=App [RIGHT]',
  ].join('\n');
  const { rows } = compareText(left, right);
  assert.equal(rows.length, 6);
  assert.ok(rows.every(row => row.type === 'changed'));
  assert.ok(buildTextDiffSections(rows).every(section => section.type === 'row'));
  for (const side of ['left', 'right']) {
    const text = expandSections(buildTextDiffSections(rows))
      .map(row => row[`${side}Segments`].map(segment => segment.text).join('')).join('\n');
    assert.equal(text, side === 'left' ? left : right);
  }
});
