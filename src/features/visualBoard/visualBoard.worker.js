import { collectProjectedFieldValues, normalizeFieldTags } from './fieldProjection';
import { analyzeLogText, parseFixPairs } from './logAnalysis';

const messageOffsets = new Map();
let datasetText = '';

const clearDataset = () => {
  messageOffsets.clear();
  datasetText = '';
};

const publishAnalysis = (text, sourceName) => {
  clearDataset();
  const result = analyzeLogText(text, {
    onProgress: progress => self.postMessage({ type: 'progress', progress }),
  });
  datasetText = text;

  for (const record of result.records) {
    messageOffsets.set(record.id, [record.rawStart, record.rawEnd]);
    delete record.rawStart;
    delete record.rawEnd;
  }

  self.postMessage({
    type: 'result',
    sourceName,
    result,
  });
};

self.onmessage = async event => {
  const message = event.data;

  try {
    if (message.type === 'parse-file') {
      const text = await message.file.text();
      publishAnalysis(text, message.file.name);
    } else if (message.type === 'parse-text') {
      publishAnalysis(String(message.text || ''), message.sourceName || 'Pasted log');
    } else if (message.type === 'get-message') {
      const offsets = messageOffsets.get(message.id);
      const raw = offsets ? datasetText.slice(offsets[0], offsets[1]) : '';
      self.postMessage({
        type: 'message-detail',
        requestId: message.requestId,
        id: message.id,
        raw,
        pairs: raw ? parseFixPairs(raw) : [],
      });
    } else if (message.type === 'query-fields') {
      const tags = normalizeFieldTags(message.tags);
      const values = [];
      for (const [id, offsets] of messageOffsets) {
        const raw = datasetText.slice(offsets[0], offsets[1]);
        const projected = collectProjectedFieldValues(parseFixPairs(raw), tags);
        if (Object.keys(projected).length) values.push([id, projected]);
      }
      self.postMessage({
        type: 'fields-result',
        requestId: message.requestId,
        tags,
        values,
      });
    } else if (message.type === 'clear') {
      clearDataset();
      self.postMessage({ type: 'cleared' });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The local log could not be processed.',
    });
  }
};
