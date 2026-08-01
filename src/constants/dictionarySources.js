import dictionarySources from 'virtual:fix-dictionaries';

export const SUPPORTED_DICTIONARIES = ['FIX40', 'FIX41', 'FIX42', 'FIX43', 'FIX44'];

export const getDictionarySource = (version) => dictionarySources[version] || null;

export const beginStringToDictionary = (beginString) => {
  const match = String(beginString || '').match(/^FIX\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const version = `FIX${match[1]}${match[2]}`;
  return SUPPORTED_DICTIONARIES.includes(version) ? version : null;
};
