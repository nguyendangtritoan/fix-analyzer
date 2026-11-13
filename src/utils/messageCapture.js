// Index occurrences, not tag numbers: nested and repeated fields must remain distinct.
export const indexMessageRows = nodes => {
  const rows = [];
  const visit = entries => entries.map(node => {
    const indexed = { ...node, rowIndex: rows.length };
    rows.push(indexed);
    if (node.isGroup) indexed.instances = node.instances.map(visit);
    return indexed;
  });
  return { nodes: visit(nodes), rows };
};

export const getCaptureRange = (start, end, rowCount) => {
  if (![start, end].every(index => Number.isInteger(index) && index >= 0 && index < rowCount)) return null;
  return [Math.min(start, end), Math.max(start, end)];
};

export const getCaptureDimensions = (width, height) => {
  // Stay within conservative browser canvas limits; never silently crop a long message.
  const scale = Math.min(2, 16384 / width, 16384 / height, Math.sqrt(32000000 / (width * height)));
  if (!Number.isFinite(scale) || width <= 0 || height <= 0 || scale < 1) {
    throw new Error('This image is too large. Choose a smaller range of rows.');
  }
  return { width: Math.floor(width * scale), height: Math.floor(height * scale) };
};
