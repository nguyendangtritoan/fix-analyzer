const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/;

export const parseTimeOfDay = value => {
  if (!value) return null;
  const match = String(value).match(TIME_PATTERN);
  if (!match) return null;

  const milliseconds = Number((match[4] || '').padEnd(3, '0'));
  return Number(match[1]) * 3_600_000
    + Number(match[2]) * 60_000
    + Number(match[3] || 0) * 1000
    + milliseconds;
};

const getUtcTimeOfDay = timestampMs => {
  const date = new Date(timestampMs);
  return date.getUTCHours() * 3_600_000
    + date.getUTCMinutes() * 60_000
    + date.getUTCSeconds() * 1000
    + date.getUTCMilliseconds();
};

export const isTimestampWithinTimeRange = (timestampMs, from, to) => {
  if (!from && !to) return true;
  if (!Number.isFinite(timestampMs)) return false;

  const fromMs = parseTimeOfDay(from);
  const toMs = parseTimeOfDay(to);
  const timeMs = getUtcTimeOfDay(timestampMs) % DAY_MS;

  if (from && fromMs === null) return false;
  if (to && toMs === null) return false;
  if (fromMs !== null && toMs !== null && fromMs > toMs) {
    return timeMs >= fromMs || timeMs <= toMs;
  }
  if (fromMs !== null && timeMs < fromMs) return false;
  if (toMs !== null && timeMs > toMs) return false;
  return true;
};
