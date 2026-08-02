export const MAX_PROJECTED_FIELDS = 6;

export const normalizeFieldTags = input => {
  const candidates = Array.isArray(input)
    ? input
    : String(input || '').split(/[\s,]+/);
  const tags = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const value = String(candidate).trim();
    if (!/^\d+$/.test(value)) continue;

    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) continue;

    const tag = String(number);
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length === MAX_PROJECTED_FIELDS) break;
  }

  return tags;
};

export const collectProjectedFieldValues = (pairs, requestedTags) => {
  const tags = normalizeFieldTags(requestedTags);
  const requested = new Set(tags);
  const values = Object.fromEntries(tags.map(tag => [tag, []]));

  for (const pair of pairs) {
    const tag = String(pair.tag);
    if (requested.has(tag)) values[tag].push(pair.value);
  }

  return Object.fromEntries(Object.entries(values).filter(([, occurrences]) => occurrences.length));
};
