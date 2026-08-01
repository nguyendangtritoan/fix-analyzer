const CORRELATION_FIELDS = [
  { tag: 11, name: 'ClOrdID' },
  { tag: 41, name: 'OrigClOrdID' },
  { tag: 37, name: 'OrderID' },
  { tag: 131, name: 'QuoteReqID' },
  { tag: 117, name: 'QuoteID' },
  { tag: 262, name: 'MDReqID' },
];

const invalidValues = new Set(['', '0', 'NONE', 'N/A', 'NULL', 'UNKNOWN']);

export const getBoardCorrelationIds = record => CORRELATION_FIELDS.flatMap(field => {
  const value = String(record?.fields?.[field.tag] || '').trim();
  if (invalidValues.has(value.toUpperCase())) return [];
  return [{ ...field, value }];
});
