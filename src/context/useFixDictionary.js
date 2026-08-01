import { useContext } from 'react';
import FixDictionaryContext from './FixDictionaryContext';

export const useFixDictionary = () => {
  const context = useContext(FixDictionaryContext);
  if (!context) throw new Error('useFixDictionary must be used inside FixDictionaryProvider.');
  return context;
};
