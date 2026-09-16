export const getTimestampRange = (items, selectTimestamp = value => value) => {
  let startTimestampMs = null;
  let endTimestampMs = null;

  for (const item of items) {
    const timestamp = selectTimestamp(item);
    if (!Number.isFinite(timestamp)) continue;
    if (startTimestampMs === null || timestamp < startTimestampMs) startTimestampMs = timestamp;
    if (endTimestampMs === null || timestamp > endTimestampMs) endTimestampMs = timestamp;
  }

  return {
    startTimestampMs,
    endTimestampMs,
    durationMs: startTimestampMs === null ? null : endTimestampMs - startTimestampMs,
  };
};
