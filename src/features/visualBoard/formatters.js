export const formatTimestamp = value => {
  if (!Number.isFinite(value)) return 'No timestamp';
  const date = new Date(value);
  const pad = (number, width = 2) => String(number).padStart(width, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
};

export const formatTimeOnly = value => {
  if (!Number.isFinite(value)) return '—';
  return formatTimestamp(value).slice(11);
};

export const formatDuration = value => {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1000) return `${value} ms`;
  if (Math.abs(value) < 60_000) return `${(value / 1000).toFixed(2)} s`;
  if (Math.abs(value) < 3_600_000) return `${(value / 60_000).toFixed(2)} min`;
  return `${(value / 3_600_000).toFixed(2)} h`;
};

export const formatInteger = value => new Intl.NumberFormat('en-US').format(value || 0);

export const formatFileSize = bytes => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
