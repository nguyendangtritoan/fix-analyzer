import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeFixDictionaries } from './dictionaryMerge.js';

test('combines application and transport dictionary definitions', () => {
  const application = {
    tags: { 35: 'MsgType', 270: 'MDEntryPx' },
    enums: { 35: { W: 'Snapshot' }, 269: { 0: 'Bid' } },
    groups: { _global: { 268: { delimiter: 269 } }, W: { 268: { delimiter: 269 } } },
    fieldTypes: { 270: 'PRICE' },
    messageNames: { W: 'MarketDataSnapshotFullRefresh' },
  };
  const transport = {
    tags: { 8: 'BeginString', 35: 'MsgType' },
    enums: { 35: { A: 'Logon' } },
    groups: { _global: { 384: { delimiter: 372 } }, A: {} },
    fieldTypes: { 8: 'STRING' },
    messageNames: { A: 'Logon' },
  };

  const merged = mergeFixDictionaries(application, transport);
  assert.equal(merged.tags[270], 'MDEntryPx');
  assert.deepEqual(merged.enums[35], { W: 'Snapshot', A: 'Logon' });
  assert.ok(merged.groups.W[268]);
  assert.ok(merged.groups._global[268]);
  assert.ok(merged.groups._global[384]);
  assert.equal(merged.messageNames.W, 'MarketDataSnapshotFullRefresh');
  assert.equal(merged.messageNames.A, 'Logon');
});
