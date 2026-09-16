import { normalizeFieldTags } from './fieldProjection';
import { ensureIndexedFields, getIndexedFieldValueHints, projectIndexedFields } from './fieldValueIndex';
import { createFieldFilter } from './fieldFilter';
import { summarizeIndexedFieldFilters } from './fieldInvestigation';
import { analyzeLogText, parseFixPairs } from './logAnalysis';
import { canCopyDatasetSelection, generateDatasetCopy } from './datasetExport';
import { normalizeCopiedDatasetPaste } from './datasetImport';
import { combineLocalLogFiles } from './fileImport';

const messageOffsets = new Map();
const indexedFieldValues = new Map();
let datasetText = '';
let datasetOriginalText = '';
let datasetSourceKind = null;

const clearDataset = () => {
  messageOffsets.clear();
  indexedFieldValues.clear();
  datasetText = '';
  datasetOriginalText = '';
  datasetSourceKind = null;
};

const ensureFieldTags = tags => ensureIndexedFields({
  index: indexedFieldValues,
  tags,
  records: messageOffsets.keys(),
  getPairs: id => {
    const offsets = messageOffsets.get(id);
    return parseFixPairs(datasetText.slice(offsets.start, offsets.end));
  },
});

const publishAnalysis = (text, sourceName, sourceKind, originalText = text) => {
  clearDataset();
  const result = analyzeLogText(text, {
    includeExtendedAnalytics: false,
    onProgress: progress => self.postMessage({ type: 'progress', progress: { ...progress, phase: 'analyzing' } }),
  });
  datasetText = text;
  datasetOriginalText = originalText;
  datasetSourceKind = sourceKind;

  for (const record of result.records) {
    messageOffsets.set(record.id, {
      start: record.rawStart,
      end: record.rawEnd,
      originalStart: record.sourceLineStart,
      originalEnd: record.sourceLineEnd,
      lineNumber: record.lineNumber,
    });
    delete record.rawStart;
    delete record.rawEnd;
    delete record.sourceLineStart;
    delete record.sourceLineEnd;
  }

  self.postMessage({
    type: 'result',
    sourceName,
    sourceKind,
    result,
  });
};

self.onmessage = async event => {
  const message = event.data;

  try {
    if (message.type === 'parse-files') {
      const files = Array.isArray(message.files) ? message.files : [];
      if (!files.length) throw new Error('Choose at least one local log file.');
      self.postMessage({
        type: 'progress',
        progress: { phase: 'reading', fraction: 0, messageCount: 0, fileCount: files.length },
      });
      const text = await combineLocalLogFiles(files);
      publishAnalysis(text, message.sourceName || `${files.length} local files`, 'file');
    } else if (message.type === 'parse-file') {
      const text = await combineLocalLogFiles([message.file]);
      publishAnalysis(text, message.file.name, 'file');
    } else if (message.type === 'parse-text') {
      const originalText = String(message.text || '');
      const normalized = normalizeCopiedDatasetPaste(originalText);
      publishAnalysis(normalized.text, message.sourceName || 'Pasted log', 'text', originalText);
    } else if (message.type === 'get-message') {
      const offsets = messageOffsets.get(message.id);
      const raw = offsets ? datasetText.slice(offsets.start, offsets.end) : '';
      self.postMessage({
        type: 'message-detail',
        requestId: message.requestId,
        id: message.id,
        raw,
        pairs: raw ? parseFixPairs(raw) : [],
      });
    } else if (message.type === 'query-fields') {
      const tags = normalizeFieldTags(message.tags, Number.POSITIVE_INFINITY);
      ensureFieldTags(tags);
      const values = projectIndexedFields({
        index: indexedFieldValues,
        tags,
        recordIds: messageOffsets.keys(),
      });
      self.postMessage({
        type: 'fields-result',
        requestId: message.requestId,
        tags,
        values,
      });
    } else if (message.type === 'count-fields') {
      const filters = (Array.isArray(message.filters) ? message.filters : [])
        .map(filter => createFieldFilter(filter?.tag, filter?.value))
        .filter(Boolean);
      const tags = normalizeFieldTags(filters.map(filter => filter.tag), Number.POSITIVE_INFINITY);
      ensureFieldTags(tags);
      const recordIds = Array.isArray(message.messageIds)
        ? message.messageIds.filter(id => messageOffsets.has(id))
        : messageOffsets.keys();
      self.postMessage({
        type: 'fields-count-result',
        requestId: message.requestId,
        summary: summarizeIndexedFieldFilters(recordIds, indexedFieldValues, filters),
      });
    } else if (message.type === 'field-hints') {
      const tags = normalizeFieldTags([message.tag], 1);
      const tag = tags[0];
      if (!tag) throw new Error('Choose a valid numeric FIX tag to see value hints.');
      ensureFieldTags([tag]);
      const recordIds = Array.isArray(message.messageIds)
        ? message.messageIds.filter(id => messageOffsets.has(id))
        : messageOffsets.keys();
      self.postMessage({
        type: 'field-hints-result',
        requestId: message.requestId,
        tag,
        ...getIndexedFieldValueHints({ index: indexedFieldValues, tag, recordIds }),
      });
    } else if (message.type === 'copy-dataset') {
      const requestedIds = Array.isArray(message.messageIds) ? message.messageIds : null;
      const hasGroupSelection = Boolean(requestedIds?.length);
      if (!canCopyDatasetSelection(datasetSourceKind, hasGroupSelection)) {
        throw new Error('Copy all is available for pasted input. Select a detected group to copy from a file.');
      }

      const messageRanges = requestedIds
        ? requestedIds.map(id => messageOffsets.get(id)).filter(Boolean)
        : Array.from(messageOffsets.values());
      if (requestedIds && messageRanges.length !== requestedIds.length) {
        throw new Error('The selected group is no longer available. Select it again and retry.');
      }
      const text = generateDatasetCopy({
        format: message.format,
        sourceText: message.format === 'original' && datasetSourceKind === 'text' && !requestedIds
          ? datasetOriginalText
          : datasetText,
        messageRanges,
        parsePairs: parseFixPairs,
        tags: message.tags || {},
        copyWholeSource: datasetSourceKind === 'text' && !requestedIds,
      });
      self.postMessage({
        type: 'dataset-copy-result',
        requestId: message.requestId,
        text,
      });
    } else if (message.type === 'clear') {
      clearDataset();
      self.postMessage({ type: 'cleared' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'The local log could not be processed.';
    if (message.requestId) {
      self.postMessage({ type: 'request-error', requestId: message.requestId, message: errorMessage });
    } else {
      self.postMessage({ type: 'error', message: errorMessage });
    }
  }
};
