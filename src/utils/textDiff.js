// Bound Myers' search so unrelated or very large pastes cannot create a
// quadratic history. The fallback still preserves every character in order.
const SEARCH_BUDGET = 250000;

const backtrack = (history, left, right) => {
  const edits = [];
  let x = left.length;
  let y = right.length;

  for (let depth = history.length - 1; depth >= 0; depth -= 1) {
    const frontier = history[depth];
    const diagonal = x - y;
    const previousDiagonal = diagonal === -depth || (
      diagonal !== depth &&
      (frontier.get(diagonal - 1) ?? -Infinity) < (frontier.get(diagonal + 1) ?? -Infinity)
    ) ? diagonal + 1 : diagonal - 1;
    const previousX = frontier.get(previousDiagonal) ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      edits.push({ type: 'equal', value: left[--x] });
      y -= 1;
    }
    if (depth > 0) {
      if (x === previousX) edits.push({ type: 'added', value: right[--y] });
      else edits.push({ type: 'removed', value: left[--x] });
    }
  }
  return edits.reverse();
};

const diffMiddle = (left, right) => {
  if (!left.length) return right.map(value => ({ type: 'added', value }));
  if (!right.length) return left.map(value => ({ type: 'removed', value }));

  const frontier = new Map([[1, 0]]);
  const history = [];
  let work = 0;

  for (let depth = 0; depth <= left.length + right.length; depth += 1) {
    work += frontier.size;
    if (work > SEARCH_BUDGET) break;
    history.push(new Map(frontier));

    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      let x = diagonal === -depth || (
        diagonal !== depth &&
        (frontier.get(diagonal - 1) ?? -Infinity) < (frontier.get(diagonal + 1) ?? -Infinity)
      ) ? (frontier.get(diagonal + 1) ?? 0) : frontier.get(diagonal - 1) + 1;
      let y = x - diagonal;

      while (x < left.length && y < right.length && left[x] === right[y]) {
        x += 1;
        y += 1;
        work += 1;
      }
      frontier.set(diagonal, x);
      if (x >= left.length && y >= right.length) return backtrack(history, left, right);
    }
  }

  return [
    ...left.map(value => ({ type: 'removed', value })),
    ...right.map(value => ({ type: 'added', value })),
  ];
};

const diffSequence = (left, right) => {
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start += 1;
  let end = 0;
  while (
    end < left.length - start && end < right.length - start &&
    left[left.length - end - 1] === right[right.length - end - 1]
  ) end += 1;

  return [
    ...left.slice(0, start).map(value => ({ type: 'equal', value })),
    ...diffMiddle(left.slice(start, left.length - end), right.slice(start, right.length - end)),
    ...left.slice(left.length - end).map(value => ({ type: 'equal', value })),
  ];
};

const appendSegment = (segments, text, changed) => {
  const last = segments[segments.length - 1];
  if (last && last.changed === changed) last.text += text;
  else segments.push({ text, changed });
};

const inlineDiff = (left, right) => {
  const leftSegments = [];
  const rightSegments = [];
  for (const edit of diffSequence(Array.from(left), Array.from(right))) {
    if (edit.type !== 'added') appendSegment(leftSegments, edit.value, edit.type === 'removed');
    if (edit.type !== 'removed') appendSegment(rightSegments, edit.value, edit.type === 'added');
  }
  return [leftSegments, rightSegments];
};

// Normalize line endings only; retain spaces, tabs, field order, delimiters,
// duplicate fields, and the empty last line that represents a final newline.
const splitLines = text => text === '' ? [] : text.split(/\r\n|\n|\r/);

const lineSimilarity = (left, right) => {
  const sample = text => {
    const trimmed = text.trim();
    return trimmed.length > 512 ? trimmed.slice(0, 256) + trimmed.slice(-256) : trimmed;
  };
  const a = sample(left);
  const b = sample(right);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix += 1;
  return (prefix + suffix) / Math.max(a.length, b.length, 1);
};

// Prefer pairing similar replacement lines when a block also contains added
// or removed lines (e.g. a deleted log entry followed by a changed thread ID).
const alignReplacements = (removed, added) => {
  if (!removed.length || !added.length || removed.length * added.length > 10000) {
    return Array.from({ length: Math.max(removed.length, added.length) }, (_, index) => [removed[index] ?? null, added[index] ?? null]);
  }
  const width = added.length + 1;
  const costs = new Float64Array((removed.length + 1) * width);
  const steps = new Uint8Array(costs.length);
  for (let i = 1; i <= removed.length; i += 1) costs[i * width] = i;
  for (let j = 1; j <= added.length; j += 1) costs[j] = j;
  for (let i = 1; i <= removed.length; i += 1) {
    for (let j = 1; j <= added.length; j += 1) {
      const index = i * width + j;
      const pair = costs[index - width - 1] + 2 - lineSimilarity(removed[i - 1], added[j - 1]);
      const remove = costs[index - width] + 1;
      const add = costs[index - 1] + 1;
      costs[index] = Math.min(pair, remove, add);
      steps[index] = pair <= remove && pair <= add ? 0 : remove <= add ? 1 : 2;
    }
  }
  const pairs = [];
  let i = removed.length;
  let j = added.length;
  while (i || j) {
    const step = steps[i * width + j];
    if (i && j && step === 0) pairs.push([removed[--i], added[--j]]);
    else if (i && (!j || step === 1)) pairs.push([removed[--i], null]);
    else pairs.push([null, added[--j]]);
  }
  return pairs.reverse();
};

export const compareText = (left, right) => {
  const rows = [];
  const removed = [];
  const added = [];
  let leftLine = 0;
  let rightLine = 0;

  const flushChanges = () => {
    for (const [leftText, rightText] of alignReplacements(removed, added)) {
      const type = leftText === null ? 'added' : rightText === null ? 'removed' : 'changed';
      const [leftSegments, rightSegments] = type === 'changed'
        ? inlineDiff(leftText, rightText)
        : [leftText === null ? [] : [{ text: leftText, changed: true }], rightText === null ? [] : [{ text: rightText, changed: true }]];
      rows.push({
        type, leftText, rightText, leftSegments, rightSegments,
        leftLine: leftText === null ? null : ++leftLine,
        rightLine: rightText === null ? null : ++rightLine,
      });
    }
    removed.length = 0;
    added.length = 0;
  };

  for (const edit of diffSequence(splitLines(left), splitLines(right))) {
    if (edit.type === 'removed') removed.push(edit.value);
    else if (edit.type === 'added') added.push(edit.value);
    else {
      flushChanges();
      const segments = [{ text: edit.value, changed: false }];
      rows.push({
        type: 'equal', leftText: edit.value, rightText: edit.value,
        leftSegments: segments, rightSegments: segments,
        leftLine: ++leftLine, rightLine: ++rightLine,
      });
    }
  }
  flushChanges();

  return { rows };
};
