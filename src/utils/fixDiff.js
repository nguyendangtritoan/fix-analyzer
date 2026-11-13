import { flattenForDiff, groupify } from './parsers.js';
import { compareTextCharacters } from './textDiff.js';

// Keep reference order. Insert new sibling fields/instances beside their next
// shared sibling, so additions stay inside their own repeating group.
const mergeSiblingOrder = (existing, incoming) => {
  const known = new Set(existing);
  const before = new Map();
  let pending = [];
  for (const key of incoming) {
    if (known.has(key)) {
      if (pending.length) before.set(key, pending);
      pending = [];
    } else pending.push(key);
  }
  return existing.flatMap(key => [...(before.get(key) || []), key]).concat(pending);
};

const mergeFieldOrder = lists => {
  const children = new Map();
  for (const list of lists) {
    const siblings = new Map();
    for (const item of list) {
      if (!siblings.has(item.parentKey)) siblings.set(item.parentKey, []);
      siblings.get(item.parentKey).push(item.key);
    }
    for (const [parent, keys] of siblings) {
      children.set(parent, mergeSiblingOrder(children.get(parent) || [], keys));
    }
  }
  const order = [];
  const visit = parent => {
    for (const key of children.get(parent) || []) {
      order.push(key);
      visit(key);
    }
  };
  visit(null);
  return order;
};

const fullSegments = (value, changed) => [{ text: String(value), changed }];

const referenceSegments = (value, comparisons) => {
  const characters = Array.from(value);
  const changed = new Set();
  for (const segments of comparisons) {
    let index = 0;
    for (const segment of segments) {
      const length = Array.from(segment.text).length;
      for (let offset = 0; offset < length; offset += 1) {
        if (segment.changed) changed.add(index);
        index += 1;
      }
    }
  }
  const segments = [];
  characters.forEach((text, index) => {
    const isChanged = changed.has(index);
    const previous = segments[segments.length - 1];
    if (previous?.changed === isChanged) previous.text += text;
    else segments.push({ text, changed: isChanged });
  });
  return segments;
};

export const compareFixMessages = (messages, groups = {}) => {
  const lists = messages.map(message => flattenForDiff(groupify(message.data, groups)));
  const maps = lists.map(list => new Map(list.map(item => [item.key, item])));

  return mergeFieldOrder(lists).map(key => {
    const items = maps.map(map => map.get(key) ?? null);
    const reference = items[0];
    const leftEdits = [];
    const others = items.slice(1).map(item => {
      if (!item) return { item, type: 'missing', segments: [] };
      if (!reference) return { item, type: 'added', segments: fullSegments(item.value, true) };
      if (item.value === reference.value) return { item, type: 'equal', segments: fullSegments(item.value, false) };
      const [left, right] = compareTextCharacters(String(reference.value), String(item.value));
      leftEdits.push(left);
      return { item, type: 'changed', segments: right };
    });
    const changed = others.some(cell => cell.type === 'changed');
    const removed = others.some(cell => cell.type === 'missing');
    const type = !reference ? 'added' : changed ? 'changed' : removed ? 'removed' : 'equal';
    const first = {
      item: reference,
      type: reference ? type : 'missing',
      segments: !reference ? [] : changed
        ? referenceSegments(String(reference.value), leftEdits)
        : fullSegments(reference.value, removed),
    };
    return { key, type, cells: [first, ...others] };
  });
};
