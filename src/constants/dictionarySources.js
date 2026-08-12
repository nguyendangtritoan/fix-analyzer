import dictionarySources from 'virtual:fix-dictionaries';
import { dictionaryKeyFromBeginString } from '../utils/dictionaryVersion.js';

export const SUPPORTED_DICTIONARIES = [
  'FIX40',
  'FIX41',
  'FIX42',
  'FIX43',
  'FIX44',
  'IMIX20',
  'IMIXT10',
];

export const getDictionarySource = (version) => dictionarySources[version] || null;

export const beginStringToDictionary = (beginString) => {
  const version = dictionaryKeyFromBeginString(beginString);
  return SUPPORTED_DICTIONARIES.includes(version) ? version : null;
};
