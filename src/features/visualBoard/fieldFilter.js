const normalizeTag = input => {
  const value = String(input || '').trim();
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? String(number) : null;
};

export const createFieldFilter = (tagInput, valueInput = '') => {
  const tag = normalizeTag(tagInput);
  if (!tag) return null;
  return { tag, value: String(valueInput || '').trim() };
};

export const hasFieldWildcard = queryValue => String(queryValue || '').includes('*');

const matchesWildcard = (inputValue, queryValue) => {
  const input = String(inputValue).toLowerCase();
  const query = String(queryValue).toLowerCase();
  let inputIndex = 0;
  let queryIndex = 0;
  let wildcardIndex = -1;
  let wildcardInputIndex = 0;

  while (inputIndex < input.length) {
    if (queryIndex < query.length && query[queryIndex] === input[inputIndex]) {
      inputIndex += 1;
      queryIndex += 1;
    } else if (queryIndex < query.length && query[queryIndex] === '*') {
      wildcardIndex = queryIndex;
      queryIndex += 1;
      wildcardInputIndex = inputIndex;
    } else if (wildcardIndex !== -1) {
      queryIndex = wildcardIndex + 1;
      wildcardInputIndex += 1;
      inputIndex = wildcardInputIndex;
    } else {
      return false;
    }
  }

  while (queryIndex < query.length && query[queryIndex] === '*') queryIndex += 1;
  return queryIndex === query.length;
};

export const matchesFieldValue = (fieldValue, queryValue) => {
  const query = String(queryValue || '').toLowerCase();
  if (!query) return true;
  if (hasFieldWildcard(query)) return matchesWildcard(fieldValue, query);
  return String(fieldValue).toLowerCase().includes(query);
};

export const matchesFieldOccurrences = (occurrences, queryValue) => {
  if (!occurrences?.length) return false;
  return occurrences.some(value => matchesFieldValue(value, queryValue));
};

export const matchesFieldFilters = (fieldValues, filters) => filters.every(filter => {
  const occurrences = fieldValues?.[filter.tag] || [];
  return matchesFieldOccurrences(occurrences, filter.value);
});
