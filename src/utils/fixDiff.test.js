import assert from 'node:assert/strict';
import test from 'node:test';
import { compareFixMessages } from './fixDiff.js';
import { parseFixMessage } from './parsers.js';
import { buildTextDiffSections } from './textDiffFolding.js';

const messages = (...values) => values.map((value, id) => ({ id, data: parseFixMessage(value) }));
const text = cell => cell.segments.map(segment => segment.text).join('');
const marked = cell => cell.segments.filter(segment => segment.changed).map(segment => segment.text).join('');

test('compares every message with the first and highlights only changed characters', () => {
  const input = messages('55=EUR/USD|38=100|', '55=EUR/CHF|38=1000|', '55=GBP/USD|38=100|');
  const original = structuredClone(input);
  const rows = compareFixMessages(input);
  assert.equal(rows[0].cells.length, 3);
  assert.deepEqual(rows[0].cells.map(text), ['EUR/USD', 'EUR/CHF', 'GBP/USD']);
  assert.deepEqual(rows[0].cells.map(marked), ['EURUSD', 'CHF', 'GBP']);
  assert.deepEqual(rows[1].cells.map(cell => cell.type), ['changed', 'changed', 'equal']);
  assert.equal(marked(rows[1].cells[1]), '0');
  assert.deepEqual(input, original);
});

test('inserts added fields near shared fields and uses blank cells for missing values', () => {
  const rows = compareFixMessages(messages('8=FIX.4.4|55=EUR/USD|54=1|10=000|', '8=FIX.4.4|15=EUR|55=EUR/USD|10=000|', '8=FIX.4.4|15=USD|55=EUR/USD|54=1|10=000|'));
  assert.deepEqual(rows.map(row => row.key), ['8', '15', '55', '54', '10']);
  assert.deepEqual(rows[1].cells.map(cell => cell.type), ['missing', 'added', 'added']);
  assert.deepEqual(rows[3].cells.map(cell => cell.type), ['removed', 'missing', 'equal']);
  assert.equal(rows[3].cells[1].item, null);
});

test('keeps nested additions under the correct instance even when instances are reordered', () => {
  const groups = {
    453: { delimiter: 448, fields: [448, 447, 452, 802] },
    802: { delimiter: 523, fields: [523, 803] },
  };
  const rows = compareFixMessages(messages(
    '8=FIX.4.4|453=2|448=A|447=D|448=B.DESK|447=D|10=000|',
    '8=FIX.4.4|453=3|448=B.DESK|447=D|802=1|523=PERSON.ONE|803=2|448=C|447=D|448=A|447=D|452=1|10=000|',
  ), groups);
  const keys = rows.map(row => row.key);
  const index = key => keys.indexOf(key);
  assert.ok(index('453[448=A].452') > index('453[448=A].447'));
  assert.ok(index('453[448=A].452') < index('453[448=B.DESK].$instance'));
  assert.ok(index('453[448=B.DESK].802[523=PERSON.ONE].803') > index('453[448=B.DESK].447'));
  assert.ok(index('453[448=B.DESK].802[523=PERSON.ONE].803') < index('10'));
  assert.equal(rows.find(row => row.key === '453[448=B.DESK].447').type, 'equal');
  assert.equal(rows.find(row => row.key === '453[448=B.DESK].802[523=PERSON.ONE].803').type, 'added');
  assert.equal(new Set(keys).size, keys.length);
});

test('distinguishes duplicate field and repeating-group identity occurrences', () => {
  const groups = { 453: { delimiter: 448, fields: [448, 452] } };
  const rows = compareFixMessages(messages('58=first|58=second|453=2|448=A|452=1|448=A|452=3|', '58=first|58=changed|453=2|448=A|452=1|448=A|452=4|'), groups);
  assert.equal(rows.find(row => row.key === '58').type, 'equal');
  assert.equal(rows.find(row => row.key === '58_2').type, 'changed');
  assert.equal(rows.find(row => row.key === '453[448=A].452').type, 'equal');
  assert.equal(rows.find(row => row.key === '453[448=A#2].452').type, 'changed');
});

test('matches parsed pipe, SOH, caret notation, and columnar messages regardless of formatting', () => {
  const rows = compareFixMessages(messages('8=FIX.4.4|35=D|55=USD/CHF|', '8=FIX.4.4\u000135=D\u000155=USD/CHF\u0001', '8=FIX.4.4^A35=D^A55=USD/CHF^A', 'BeginString     8     FIX.4.4\nMsgType     35     D\nSymbol     55     USD/CHF'));
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.type === 'equal'));
});

test('collapses only rows equal across every message and preserves Unicode values', () => {
  const base = Array.from({ length: 15 }, (_, index) => `${9000 + index}=same`).join('|');
  const rows = compareFixMessages(messages(base, base, base.replace('9007=same', '9007=東京 🧪 café')));
  const sections = buildTextDiffSections(rows);
  assert.ok(sections.some(section => section.type === 'unchanged'));
  const changed = sections.find(section => section.type === 'row' && section.row.key === '9007');
  assert.equal(text(changed.row.cells[2]), '東京 🧪 café');
  assert.deepEqual(sections.flatMap(section => section.type === 'row' ? [section.row] : section.rows), rows);
});

test('handles empty parsed messages and explicitly empty values without dropping fields', () => {
  assert.deepEqual(compareFixMessages([]), []);
  assert.deepEqual(compareFixMessages([{ data: [] }, { data: [] }]), []);
  const rows = compareFixMessages([{ data: [{ tag: 58, value: '' }] }, { data: [] }, { data: [{ tag: 58, value: 'note' }] }]);
  assert.equal(rows.length, 1);
  assert.equal(text(rows[0].cells[0]), '');
  assert.equal(rows[0].cells[1].item, null);
  assert.equal(text(rows[0].cells[2]), 'note');
});
