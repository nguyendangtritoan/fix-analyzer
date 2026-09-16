export const ensureIndexedFields = ({ index, tags, records, getPairs }) => {
  const normalizedTags = tags.map(String);
  const missingTags = normalizedTags.filter(tag => !index.has(tag));
  if (!missingTags.length) return [];

  for (const tag of missingTags) index.set(tag, new Map());
  const requested = new Set(missingTags);

  for (const recordId of records) {
    for (const pair of getPairs(recordId)) {
      const tag = String(pair.tag);
      if (!requested.has(tag)) continue;
      const valuesByRecord = index.get(tag);
      if (!valuesByRecord.has(recordId)) valuesByRecord.set(recordId, []);
      valuesByRecord.get(recordId).push(pair.value);
    }
  }

  return missingTags;
};

export const projectIndexedFields = ({ index, tags, recordIds }) => {
  const normalizedTags = tags.map(String);
  const values = [];
  for (const recordId of recordIds) {
    const projected = {};
    for (const tag of normalizedTags) {
      const occurrences = index.get(tag)?.get(recordId);
      if (occurrences?.length) projected[tag] = occurrences;
    }
    if (Object.keys(projected).length) values.push([recordId, projected]);
  }
  return values;
};

export const getIndexedFieldValueHints = ({
  index,
  tag,
  recordIds,
  limit = Number.POSITIVE_INFINITY,
  maximumDistinct = Number.POSITIVE_INFINITY,
}) => {
  const valuesByRecord = index.get(String(tag));
  if (!valuesByRecord) return { hints: [], truncated: false };

  const counts = new Map();
  let truncated = false;
  for (const recordId of recordIds) {
    const distinctValues = new Set(valuesByRecord.get(recordId) || []);
    for (const value of distinctValues) {
      if (!counts.has(value) && counts.size >= maximumDistinct) {
        truncated = true;
        continue;
      }
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return {
    hints: [...counts.entries()]
      .map(([value, messageCount]) => ({ value, messageCount }))
      .sort((left, right) => right.messageCount - left.messageCount || left.value.localeCompare(right.value))
      .slice(0, limit),
    truncated,
  };
};
