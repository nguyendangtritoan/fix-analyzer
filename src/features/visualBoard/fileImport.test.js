import assert from 'node:assert/strict';
import test from 'node:test';
import { combineLocalLogFiles, prepareLocalLogFiles } from './fileImport.js';

const makeFile = (name, size, type = 'text/plain', lastModified = 0) => ({
  name,
  size,
  type,
  lastModified,
});

test('prepares multiple local logs in natural filename order', () => {
  const result = prepareLocalLogFiles([
    makeFile('fixmessage.log.10', 30),
    makeFile('fixmessage.log.2', 20),
    makeFile('fixmessage.log.1', 10),
  ]);

  assert.equal(result.error, null);
  assert.deepEqual(result.files.map(file => file.name), [
    'fixmessage.log.1',
    'fixmessage.log.2',
    'fixmessage.log.10',
  ]);
  assert.equal(result.totalBytes, 60);
  assert.equal(result.sourceName, '3 local files');
});

test('accepts one file and keeps its filename as the source name', () => {
  const file = makeFile('orders.fix', 42);
  const result = prepareLocalLogFiles([file]);

  assert.deepEqual(result.files, [file]);
  assert.equal(result.sourceName, 'orders.fix');
});

test('rejects the complete selection when any file is compressed or unsupported', () => {
  assert.match(
    prepareLocalLogFiles([makeFile('one.log', 10), makeFile('two.log.gz', 10, 'application/gzip')]).error,
    /two\.log\.gz.*compressed/i,
  );
  assert.match(
    prepareLocalLogFiles([makeFile('one.log', 10), makeFile('image.png', 10, 'image/png')]).error,
    /image\.png.*uncompressed.*text/i,
  );
});

test('does not impose a fixed byte limit on the combined selection', () => {
  const oneGiB = 1024 * 1024 * 1024;
  const result = prepareLocalLogFiles([
    makeFile('part-1.log', oneGiB),
    makeFile('part-2.log', oneGiB),
  ]);

  assert.equal(result.error, null);
  assert.equal(result.files.length, 2);
  assert.equal(result.totalBytes, 2 * oneGiB);
});

test('ignores empty selections without reporting an error', () => {
  assert.deepEqual(prepareLocalLogFiles(null), {
    files: [],
    totalBytes: 0,
    sourceName: null,
    error: null,
  });
});

test('combines files with an explicit line boundary', async () => {
  const combined = await combineLocalLogFiles([
    new Blob(['first line']),
    new Blob(['second line\n']),
    new Blob(['third line']),
  ]);

  assert.equal(combined, 'first line\nsecond line\n\nthird line');
});
