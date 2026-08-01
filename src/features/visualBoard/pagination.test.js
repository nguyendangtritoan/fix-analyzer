import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateItems } from './pagination.js';

test('paginates group collections and clamps invalid page requests', () => {
  const groups = Array.from({ length: 57 }, (_, index) => ({ id: index + 1 }));

  const first = paginateItems(groups, 1, 25);
  assert.equal(first.items.length, 25);
  assert.deepEqual([first.start, first.end, first.page, first.pageCount], [1, 25, 1, 3]);

  const last = paginateItems(groups, 99, 25);
  assert.equal(last.items.length, 7);
  assert.deepEqual([last.start, last.end, last.page, last.pageCount], [51, 57, 3, 3]);
});

test('returns stable empty pagination metadata', () => {
  const page = paginateItems([], 4, 10);
  assert.deepEqual(page, { items: [], page: 1, pageCount: 1, start: 0, end: 0 });
});
