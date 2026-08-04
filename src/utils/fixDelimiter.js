const SOH = '\u0001';
const MAX_DELIMITER_LENGTH = 32;
const BEGIN_STRING_PATTERN = /8=FIX(?:T)?\.\d\.\d/i;
const COMMON_DELIMITERS = [SOH, '^A', '|'];

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countTagBoundaries = (input, delimiter) => {
  if (!delimiter) return 0;
  const matcher = new RegExp(`${escapeRegExp(delimiter)}(?=\\d+=)`, 'g');
  return Array.from(input.matchAll(matcher)).length;
};

const delimiterAfterBeginString = input => {
  const beginMatch = BEGIN_STRING_PATTERN.exec(input);
  if (!beginMatch) return null;

  const remainder = input.slice(beginMatch.index + beginMatch[0].length);
  const bodyLengthIndex = remainder.indexOf('9=');
  if (bodyLengthIndex > 0 && bodyLengthIndex <= MAX_DELIMITER_LENGTH) {
    const candidate = remainder.slice(0, bodyLengthIndex);
    if (!/\d+=/.test(candidate)) return candidate;
  }

  const nextTag = remainder.match(/^([\s\S]{1,32}?)(?=\d+=)/);
  return nextTag?.[1] || null;
};

const inferRepeatedDelimiter = input => {
  const candidates = new Set(COMMON_DELIMITERS.filter(delimiter => input.includes(delimiter)));
  const boundaryRuns = input.matchAll(/([^A-Za-z0-9=]+)(?=\d+=)/g);

  for (const match of boundaryRuns) {
    const run = match[1];
    const maxLength = Math.min(run.length, MAX_DELIMITER_LENGTH);
    for (let length = 1; length <= maxLength; length += 1) {
      candidates.add(run.slice(-length));
    }
  }

  return Array.from(candidates)
    .map(delimiter => ({ delimiter, boundaries: countTagBoundaries(input, delimiter) }))
    .filter(candidate => candidate.boundaries > 0)
    .sort((left, right) => (
      right.boundaries - left.boundaries
      || right.delimiter.length - left.delimiter.length
    ))[0]?.delimiter || null;
};

export const detectFixDelimiter = raw => {
  const input = String(raw || '');
  if (!input) return null;

  const headerDelimiter = delimiterAfterBeginString(input);
  if (headerDelimiter) return headerDelimiter;

  return inferRepeatedDelimiter(input);
};

const getFixStart = input => {
  const beginMatch = BEGIN_STRING_PATTERN.exec(input);
  if (beginMatch) return beginMatch.index;

  const firstTag = /\d+=/.exec(input);
  return firstTag?.index ?? -1;
};

const splitWithDelimiter = (input, delimiter) => {
  const fixStart = getFixStart(input);
  if (fixStart < 0) return [];

  const source = input.slice(fixStart);
  const boundaryMatcher = new RegExp(`(?:^|${escapeRegExp(delimiter)})(\\d+)=`, 'g');
  const fields = [];
  let match;

  while ((match = boundaryMatcher.exec(source)) !== null) {
    const marker = `${match[1]}=`;
    fields.push({
      boundaryStart: match.index,
      fieldStart: match.index + match[0].length - marker.length,
    });
  }

  return fields.map((field, index) => {
    let fieldEnd = fields[index + 1]?.boundaryStart ?? source.length;
    if (index === fields.length - 1 && source.endsWith(delimiter)) {
      fieldEnd -= delimiter.length;
    }
    return source.slice(field.fieldStart, fieldEnd);
  });
};

const splitWhitespaceFields = input => {
  const tokens = [];
  const matcher = /(?:^|\s)(\d+)=([^\s=]+)/g;
  let match;
  while ((match = matcher.exec(input)) !== null) tokens.push(`${match[1]}=${match[2]}`);
  return tokens;
};

export const splitFixTokens = raw => {
  const input = String(raw || '');
  const delimiter = detectFixDelimiter(input);
  if (delimiter) return { delimiter, tokens: splitWithDelimiter(input, delimiter) };
  return { delimiter: null, tokens: splitWhitespaceFields(input) };
};

export { SOH };
