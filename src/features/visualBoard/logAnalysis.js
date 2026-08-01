const SOH = '\u0001';

const MESSAGE_TYPE_NAMES = {
  '0': 'Heartbeat',
  '1': 'Test Request',
  '2': 'Resend Request',
  '3': 'Reject',
  '4': 'Sequence Reset',
  '5': 'Logout',
  '8': 'Execution Report',
  '9': 'Order Cancel Reject',
  A: 'Logon',
  D: 'New Order Single',
  F: 'Order Cancel Request',
  G: 'Order Cancel/Replace Request',
  R: 'Quote Request',
  S: 'Quote',
  V: 'Market Data Request',
  W: 'Market Data Snapshot',
  X: 'Market Data Incremental Refresh',
  Y: 'Market Data Request Reject',
};

const INDEXED_TAGS = new Set([
  '1', '6', '8', '9', '11', '14', '15', '17', '21', '34', '35', '37', '38', '39',
  '40', '41', '44', '49', '50', '52', '54', '55', '56', '58', '59', '60', '64',
  '76', '100', '117', '131', '132', '133', '134', '135', '141', '150', '151',
  '167', '262', '268', '269', '270', '271', '278', '290', '9717', '9999', '10',
]);

const ADMIN_TYPES = new Set(['0', '1', '2', '3', '4', '5', 'A']);
const ORDER_TYPES = new Set(['8', '9', 'D', 'F', 'G']);
const QUOTE_TYPES = new Set(['R', 'S', 'AG', 'AH', 'AI', 'AJ']);
const MARKET_DATA_TYPES = new Set(['V', 'W', 'X', 'Y']);
const INVALID_CORRELATION_VALUES = new Set(['', '0', 'NONE', 'N/A', 'NULL', 'UNKNOWN']);
const BOARD_FIELD_TAGS = new Set(['11', '37', '39', '41', '55', '58', '117', '131', '262']);

const ORD_STATUS_NAMES = {
  0: 'New',
  1: 'Partially filled',
  2: 'Filled',
  3: 'Done for day',
  4: 'Canceled',
  5: 'Replaced',
  6: 'Pending cancel',
  7: 'Stopped',
  8: 'Rejected',
  9: 'Suspended',
  A: 'Pending new',
  B: 'Calculated',
  C: 'Expired',
  D: 'Accepted for bidding',
  E: 'Pending replace',
};

const SIDE_NAMES = {
  1: 'Buy',
  2: 'Sell',
  5: 'Sell short',
  6: 'Sell short exempt',
};

const parseFraction = value => Number(String(value || '').slice(0, 3).padEnd(3, '0'));

