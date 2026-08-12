const BEGIN_STRING_VERSION = /^([A-Z][A-Z0-9]*)\.(\d)\.(\d)$/i;
const DICTIONARY_VERSION = /^([A-Z][A-Z0-9]*?)(\d)(\d)$/i;

export const dictionaryKeyFromBeginString = beginString => {
  const match = String(beginString || '').trim().match(BEGIN_STRING_VERSION);
  if (!match) return null;
  return `${match[1].toUpperCase()}${match[2]}${match[3]}`;
};

export const formatDictionaryLabel = version => {
  const match = String(version || '').match(DICTIONARY_VERSION);
  if (!match) return String(version || '');
  return `${match[1].toUpperCase()} ${match[2]}.${match[3]}`;
};
