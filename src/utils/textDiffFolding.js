// Keep two unchanged lines around edits, folding only when at least three
// whole lines can be hidden. Sections retain the original row references.
export const buildTextDiffSections = (rows) => {
  const sections = [];
  let index = 0;
  const appendRows = (start, end) => {
    for (let i = start; i < end; i += 1) sections.push({ type: 'row', index: i, row: rows[i] });
  };

  while (index < rows.length) {
    if (rows[index].type !== 'equal') {
      appendRows(index, index + 1);
      index += 1;
      continue;
    }
    const start = index;
    while (index < rows.length && rows[index].type === 'equal') index += 1;
    const end = index;
    const hiddenStart = Math.min(end, start + (start > 0 ? 2 : 0));
    const hiddenEnd = Math.max(hiddenStart, end - (end < rows.length ? 2 : 0));
    if (hiddenEnd - hiddenStart < 3) {
      appendRows(start, end);
      continue;
    }
    appendRows(start, hiddenStart);
    sections.push({
      type: 'unchanged', id: `lines-${hiddenStart}-${hiddenEnd}`,
      start: hiddenStart, rows: rows.slice(hiddenStart, hiddenEnd),
    });
    appendRows(hiddenEnd, end);
  }
  return sections;
};
