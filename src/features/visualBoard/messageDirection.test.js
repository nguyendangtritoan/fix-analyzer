import assert from 'node:assert/strict';
import test from 'node:test';
import { getMessagePathDisplay } from './messageDirection.js';

test('shows outgoing messages from left to right', () => {
  assert.deepEqual(
    getMessagePathDisplay({ direction: 'outgoing', from: 'LOCAL', to: 'VENUE' }),
    { left: 'LOCAL', right: 'VENUE', arrowDirection: 'right' },
  );
});

test('keeps counterparties stable and points incoming messages from right to left', () => {
  assert.deepEqual(
    getMessagePathDisplay({ direction: 'incoming', from: 'VENUE', to: 'LOCAL' }),
    { left: 'LOCAL', right: 'VENUE', arrowDirection: 'left' },
  );
});

test('keeps unknown directions in their parsed order', () => {
  assert.deepEqual(
    getMessagePathDisplay({ direction: 'unknown', from: 'SENDER', to: 'TARGET' }),
    { left: 'SENDER', right: 'TARGET', arrowDirection: 'right' },
  );
});
