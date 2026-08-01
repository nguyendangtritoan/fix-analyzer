import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeLogText,
  extractTagValue,
  parseFixPairs,
  parseFixTimestamp,
  parseLogTimestamp,
} from './logAnalysis.js';

const SOH = '\u0001';

const makeFix = fields => {
  const body = fields.map(([tag, value]) => `${tag}=${value}`).join(SOH) + SOH;
  const prefix = `8=FIX.4.4${SOH}9=${new TextEncoder().encode(body).length}${SOH}`;
  const checksumInput = new TextEncoder().encode(prefix + body);
  let checksum = 0;
  for (const byte of checksumInput) checksum = (checksum + byte) % 256;
  return `${prefix}${body}10=${String(checksum).padStart(3, '0')}${SOH}`;
};

const line = (timestamp, direction, session, raw) => (
  ` INFO [${timestamp}] ${direction} ${session}: ${raw}`
);

test('parses log and FIX timestamps as UTC milliseconds', () => {
  assert.equal(parseLogTimestamp('20.07.26 08:08:53.705'), Date.UTC(2026, 6, 20, 8, 8, 53, 705));
  assert.equal(parseFixTimestamp('20260720-08:08:53.712'), Date.UTC(2026, 6, 20, 8, 8, 53, 712));
  assert.equal(parseLogTimestamp('invalid'), null);
});

test('preserves duplicate FIX fields and finds an arbitrary tag', () => {
  const raw = `8=FIX.4.4${SOH}35=W${SOH}269=0${SOH}270=1.1${SOH}269=1${SOH}270=1.2${SOH}`;
  assert.deepEqual(parseFixPairs(raw).filter(pair => pair.tag === 269), [
    { tag: 269, value: '0' },
    { tag: 269, value: '1' },
  ]);
  assert.equal(extractTagValue(raw, 270), '1.1');
});

test('builds explainable order and market-data groups with distinct latency semantics', () => {
  const execSession = 'FIX.4.4:CLIENT->VENUE:ExecSession';
  const quoteSession = 'FIX.4.4:CLIENT->VENUE:QuoteSession';
  const order = makeFix([
    ['35', 'D'], ['34', '1'], ['49', 'CLIENT'], ['52', '20260720-08:08:53.705'], ['56', 'VENUE'],
    ['11', 'SO-1'], ['55', 'BTC/USD'], ['54', '1'], ['38', '10'], ['44', '100.5'],
  ]);
  const execution = makeFix([
    ['35', '8'], ['34', '1'], ['49', 'VENUE'], ['52', '20260720-08:08:53.712'], ['56', 'CLIENT'],
    ['11', 'SO-1'], ['37', 'ORDER-1'], ['55', 'BTC/USD'], ['39', '8'], ['58', 'Rejected'],
  ]);
  const request = makeFix([
    ['35', 'V'], ['34', '1'], ['49', 'CLIENT'], ['52', '20260720-08:08:53.720'], ['56', 'VENUE'],
    ['262', 'MD-1'], ['55', 'ETH/USD'],
  ]);
  const snapshot = makeFix([
    ['35', 'W'], ['34', '1'], ['49', 'VENUE'], ['52', '20260720-08:08:53.725'], ['56', 'CLIENT'],
    ['262', 'MD-1'], ['55', 'ETH/USD'], ['268', '2'],
    ['269', '0'], ['270', '2000.1'], ['271', '5'], ['290', '1'],
    ['269', '1'], ['270', '2000.4'], ['271', '6'], ['290', '1'],
  ]);

  const text = [
    line('20.07.26 08:08:53.705', 'outgoing', execSession, order),
    line('20.07.26 08:08:53.717', 'incoming', execSession, execution),
    line('20.07.26 08:08:53.720', 'outgoing', quoteSession, request),
    line('20.07.26 08:08:53.730', 'incoming', quoteSession, snapshot),
  ].join('\n');

  const result = analyzeLogText(text);
  assert.equal(result.summary.messageCount, 4);
  assert.deepEqual(result.summary.messageTypeCounts, { D: 1, 8: 1, V: 1, W: 1 });
  assert.equal(result.groups.filter(group => group.type === 'order').length, 1);
  assert.equal(result.groups.filter(group => group.type === 'market-data').length, 1);
  assert.equal(result.latency.roundTrips[0].durationMs, 12);
  assert.equal(result.records.find(record => record.messageType === '8').captureLagMs, 5);
  assert.equal(result.orders[0].status, 'Rejected');
  assert.equal(result.orders[0].roundTripMs, 12);
  assert.equal(result.prices[0].bidPrice, '2000.1');
  assert.equal(result.prices[0].offerPrice, '2000.4');
  assert.equal(result.prices[0].spread, 0.3000000000001819);
  assert.equal(result.diagnostics.sequenceGaps.length, 0);
  assert.equal(result.diagnostics.warningCounts['checksum-mismatch'], undefined);
  assert.equal(result.diagnostics.warningCounts['body-length-mismatch'], undefined);
});