export const parseLogTimestamp = value => {
  const match = String(value || '').match(
    /^(\d{2})\.(\d{2})\.(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/,
  );
  if (!match) return null;

  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return Date.UTC(
    year,
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    parseFraction(match[7]),
  );
};

export const parseFixTimestamp = value => {
  const match = String(value || '').match(
    /^(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/,
  );
  if (!match) return null;

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    parseFraction(match[7]),
  );
};

const getDelimiter = raw => {
  if (raw.includes(SOH)) return SOH;
  if (raw.includes('^A')) return '^A';
  if (raw.includes('|')) return '|';
  return null;
};

const splitFixTokens = raw => {
  const delimiter = getDelimiter(raw);
  if (delimiter) return { delimiter, tokens: raw.split(delimiter) };

  const tokens = [];
  const matcher = /(?:^|\s)(\d+)=([^\s=]+)/g;
  let match;
  while ((match = matcher.exec(raw)) !== null) tokens.push(`${match[1]}=${match[2]}`);
  return { delimiter: null, tokens };
};

export const parseFixPairs = raw => {
  const { tokens } = splitFixTokens(String(raw || ''));
  const pairs = [];

  for (const token of tokens) {
    const equalsIndex = token.indexOf('=');
    if (equalsIndex <= 0) continue;
    const tag = token.slice(0, equalsIndex).trim();
    if (!/^\d+$/.test(tag)) continue;
    pairs.push({ tag: Number(tag), value: token.slice(equalsIndex + 1) });
  }

  return pairs;
};

export const extractTagValue = (raw, requestedTag) => {
  const tag = String(requestedTag);
  const { tokens } = splitFixTokens(String(raw || ''));
  for (const token of tokens) {
    if (token.startsWith(`${tag}=`)) return token.slice(tag.length + 1);
  }
  return undefined;
};

const normalizeVersion = beginString => {
  const match = String(beginString || '').match(/^FIX\.(\d+)\.(\d+)$/);
  return match ? `FIX${match[1]}${match[2]}` : null;
};

const getByteLength = value => new TextEncoder().encode(value).length;

const validateFixEnvelope = (raw, delimiter, fields) => {
  const warnings = [];
  if (!fields['8']) warnings.push('missing-begin-string');
  if (!fields['9']) warnings.push('missing-body-length');
  if (!fields['35']) warnings.push('missing-message-type');
  if (!fields['10']) warnings.push('missing-checksum');

  if (delimiter !== SOH || !fields['9'] || !fields['10']) return warnings;

  const bodyLengthEnd = raw.indexOf(SOH, raw.indexOf('9='));
  const checksumStart = raw.lastIndexOf(`${SOH}10=`);
  if (bodyLengthEnd >= 0 && checksumStart > bodyLengthEnd) {
    const body = raw.slice(bodyLengthEnd + 1, checksumStart + 1);
    if (getByteLength(body) !== Number(fields['9'])) warnings.push('body-length-mismatch');

    const checksumInput = new TextEncoder().encode(raw.slice(0, checksumStart + 1));
    let checksum = 0;
    for (const byte of checksumInput) checksum = (checksum + byte) % 256;
    if (checksum !== Number(fields['10'])) warnings.push('checksum-mismatch');
  }

  return warnings;
};

const parsePrefix = prefix => {
  const match = prefix.match(/^\s*(\S+)\s+\[([^\]]+)]\s+(incoming|outgoing)\s+(.+?):\s*$/i);
  if (!match) {
    return {
      level: null,
      logTimestampRaw: null,
      logTimestampMs: null,
      direction: 'unknown',
      session: null,
    };
  }

  return {
    level: match[1],
    logTimestampRaw: match[2],
    logTimestampMs: parseLogTimestamp(match[2]),
    direction: match[3].toLowerCase(),
    session: match[4],
  };
};

const scanFix = raw => {
  const { delimiter, tokens } = splitFixTokens(raw);
  const fields = {};
  const correlationIds = [];
  let currentEntry = null;
  const marketEntries = [];

  const finalizeMarketEntry = () => {
    if (currentEntry?.type !== undefined) marketEntries.push(currentEntry);
    currentEntry = null;
  };

  for (const token of tokens) {
    const equalsIndex = token.indexOf('=');
    if (equalsIndex <= 0) continue;
    const tag = token.slice(0, equalsIndex).trim();
    if (!/^\d+$/.test(tag)) continue;
    const value = token.slice(equalsIndex + 1);

    if (INDEXED_TAGS.has(tag) && fields[tag] === undefined) fields[tag] = value;

    if (tag === '269') {
      finalizeMarketEntry();
      currentEntry = { type: value };
    } else if (currentEntry && tag === '270') {
      currentEntry.price = value;
    } else if (currentEntry && tag === '271') {
      currentEntry.size = value;
    } else if (currentEntry && tag === '290') {
      currentEntry.position = value;
    }
  }
  finalizeMarketEntry();

  const addCorrelation = (tag, name, namespace, value, scoped = false) => {
    const normalized = String(value || '').trim();
    if (INVALID_CORRELATION_VALUES.has(normalized.toUpperCase())) return;
    correlationIds.push({ tag: Number(tag), name, namespace, value: normalized, scoped });
  };

  addCorrelation(11, 'ClOrdID', 'CLORD', fields['11']);
  addCorrelation(41, 'OrigClOrdID', 'CLORD', fields['41']);
  addCorrelation(37, 'OrderID', 'ORDER', fields['37']);
  addCorrelation(131, 'QuoteReqID', 'QUOTE_REQUEST', fields['131']);
  addCorrelation(117, 'QuoteID', 'QUOTE', fields['117']);
  addCorrelation(262, 'MDReqID', 'MARKET_DATA', fields['262'], true);

  return {
    delimiter,
    fields,
    correlationIds,
    marketEntries,
    warnings: validateFixEnvelope(raw, delimiter, fields),
  };
};

const getBestMarketEntry = (entries, type) => {
  const matches = entries.filter(entry => entry.type === type && entry.price !== undefined);
  matches.sort((left, right) => Number(left.position || Number.MAX_SAFE_INTEGER) - Number(right.position || Number.MAX_SAFE_INTEGER));
  return matches[0] || null;
};

