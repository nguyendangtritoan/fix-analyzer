const DATASET_COPY_FORMATS = new Set(['original', 'pipe', 'soh', 'pretty', 'json']);

export const canCopyDatasetSelection = (sourceKind, hasGroupSelection) => (
  sourceKind === 'text' || (sourceKind === 'file' && hasGroupSelection)
);

const formatDelimited = (pairs, delimiter) => (
  pairs.map(pair => `${pair.tag}=${pair.value}`).join(delimiter)
);

const formatPretty = (pairs, tags, messageNumber, lineNumber) => {
  const heading = `Message ${messageNumber}${lineNumber ? ` · source line ${lineNumber}` : ''}`;
  const fields = pairs.map(pair => {
    const name = tags?.[pair.tag] || String(pair.tag);
    return `<${pair.tag}> ${name.padEnd(24, ' ')} = ${pair.value}`;
  });
  return [heading, ...fields].join('\n');
};

const toJsonMessage = (pairs, tags, messageNumber, lineNumber) => ({
  message: messageNumber,
  ...(lineNumber ? { sourceLine: lineNumber } : {}),
  fields: pairs.map(pair => ({
    tag: pair.tag,
    name: tags?.[pair.tag] || String(pair.tag),
    value: pair.value,
  })),
});

export const generateDatasetCopy = ({
  format,
  sourceText,
  messageRanges,
  parsePairs,
  tags = {},
  copyWholeSource = false,
}) => {
  if (!DATASET_COPY_FORMATS.has(format)) throw new Error('Unsupported dataset copy format.');
  if (format === 'original' && copyWholeSource) return String(sourceText || '');

  const outputs = [];
  const jsonMessages = [];

  for (let index = 0; index < messageRanges.length; index += 1) {
    const range = messageRanges[index];
    const raw = sourceText.slice(range.start, range.end);
    if (format === 'original') {
      const originalStart = range.originalStart ?? range.start;
      const originalEnd = range.originalEnd ?? range.end;
      outputs.push(sourceText.slice(originalStart, originalEnd));
      continue;
    }
    const pairs = parsePairs(raw);
    const messageNumber = index + 1;

    if (format === 'pipe') outputs.push(formatDelimited(pairs, '|'));
    else if (format === 'soh') outputs.push(`${formatDelimited(pairs, '\u0001')}\u0001`);
    else if (format === 'pretty') outputs.push(formatPretty(pairs, tags, messageNumber, range.lineNumber));
    else jsonMessages.push(toJsonMessage(pairs, tags, messageNumber, range.lineNumber));
  }

  if (format === 'json') return JSON.stringify(jsonMessages, null, 2);
  return outputs.join(format === 'pretty' ? '\n\n' : '\n');
};

export { DATASET_COPY_FORMATS };
