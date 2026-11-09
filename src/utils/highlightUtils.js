export const TAG_HIGHLIGHT_STYLES = [
  // Keep selected rows steady as scrolling moves them beneath the pointer.
  'bg-blue-100 shadow-[inset_4px_0_0_#2563eb]',
  'bg-emerald-100 shadow-[inset_4px_0_0_#059669]',
  'bg-violet-100 shadow-[inset_4px_0_0_#7c3aed]',
  'bg-amber-100 shadow-[inset_4px_0_0_#d97706]',
  'bg-rose-100 shadow-[inset_4px_0_0_#e11d48]',
  'bg-cyan-100 shadow-[inset_4px_0_0_#0891b2]',
];

export const getTagHighlightClass = (tag, highlightedTags = []) => {
  const highlightedTag = highlightedTags.find(item => item.tag === tag);
  if (!highlightedTag) return "";

  return TAG_HIGHLIGHT_STYLES[highlightedTag.colorIndex % TAG_HIGHLIGHT_STYLES.length];
};
