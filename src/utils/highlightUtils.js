export const TAG_HIGHLIGHT_STYLES = [
  'bg-blue-100 hover:bg-blue-200 shadow-[inset_4px_0_0_#2563eb]',
  'bg-emerald-100 hover:bg-emerald-200 shadow-[inset_4px_0_0_#059669]',
  'bg-violet-100 hover:bg-violet-200 shadow-[inset_4px_0_0_#7c3aed]',
  'bg-amber-100 hover:bg-amber-200 shadow-[inset_4px_0_0_#d97706]',
  'bg-rose-100 hover:bg-rose-200 shadow-[inset_4px_0_0_#e11d48]',
  'bg-cyan-100 hover:bg-cyan-200 shadow-[inset_4px_0_0_#0891b2]',
];

export const getTagHighlightClass = (tag, highlightedTags = []) => {
  const highlightedTag = highlightedTags.find(item => item.tag === tag);
  if (!highlightedTag) return "";

  return TAG_HIGHLIGHT_STYLES[highlightedTag.colorIndex % TAG_HIGHLIGHT_STYLES.length];
};