const parseRecordLine = (line, id, lineNumber, sourceOffset) => {
  const fixStart = line.indexOf('8=FIX.');
  if (fixStart < 0) return null;

  const prefix = parsePrefix(line.slice(0, fixStart));
  const raw = line.slice(fixStart).trimEnd();
  const scanned = scanFix(raw);
  const fields = scanned.fields;
  const sendingTimeMs = parseFixTimestamp(fields['52']);
  const eventTimestampMs = prefix.logTimestampMs ?? sendingTimeMs;
  const from = fields['49'] || 'Unknown sender';
  const to = fields['56'] || 'Unknown target';
  const session = prefix.session || `${fields['8'] || 'FIX'}:${from}->${to}`;
  const captureLagMs = prefix.logTimestampMs !== null && sendingTimeMs !== null
    ? prefix.logTimestampMs - sendingTimeMs
    : null;

  const bid = getBestMarketEntry(scanned.marketEntries, '0');
  const offer = getBestMarketEntry(scanned.marketEntries, '1');
  const messageType = fields['35'] || '?';

  return {
    id,
    lineNumber,
    rawStart: sourceOffset + fixStart,
    rawEnd: sourceOffset + fixStart + raw.length,
    level: prefix.level,
    logTimestampRaw: prefix.logTimestampRaw,
    logTimestampMs: prefix.logTimestampMs,
    sendingTimeMs,
    eventTimestampMs,
    direction: prefix.direction,
    session,
    from,
    to,
    beginString: fields['8'] || null,
    dictionaryVersion: normalizeVersion(fields['8']),
    messageType,
    messageName: MESSAGE_TYPE_NAMES[messageType] || `MsgType ${messageType}`,
    sequenceNumber: /^\d+$/.test(fields['34'] || '') ? Number(fields['34']) : null,
    fields,
    correlationIds: scanned.correlationIds,
    captureLagMs,
    roundTripMs: null,
    warningCodes: scanned.warnings,
    marketPreview: bid || offer ? {
      bidPrice: bid?.price ?? null,
      bidSize: bid?.size ?? null,
      offerPrice: offer?.price ?? null,
      offerSize: offer?.size ?? null,
    } : null,
  };
};

class DisjointSet {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = new Uint8Array(size);
  }

  find(index) {
    let root = index;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[index] !== index) {
      const next = this.parent[index];
      this.parent[index] = root;
      index = next;
    }
    return root;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;

    if (this.rank[leftRoot] < this.rank[rightRoot]) {
      this.parent[leftRoot] = rightRoot;
    } else if (this.rank[leftRoot] > this.rank[rightRoot]) {
      this.parent[rightRoot] = leftRoot;
    } else {
      this.parent[rightRoot] = leftRoot;
      this.rank[leftRoot] += 1;
    }
  }
}

const getAdminToken = record => (
  ADMIN_TYPES.has(record.messageType) ? `ADMIN:${record.session}` : null
);

const getRecordTokens = record => {
  const tokens = record.correlationIds.map(identifier => {
    const scope = identifier.scoped ? `${record.session}:` : '';
    return `${identifier.namespace}:${scope}${identifier.value}`;
  });
  const adminToken = getAdminToken(record);
  if (adminToken) tokens.push(adminToken);
  return tokens;
};

const groupTypeFor = (records, tokens) => {
  const types = new Set(records.map(record => record.messageType));
  const hasOrder = records.some(record => ORDER_TYPES.has(record.messageType)) || tokens.some(token => token.startsWith('CLORD:'));
  const hasQuote = records.some(record => QUOTE_TYPES.has(record.messageType)) || tokens.some(token => token.startsWith('QUOTE'));
  const hasMarketData = records.some(record => MARKET_DATA_TYPES.has(record.messageType)) || tokens.some(token => token.startsWith('MARKET_DATA:'));

  if (hasQuote && hasOrder) return 'rfq-order';
  if (hasQuote) return 'rfq';
  if (hasOrder) return 'order';
  if (hasMarketData) return 'market-data';
  if ([...types].every(type => ADMIN_TYPES.has(type))) return 'session';
  return 'correlation';
};

