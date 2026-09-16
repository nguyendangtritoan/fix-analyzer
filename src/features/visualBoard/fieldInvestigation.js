import { matchesFieldOccurrences } from './fieldFilter.js';

const summarize = (recordIds, filters, getOccurrences) => {
  const rows = filters.map(() => ({
    individualCount: 0,
    cumulativeCount: 0,
  }));
  let totalCount = 0;

  for (const recordId of recordIds) {
    totalCount += 1;
    let matchesCumulativePrefix = true;
    filters.forEach((filter, index) => {
      const matches = matchesFieldOccurrences(getOccurrences(recordId, filter.tag), filter.value);
      if (matches) rows[index].individualCount += 1;
      matchesCumulativePrefix = matchesCumulativePrefix && matches;
      if (matchesCumulativePrefix) rows[index].cumulativeCount += 1;
    });
  }

  return {
    totalCount,
    matchedCount: rows.at(-1)?.cumulativeCount ?? totalCount,
    rows,
  };
};

export const summarizeFieldFilters = (records, fieldValues, filters) => summarize(
  records.map(record => record.id),
  filters,
  (recordId, tag) => fieldValues.get(recordId)?.[tag],
);

export const summarizeIndexedFieldFilters = (recordIds, index, filters) => summarize(
  recordIds,
  filters,
  (recordId, tag) => index.get(tag)?.get(recordId),
);

export const getFieldInvestigationLabel = (filters, fallbackNumber) => {
  if (!filters.length) return `Count ${fallbackNumber}`;
  const first = filters[0];
  const condition = first.value ? `${first.tag}=${first.value}` : `${first.tag} exists`;
  return filters.length === 1 ? condition : `${condition} +${filters.length - 1}`;
};
