export const createDocumentScrollLock = (documentTarget, windowTarget) => {
  let lockDepth = 0;
  let originalState = null;

  const acquire = () => {
    if (lockDepth === 0) {
      originalState = {
        scrollX: windowTarget.scrollX,
        scrollY: windowTarget.scrollY,
        rootOverflow: documentTarget.documentElement.style.overflow,
        bodyOverflow: documentTarget.body.style.overflow,
        bodyPosition: documentTarget.body.style.position,
        bodyTop: documentTarget.body.style.top,
        bodyWidth: documentTarget.body.style.width,
      };

      documentTarget.documentElement.style.overflow = 'hidden';
      documentTarget.body.style.overflow = 'hidden';
      documentTarget.body.style.position = 'fixed';
      documentTarget.body.style.top = `-${originalState.scrollY}px`;
      documentTarget.body.style.width = '100%';
    }

    lockDepth += 1;
    let released = false;

    return () => {
      if (released) return;
      released = true;
      lockDepth = Math.max(0, lockDepth - 1);
      if (lockDepth > 0 || !originalState) return;

      const state = originalState;
      originalState = null;
      documentTarget.documentElement.style.overflow = state.rootOverflow;
      documentTarget.body.style.overflow = state.bodyOverflow;
      documentTarget.body.style.position = state.bodyPosition;
      documentTarget.body.style.top = state.bodyTop;
      documentTarget.body.style.width = state.bodyWidth;

      if (state.bodyPosition !== 'fixed') windowTarget.scrollTo(state.scrollX, state.scrollY);
    };
  };

  return {
    acquire,
    get depth() {
      return lockDepth;
    },
  };
};

let browserScrollLock;

export const lockDocumentScroll = () => {
  if (!browserScrollLock) browserScrollLock = createDocumentScrollLock(document, window);
  return browserScrollLock.acquire();
};