const groupLabelFor = (type, records) => {
  const firstValue = tag => records.find(record => record.fields[tag])?.fields[tag];
  if (type === 'order') return `Order ${firstValue('11') || firstValue('41') || firstValue('37') || records[0].id}`;
  if (type === 'rfq-order') return `RFQ / Order ${firstValue('131') || firstValue('11') || firstValue('117') || records[0].id}`;
  if (type === 'rfq') return `RFQ ${firstValue('131') || firstValue('117') || records[0].id}`;
  if (type === 'market-data') return `${firstValue('55') || 'Market data'} · ${firstValue('262') || records[0].id}`;
  if (type === 'session') return `Session · ${records[0].session.split(':').slice(-1)[0]}`;
  return `Correlation ${records[0].id}`;
};

const buildGroups = records => {
  const dsu = new DisjointSet(records.length);
  const tokenOwners = new Map();
  const tokensByRecord = records.map(getRecordTokens);

  tokensByRecord.forEach((tokens, recordIndex) => {
    for (const token of tokens) {
      if (tokenOwners.has(token)) dsu.union(recordIndex, tokenOwners.get(token));
      else tokenOwners.set(token, recordIndex);
    }
  });

  const membersByRoot = new Map();
  records.forEach((record, index) => {
    if (tokensByRecord[index].length === 0) return;
    const root = dsu.find(index);
    if (!membersByRoot.has(root)) membersByRoot.set(root, []);
    membersByRoot.get(root).push(record);
  });

  const components = [...membersByRoot.values()].sort((left, right) => (
    (left[0].eventTimestampMs ?? left[0].id) - (right[0].eventTimestampMs ?? right[0].id)
  ));

  return components.map((members, index) => {
    const tokens = [...new Set(members.flatMap(record => getRecordTokens(record)))];
    const type = groupTypeFor(members, tokens);
    const id = `group-${index + 1}`;
    const timestamps = members.map(record => record.eventTimestampMs).filter(Number.isFinite);
    const messageTypeCounts = {};
    for (const record of members) {
      record.groupId = id;
      messageTypeCounts[record.messageType] = (messageTypeCounts[record.messageType] || 0) + 1;
    }

    const correlations = [];
    const seenCorrelations = new Set();
    for (const record of members) {
      for (const identifier of record.correlationIds) {
        const key = `${identifier.tag}:${identifier.value}`;
        if (seenCorrelations.has(key)) continue;
        seenCorrelations.add(key);
        correlations.push(identifier);
        if (correlations.length >= 8) break;
      }
      if (correlations.length >= 8) break;
    }

    return {
      id,
      type,
      label: groupLabelFor(type, members),
      messageIds: members.map(record => record.id),
      messageCount: members.length,
      startTimestampMs: timestamps.length ? Math.min(...timestamps) : null,
      endTimestampMs: timestamps.length ? Math.max(...timestamps) : null,
      durationMs: timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : null,
      confidence: type === 'session' ? 'context' : members.length > 1 ? 'high' : 'medium',
      messageTypeCounts,
      correlations,
      sessionCount: new Set(members.map(record => record.session)).size,
    };
  });
};

const percentile = (sorted, fraction) => {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
};

const summarizeValues = values => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1] ?? null,
  };
};

const buildLatency = (records, groups, recordsById) => {
  const captureBuckets = new Map();
  for (const record of records) {
    if (!Number.isFinite(record.captureLagMs)) continue;
    const key = `${record.direction}:${record.messageType}`;
    if (!captureBuckets.has(key)) captureBuckets.set(key, []);
    captureBuckets.get(key).push(record.captureLagMs);
  }

  const roundTrips = [];
  for (const group of groups) {
    const groupRecords = group.messageIds.map(id => recordsById.get(id)).filter(Boolean);
    const pendingOrders = new Map();
    for (const record of groupRecords) {
      const clOrdId = record.fields['11'];
      if (!clOrdId) continue;
      if (record.messageType === 'D') pendingOrders.set(clOrdId, record);
      if (record.messageType === '8' && pendingOrders.has(clOrdId)) {
        const request = pendingOrders.get(clOrdId);
        if (Number.isFinite(request.eventTimestampMs) && Number.isFinite(record.eventTimestampMs)) {
          const durationMs = record.eventTimestampMs - request.eventTimestampMs;
          request.roundTripMs = durationMs;
          record.roundTripMs = durationMs;
          roundTrips.push({
            groupId: group.id,
            requestId: request.id,
            responseId: record.id,
            correlationValue: clOrdId,
            transition: 'D → 8',
            durationMs,
          });
        }
        pendingOrders.delete(clOrdId);
      }
    }
  }

  return {
    capture: [...captureBuckets.entries()].map(([key, values]) => {
      const [direction, messageType] = key.split(':');
      return {
        direction,
        messageType,
        messageName: MESSAGE_TYPE_NAMES[messageType] || `MsgType ${messageType}`,
        ...summarizeValues(values),
      };
    }).sort((left, right) => right.count - left.count),
    roundTrips,
    roundTripSummary: summarizeValues(roundTrips.map(item => item.durationMs)),
  };
};

