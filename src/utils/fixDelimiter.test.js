import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFixPairs } from '../features/visualBoard/logAnalysis.js';
import { parseFixMessage } from './parsers.js';
import { detectFixDelimiter, SOH, splitFixTokens } from './fixDelimiter.js';

const fields = [
  ['8', 'FIX.4.4'],
  ['9', '128'],
  ['35', 'D'],
  ['58', 'desk | alpha; beta = gamma'],
  ['11', 'ORDER-1'],
  ['55', 'EUR/USD'],
  ['10', '999'],
];

const expectedPairs = fields.map(([tag, value]) => ({ tag: Number(tag), value }));

const delimiters = [
  ['SOH', SOH],
  ['caret notation', '^A'],
  ['pipe', '|'],
  ['semicolon', ';'],
  ['comma', ','],
  ['tab', '\t'],
  ['tilde', '~'],
  ['slash also present inside a value', '/'],
  ['regular-expression metacharacters', '.*'],
  ['multi-character punctuation', '::'],
  ['text marker', '<SOH>'],
  ['escaped control marker', '\\x01'],
  ['Unicode marker', '§'],
  ['equals sign', '='],
  ['numeric marker', '123'],
];

test('auto-detects consistent FIX delimiters in both application parsers', async t => {
  for (const [name, delimiter] of delimiters) {
    await t.test(name, () => {
      const raw = fields.map(([tag, value]) => `${tag}=${value}`).join(delimiter) + delimiter;
      assert.equal(detectFixDelimiter(raw), delimiter);
      assert.deepEqual(parseFixPairs(raw), expectedPairs);
      assert.deepEqual(parseFixMessage(raw), expectedPairs);
    });
  }
});

test('preserves spaces and delimiter-like punctuation inside values', () => {
  const raw = '8=FIX.4.4::9=80::35=D::58=price | moved; still = valid::11=ORDER-2::10=000::';
  assert.deepEqual(splitFixTokens(raw), {
    delimiter: '::',
    tokens: [
      '8=FIX.4.4',
      '9=80',
      '35=D',
      '58=price | moved; still = valid',
      '11=ORDER-2',
      '10=000',
    ],
  });
});

test('infers repeated punctuation delimiters when BeginString is absent', () => {
  const raw = '35=D#11=ORDER-3#55=BTC/USD#54=1#';
  assert.equal(detectFixDelimiter(raw), '#');
  assert.deepEqual(parseFixPairs(raw), [
    { tag: 35, value: 'D' },
    { tag: 11, value: 'ORDER-3' },
    { tag: 55, value: 'BTC/USD' },
    { tag: 54, value: '1' },
  ]);
});
