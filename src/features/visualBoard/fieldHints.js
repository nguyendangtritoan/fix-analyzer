const COMMON_TAGS = ['35', '55', '11', '37', '117', '131', '262', '270', '271', '49', '56', '52'];

export const getTagHints = (tags, query, availableTags = Object.keys(tags || {})) => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const priority = new Map(COMMON_TAGS.map((tag, index) => [tag, index]));
  return [...new Set((availableTags || []).map(String))]
    .map(tag => ({ tag, name: String(tags?.[tag] || `Tag ${tag}`) }))
    .filter(item => !normalizedQuery
      || item.tag.startsWith(normalizedQuery)
      || item.name.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftExact = left.tag === normalizedQuery ? -1 : 0;
      const rightExact = right.tag === normalizedQuery ? -1 : 0;
      if (leftExact !== rightExact) return leftExact - rightExact;
      const leftPriority = priority.get(left.tag) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priority.get(right.tag) ?? Number.MAX_SAFE_INTEGER;
      return leftPriority - rightPriority || Number(left.tag) - Number(right.tag);
    });
};