const buildSequenceDiagnostics = records => {
  const stateByStream = new Map();
  const gaps = [];

  for (const record of records) {
    if (!Number.isFinite(record.sequenceNumber)) continue;
    const stream = `${record.session}|${record.from}->${record.to}`;
    const previous = stateByStream.get(stream);
    const isReset = record.sequenceNumber === 1 || (record.messageType === 'A' && record.fields['141'] === 'Y');

    if (previous && !isReset && record.sequenceNumber !== previous.sequenceNumber + 1) {
      gaps.push({
        recordId: record.id,
        stream,
        expected: previous.sequenceNumber + 1,
        actual: record.sequenceNumber,
      });
    }
    stateByStream.set(stream, record);
  }

  return gaps;
};

const buildOrders = (groups, recordsById, latency) => {
  const latencyByRequest = new Map(latency.roundTrips.map(item => [item.requestId, item.durationMs]));
  const rows = [];

  for (const group of groups) {
    if (!['order', 'rfq-order'].includes(group.type)) continue;
    const groupRecords = group.messageIds.map(id => recordsById.get(id)).filter(Boolean);
    const requests = groupRecords.filter(record => record.messageType === 'D');
    for (const request of requests) {
      const response = groupRecords.find(record => record.messageType === '8' && record.fields['11'] === request.fields['11']);
      rows.push({
        groupId: group.id,
        requestMessageId: request.id,
        responseMessageId: response?.id ?? null,
        timestampMs: request.eventTimestampMs,
        clOrdId: request.fields['11'] || '',
        orderId: response?.fields['37'] || request.fields['37'] || '',
        symbol: request.fields['55'] || response?.fields['55'] || '',
        side: SIDE_NAMES[request.fields['54']] || request.fields['54'] || '',
        quantity: request.fields['38'] || '',
        price: request.fields['44'] || '',
        currency: request.fields['15'] || '',
        status: response ? ORD_STATUS_NAMES[response.fields['39']] || response.fields['39'] || 'Response' : 'Unmatched',
        rejectReason: response?.fields['58'] || '',
        roundTripMs: latencyByRequest.get(request.id) ?? null,
      });
    }
  }
  return rows;
};

const buildLatestPrices = records => {
  const latest = new Map();

  for (const record of records) {
    let row = null;
    if (record.messageType === 'W' && record.marketPreview) {
      const bid = Number(record.marketPreview.bidPrice);
      const offer = Number(record.marketPreview.offerPrice);
      row = {
        kind: 'Market data',
        messageId: record.id,
        timestampMs: record.eventTimestampMs,
        session: record.session,
        correlationId: record.fields['262'] || '',
        symbol: record.fields['55'] || '',
        bidPrice: record.marketPreview.bidPrice,
        bidSize: record.marketPreview.bidSize,
        offerPrice: record.marketPreview.offerPrice,
        offerSize: record.marketPreview.offerSize,
        spread: Number.isFinite(bid) && Number.isFinite(offer) ? offer - bid : null,
      };
    } else if (record.messageType === 'S') {
      const bid = Number(record.fields['132']);
      const offer = Number(record.fields['133']);
      row = {
        kind: 'Quote',
        messageId: record.id,
        timestampMs: record.eventTimestampMs,
        session: record.session,
        correlationId: record.fields['117'] || record.fields['131'] || '',
        symbol: record.fields['55'] || '',
        bidPrice: record.fields['132'] || null,
        bidSize: record.fields['134'] || null,
        offerPrice: record.fields['133'] || null,
        offerSize: record.fields['135'] || null,
        spread: Number.isFinite(bid) && Number.isFinite(offer) ? offer - bid : null,
      };
    }

    if (!row) continue;
    const key = `${row.kind}|${record.session}|${row.correlationId || row.symbol}`;
    const existing = latest.get(key);
    if (!existing || (row.timestampMs ?? 0) >= (existing.timestampMs ?? 0)) latest.set(key, row);
  }

  return [...latest.values()].sort((left, right) => (
    String(left.symbol).localeCompare(String(right.symbol)) || String(left.correlationId).localeCompare(String(right.correlationId))
  ));
};

