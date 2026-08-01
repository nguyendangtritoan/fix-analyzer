import React, { useCallback, useMemo, useState } from 'react';
import { DEFAULT_ENUMS, DEFAULT_TAGS } from '../constants/fixData';
import {
  beginStringToDictionary,
  getDictionarySource,
  SUPPORTED_DICTIONARIES,
} from '../constants/dictionarySources';
import { parseQuickFixXml } from '../utils/parsers';
import FixDictionaryContext from './FixDictionaryContext';

const dictionaryCache = new Map();

const getStandardDictionary = (version) => {
  if (dictionaryCache.has(version)) return dictionaryCache.get(version);

  const source = getDictionarySource(version);
  if (!source) return null;

  const parsed = parseQuickFixXml(source);
  dictionaryCache.set(version, parsed);
  return parsed;
};

const FALLBACK_DICTIONARY = {
  tags: DEFAULT_TAGS,
  enums: DEFAULT_ENUMS,
  groups: {},
  fieldTypes: {},
  messageNames: {},
};

const FixDictionaryProvider = ({ children }) => {
  const [mode, setModeState] = useState('auto');
  const [activeName, setActiveName] = useState('FIX44');
  const [customFileName, setCustomFileName] = useState(null);
  const [dictionary, setDictionary] = useState(() => getStandardDictionary('FIX44') || FALLBACK_DICTIONARY);

  const loadStandardDictionary = useCallback((version) => {
    if (!SUPPORTED_DICTIONARIES.includes(version)) return false;
    const nextDictionary = getStandardDictionary(version);
    if (!nextDictionary) return false;

    setDictionary(nextDictionary);
    setActiveName(version);
    setCustomFileName(null);
    return true;
  }, []);

  const setMode = useCallback((nextMode) => {
    setModeState(nextMode);
    if (nextMode === 'auto') {
      setCustomFileName(null);
    }
  }, []);

  const autoDetectBeginString = useCallback((beginString) => {
    if (mode !== 'auto' || customFileName) return null;
    const version = beginStringToDictionary(beginString);
    if (version && version !== activeName) loadStandardDictionary(version);
    return version;
  }, [activeName, customFileName, loadStandardDictionary, mode]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      try {
        const parsed = parseQuickFixXml(String(loadEvent.target?.result || ''));
        setDictionary(parsed);
        setCustomFileName(file.name);
        setModeState('manual');
      } catch (error) {
        window.alert('Failed to parse XML dictionary.');
        console.error(error instanceof Error ? error.message : 'Dictionary parsing failed.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const clearCustomDictionary = useCallback(() => {
    setCustomFileName(null);
    setModeState('auto');
    loadStandardDictionary('FIX44');
  }, [loadStandardDictionary]);

  const getDictionary = useCallback((version) => (
    getStandardDictionary(version) || dictionary
  ), [dictionary]);

  const value = useMemo(() => ({
    ...dictionary,
    mode,
    setMode,
    activeName,
    customFileName,
    loadStandardDictionary,
    autoDetectBeginString,
    handleFileUpload,
    clearCustomDictionary,
    getDictionary,
  }), [
    activeName,
    autoDetectBeginString,
    clearCustomDictionary,
    customFileName,
    dictionary,
    getDictionary,
    handleFileUpload,
    loadStandardDictionary,
    mode,
    setMode,
  ]);

  return (
    <FixDictionaryContext.Provider value={value}>
      {children}
    </FixDictionaryContext.Provider>
  );
};

export default FixDictionaryProvider;
