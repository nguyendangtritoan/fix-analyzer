const mergeNestedRecords = (base = {}, overlay = {}) => {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    merged[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(base[key] || {}), ...value }
      : value;
  }
  return merged;
};

export const mergeFixDictionaries = (application, transport) => ({
  tags: { ...(application?.tags || {}), ...(transport?.tags || {}) },
  enums: mergeNestedRecords(application?.enums, transport?.enums),
  groups: mergeNestedRecords(application?.groups, transport?.groups),
  fieldTypes: { ...(application?.fieldTypes || {}), ...(transport?.fieldTypes || {}) },
  messageNames: { ...(application?.messageNames || {}), ...(transport?.messageNames || {}) },
});