const buildDiagnostics = (records, skippedLineCount, groups, orders) => {
  const warningCounts = {};
  for (const record of records) {
    for (const warning of record.warningCodes || []) warningCounts[warning] = (warningCounts[warning] || 0) + 1;
  }

  const sequenceGaps = buildSequenceDiagnostics(records);
  const rejectedMessages = records.filter(record => (
    record.messageType === '3'
    || record.messageType === 'Y'
    || (record.messageType === '8' && record.fields['39'] === '8')
  ));
  const unmatchedOrders = orders.filter(order => !order.responseMessageId);
  const negativeCaptureLag = records.filter(record => Number.isFinite(record.captureLagMs) && record.captureLagMs < 0);
  const highCaptureLag = records.filter(record => Number.isFinite(record.captureLagMs) && record.captureLagMs > 100);

  return {
    skippedLineCount,
    warningCounts,
    sequenceGaps,
    rejectedMessageCount: rejectedMessages.length,
    rejectedMessageIds: rejectedMessages.slice(0, 100).map(record => record.id),
    unmatchedOrderCount: unmatchedOrders.length,
    unmatchedOrderMessageIds: unmatchedOrders.slice(0, 100).map(order => order.requestMessageId),
    negativeCaptureLagCount: negativeCaptureLag.length,
    highCaptureLagCount: highCaptureLag.length,
    ungroupedMessageCount: records.filter(record => !record.groupId).length,
    detectedGroupCount: groups.length,
  };
};

const increment = (target, key) => {
  target[key] = (target[key] || 0) + 1;
};

const buildSummary = records => {
  const messageTypeCounts = {};
  const directionCounts = {};
  const sessionCounts = {};
  const versionCounts = {};
  const timestamps = [];

  for (const record of records) {
    increment(messageTypeCounts, record.messageType);
    increment(directionCounts, record.direction);
    increment(sessionCounts, record.session);
    increment(versionCounts, record.beginString || 'Unknown');
    if (Number.isFinite(record.eventTimestampMs)) timestamps.push(record.eventTimestampMs);
  }

  return {
    messageCount: records.length,
    messageTypeCounts,
    directionCounts,
    sessionCounts,
    versionCounts,
    startTimestampMs: timestamps.length ? Math.min(...timestamps) : null,
    endTimestampMs: timestamps.length ? Math.max(...timestamps) : null,
    durationMs: timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : null,
  };
};

const compactRecordsForBoard = records => {
  for (const record of records) {
    const compactFields = {};
    for (const [tag, value] of Object.entries(record.fields)) {
      if (BOARD_FIELD_TAGS.has(tag)) compactFields[tag] = value;
    }
    record.fields = compactFields;
    delete record.correlationIds;
    delete record.marketPreview;
    delete record.level;
    delete record.logTimestampRaw;
    delete record.logTimestampMs;
    delete record.sendingTimeMs;
    delete record.beginString;
    delete record.messageName;
    delete record.warningCodes;
  }
};

export const analyzeLogText = (text, { onProgress } = {}) => {
  const records = [];
  let skippedLineCount = 0;
  let lineNumber = 0;
  let cursor = 0;
  const source = String(text || '');

  while (cursor <= source.length) {
    const newlineIndex = source.indexOf('\n', cursor);
    const end = newlineIndex === -1 ? source.length : newlineIndex;
    const line = source.slice(cursor, end).replace(/\r$/, '');
    lineNumber += 1;

    const record = parseRecordLine(line, records.length + 1, lineNumber, cursor);
    if (record) records.push(record);
    else if (line.trim()) skippedLineCount += 1;

    if (onProgress && lineNumber % 2000 === 0) {
      onProgress({ lineNumber, messageCount: records.length, fraction: source.length ? end / source.length : 1 });
    }
    if (newlineIndex === -1) break;
    cursor = newlineIndex + 1;
  }

  const recordsById = new Map(records.map(record => [record.id, record]));
  const groups = buildGroups(records);
  const latency = buildLatency(records, groups, recordsById);
  const orders = buildOrders(groups, recordsById, latency);
  const prices = buildLatestPrices(records);
  const diagnostics = buildDiagnostics(records, skippedLineCount, groups, orders);
  const summary = buildSummary(records);
  compactRecordsForBoard(records);

  return {
    records,
    groups,
    summary,
    latency,
    orders,
    prices,
    diagnostics,
  };
};

export const getMessageTypeName = type => MESSAGE_TYPE_NAMES[type] || `MsgType ${type}`;