test('does not group common business values without correlation identifiers', () => {
  const first = makeFix([
    ['35', 'W'], ['49', 'VENUE'], ['52', '20260720-08:00:00.000'], ['56', 'CLIENT'], ['55', 'BTC/USD'],
  ]);
  const second = makeFix([
    ['35', 'W'], ['49', 'VENUE'], ['52', '20260720-08:00:01.000'], ['56', 'CLIENT'], ['55', 'BTC/USD'],
  ]);
  const result = analyzeLogText(`${first}\n${second}`);
  assert.equal(result.groups.length, 0);
  assert.equal(result.diagnostics.ungroupedMessageCount, 2);
});

test('reports skipped non-FIX lines without retaining their contents', () => {
  const result = analyzeLogText('System STARTUP\nnot a FIX message');
  assert.equal(result.summary.messageCount, 0);
  assert.equal(result.diagnostics.skippedLineCount, 2);
});

test('joins an RFQ-to-order lifecycle only through explicit bridge messages', () => {
  const quoteSession = 'FIX.4.4:CLIENT->VENUE:QuoteSession';
  const orderSession = 'FIX.4.4:CLIENT->VENUE:OrderSession';
  const request = makeFix([['35', 'R'], ['49', 'CLIENT'], ['52', '20260720-08:00:00.000'], ['56', 'VENUE'], ['131', 'RFQ-1'], ['55', 'EUR/USD']]);
  const quote = makeFix([['35', 'S'], ['49', 'VENUE'], ['52', '20260720-08:00:00.010'], ['56', 'CLIENT'], ['131', 'RFQ-1'], ['117', 'QUOTE-1'], ['55', 'EUR/USD']]);
  const order = makeFix([['35', 'D'], ['49', 'CLIENT'], ['52', '20260720-08:00:00.020'], ['56', 'VENUE'], ['11', 'ORDER-1'], ['117', 'QUOTE-1'], ['55', 'EUR/USD']]);
  const execution = makeFix([['35', '8'], ['49', 'VENUE'], ['52', '20260720-08:00:00.030'], ['56', 'CLIENT'], ['11', 'ORDER-1'], ['37', 'VENUE-1'], ['39', '2'], ['55', 'EUR/USD']]);
  const result = analyzeLogText([
    line('20.07.26 08:00:00.000', 'outgoing', quoteSession, request),
    line('20.07.26 08:00:00.015', 'incoming', quoteSession, quote),
    line('20.07.26 08:00:00.020', 'outgoing', orderSession, order),
    line('20.07.26 08:00:00.035', 'incoming', orderSession, execution),
  ].join('\n'));

  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].type, 'rfq-order');
  assert.equal(result.groups[0].messageCount, 4);
  assert.equal(result.groups[0].sessionCount, 2);
});

test('keeps identical market-data request IDs separate across sessions', () => {
  const snapshotA = makeFix([['35', 'W'], ['49', 'A'], ['52', '20260720-08:00:00.000'], ['56', 'CLIENT'], ['262', 'REUSED'], ['55', 'BTC/USD']]);
  const snapshotB = makeFix([['35', 'W'], ['49', 'B'], ['52', '20260720-08:00:00.001'], ['56', 'CLIENT'], ['262', 'REUSED'], ['55', 'BTC/USD']]);
  const result = analyzeLogText([
    line('20.07.26 08:00:00.005', 'incoming', 'FIX.4.4:A->CLIENT:SessionA', snapshotA),
    line('20.07.26 08:00:00.006', 'incoming', 'FIX.4.4:B->CLIENT:SessionB', snapshotB),
  ].join('\n'));
  assert.equal(result.groups.length, 2);
  assert.ok(result.groups.every(group => group.type === 'market-data'));
});

test('reports sequence gaps and invalid envelope checks without exposing raw lines', () => {
  const valid = makeFix([['35', '0'], ['34', '1'], ['49', 'A'], ['52', '20260720-08:00:00.000'], ['56', 'B']]);
  const gap = makeFix([['35', '0'], ['34', '3'], ['49', 'A'], ['52', '20260720-08:00:00.001'], ['56', 'B']]);
  const invalid = gap.replace(/10=\d{3}/, '10=999').replace(/9=\d+/, '9=1');
  const result = analyzeLogText(`${valid}\n${invalid}`);
  assert.equal(result.diagnostics.sequenceGaps.length, 1);
  assert.equal(result.diagnostics.warningCounts['body-length-mismatch'], 1);
  assert.equal(result.diagnostics.warningCounts['checksum-mismatch'], 1);
  assert.equal('raw' in result.records[0], false);
});
