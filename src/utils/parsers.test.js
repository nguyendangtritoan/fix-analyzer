import assert from 'node:assert/strict';
import test from 'node:test';
import { flattenForDiff, groupify, parseFixMessage } from './parsers.js';

const partyGroup = {
  453: { delimiter: 448, fields: [448, 447, 452, 802] },
  802: { delimiter: 523, fields: [523, 803] },
};

const groups = {
  _global: partyGroup,
  8: partyGroup,
};

const leftMessage = [
  'BeginString                   8       FIX.4.4',
  "MsgType                       35      EXECUTIONREPORT ['8']",
  'NoPartyIDs                    453     8',
  'PartyID                       448     PLATFORM',
  "PartyIDSource                 447     MIC ['G']",
  "PartyRole                     452     TRADING_FACILITY ['64']",
  'PartyID                       448     TRADER.ONE',
  "PartyIDSource                 447     SHORT_CODE ['P']",
  "PartyRole                     452     DECISION_MAKER ['122']",
  "2376                          2376    NATURAL_HUMAN ['24']",
  'PartyID                       448     TRADER.ONE',
  "PartyIDSource                 447     SHORT_CODE ['P']",
  "PartyRole                     452     EXECUTING_TRADER ['12']",
  "2376                          2376    NATURAL_HUMAN ['24']",
  'PartyID                       448     CLIENT DESK',
  "PartyIDSource                 447     PROPRIETARY_CUSTOM_CODE ['D']",
  "PartyRole                     452     EXECUTING_FIRM ['1']",
  'NoPartySubIDs                 802     1',
  'PartySubID                    523     TRADER.ONE',
  "PartySubIDType                803     PERSON ['2']",
  'PartyID                       448     CLIENT-LEI',
  "PartyIDSource                 447     LEI ['N']",
  "PartyRole                     452     EXECUTING_FIRM ['1']",
  'PartyID                       448     DEALER',
  "PartyIDSource                 447     PROPRIETARY_CUSTOM_CODE ['D']",
  "PartyRole                     452     LIQUIDITY_PROVIDER ['35']",
  'NoPartySubIDs                 802     1',
  'PartySubID                    523     DEALER.AutoDealer',
  "PartySubIDType                803     PERSON ['2']",
  'PartyID                       448     DEALER-LEI',
  "PartyIDSource                 447     LEI ['N']",
  "PartyRole                     452     LIQUIDITY_PROVIDER ['35']",
  'PartyID                       448     CLIENT BANK',
  "PartyIDSource                 447     PROPRIETARY_CUSTOM_CODE ['D']",
  "PartyRole                     452     INTERESTED_PARTY ['33']",
].join('\n');

const rightMessage = [
  'BeginString                   8       FIX.4.4',
  'MsgType                       35      8',
  'NoPartyIDs                    453     3',
  'PartyID                       448     CLIENT BANK',
  'PartyIDSource                 447     D',
  'PartyRole                     452     1',
  'NoPartySubIDs                 802     1',
  'PartySubID                    523     RAJHI.AlHodaithy',
  'PartySubIDType                803     2',
  'PartyID                       448     DEALER',
  'PartyIDSource                 447     D',
  'PartyRole                     452     35',
  'NoPartySubIDs                 802     1',
  'PartySubID                    523     DEALER.AutoDealer',
  'PartySubIDType                803     2',
  'PartyID                       448     DEALER',
  'PartyIDSource                 447     D',
  'PartyRole                     452     33',
].join('\n');

const keyFor = (flat, tag, value) => flat.find(item => item.tag === tag && item.value === value)?.key;

test('normalizes decorated enum codes from columnar comparator input', () => {
  const parsed = parseFixMessage(leftMessage);
  assert.equal(parsed.find(pair => pair.tag === 35)?.value, '8');
  assert.equal(parsed.some(pair => pair.tag === 447 && pair.value === 'D'), true);
  assert.equal(parsed.some(pair => pair.tag === 452 && pair.value === '1'), true);
  assert.equal(parsed.some(pair => pair.value.includes("['")), false);
});

test('aligns reordered repeating-group instances by their delimiter identity', () => {
  const leftTree = groupify(parseFixMessage(leftMessage), groups);
  const rightTree = groupify(parseFixMessage(rightMessage), groups);
  const leftFlat = flattenForDiff(leftTree);
  const rightFlat = flattenForDiff(rightTree);

  assert.equal(leftTree.find(node => node.tag === 453)?.instances.length, 8);
  assert.equal(rightTree.find(node => node.tag === 453)?.instances.length, 3);
  assert.equal(new Set(leftFlat.map(item => item.key)).size, leftFlat.length);
  assert.equal(new Set(rightFlat.map(item => item.key)).size, rightFlat.length);

  assert.equal(keyFor(leftFlat, 448, 'CLIENT BANK'), keyFor(rightFlat, 448, 'CLIENT BANK'));
  assert.equal(keyFor(leftFlat, 448, 'DEALER'), keyFor(rightFlat, 448, 'DEALER'));
  assert.equal(keyFor(leftFlat, 523, 'DEALER.AutoDealer'), keyFor(rightFlat, 523, 'DEALER.AutoDealer'));

  const leftDealerHeader = leftFlat.find(item => item.isInstanceHeader && item.value === 'DEALER');
  const rightDealerHeader = rightFlat.find(item => item.isInstanceHeader && item.value === 'DEALER');
  const secondRightDealerHeader = rightFlat.find(item => item.isInstanceHeader && item.value === 'DEALER (occurrence 2)');
  assert.equal(leftDealerHeader?.key, rightDealerHeader?.key);
  assert.ok(secondRightDealerHeader?.key.endsWith('448=DEALER#2].$instance'));
});
