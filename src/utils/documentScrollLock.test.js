import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentScrollLock } from './documentScrollLock.js';

const createBrowserDouble = () => {
  const rootStyle = { overflow: 'auto' };
  const bodyStyle = {
    overflow: 'visible',
    position: 'relative',
    top: '12px',
    width: '80%',
  };
  const scrollCalls = [];

  return {
    document: {
      documentElement: { style: rootStyle },
      body: { style: bodyStyle },
    },
    window: {
      scrollX: 25,
      scrollY: 640,
      scrollTo: (...coordinates) => scrollCalls.push(coordinates),
    },
    rootStyle,
    bodyStyle,
    scrollCalls,
  };
};

test('nested overlays keep the document locked until the final overlay closes', () => {
  const browser = createBrowserDouble();
  const scrollLock = createDocumentScrollLock(browser.document, browser.window);

  const releaseFullscreen = scrollLock.acquire();
  const releaseDrawer = scrollLock.acquire();

  assert.deepEqual(browser.rootStyle, { overflow: 'hidden' });
  assert.deepEqual(browser.bodyStyle, {
    overflow: 'hidden',
    position: 'fixed',
    top: '-640px',
    width: '100%',
  });

  releaseDrawer();

  assert.equal(scrollLock.depth, 1);
  assert.equal(browser.bodyStyle.position, 'fixed');
  assert.equal(browser.scrollCalls.length, 0);

  releaseFullscreen();

  assert.equal(scrollLock.depth, 0);
  assert.deepEqual(browser.rootStyle, { overflow: 'auto' });
  assert.deepEqual(browser.bodyStyle, {
    overflow: 'visible',
    position: 'relative',
    top: '12px',
    width: '80%',
  });
  assert.deepEqual(browser.scrollCalls, [[25, 640]]);
});

test('releasing the same lock twice is harmless', () => {
  const browser = createBrowserDouble();
  const scrollLock = createDocumentScrollLock(browser.document, browser.window);
  const release = scrollLock.acquire();

  release();
  release();

  assert.equal(scrollLock.depth, 0);
  assert.deepEqual(browser.scrollCalls, [[25, 640]]);
});
