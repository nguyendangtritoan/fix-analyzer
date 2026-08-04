import { SOH } from '../../utils/fixDelimiter.js';

const serializePairs = pairs => `${pairs.map(pair => `${pair.tag}=${pair.value}`).join(SOH)}${SOH}`;

const normalizeFieldArray = fields => {
  if (!Array.isArray(fields) || !fields.length) return null;

  const pairs = [];
  for (const field of fields) {
    if (!field || typeof field !== 'object') return null;
    const tag = String(field.tag ?? '');
    if (!/^\d+$/.test(tag) || field.value === undefined || field.value === null) return null;
    if (!['string', 'number', 'boolean'].includes(typeof field.value)) return null;
    pairs.push({ tag, value: String(field.value) });
  }

  return pairs.some(pair => pair.tag === '8' && pair.value.startsWith('FIX.')) ? pairs : null;
};

const normalizeJsonPaste = source => {
  const trimmed = source.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  let messages;
  if (Array.isArray(parsed)) {
    messages = parsed;
  } else if (Array.isArray(parsed?.fields)) {
    messages = [parsed];
  } else if (parsed && typeof parsed === 'object' && Object.keys(parsed).every(tag => /^\d+$/.test(tag))) {
    messages = [{ fields: Object.entries(parsed).map(([tag, value]) => ({ tag, value })) }];
  } else {
    return null;
  }

  if (!messages.length) return null;
  const normalized = messages.map(message => normalizeFieldArray(message?.fields));
  if (normalized.some(pairs => !pairs)) return null;
  return normalized.map(serializePairs).join('\n');
};

const normalizePrettyPaste = source => {
  const messages = [];
  let current = [];
  let sawHeading = false;
  let sawField = false;

  for (const line of source.split(/\r?\n/)) {
    if (/^Message\s+\d+(?:\s*·.*)?$/i.test(line.trim())) {
      sawHeading = true;
      if (current.length) messages.push(current);
      current = [];
      continue;
    }

    const field = line.match(/^<(\d+)>\s+.*?\s+=\s(.*)$/);
    if (field) {
      sawField = true;
      current.push({ tag: field[1], value: field[2] });
      continue;
    }

    if (line.trim()) return null;
  }

  if (current.length) messages.push(current);
  if (!sawField || !messages.length || (sawHeading && messages.some(message => !message.length))) return null;
  if (messages.some(message => !message.some(pair => pair.tag === '8' && pair.value.startsWith('FIX.')))) return null;
  return messages.map(serializePairs).join('\n');
};

export const normalizeCopiedDatasetPaste = value => {
  const source = String(value || '');
  const json = normalizeJsonPaste(source);
  if (json !== null) return { text: json, format: 'json' };

  const pretty = normalizePrettyPaste(source);
  if (pretty !== null) return { text: pretty, format: 'pretty' };

  return { text: source, format: 'original' };
};
