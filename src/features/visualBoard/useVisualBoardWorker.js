import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareLocalLogFiles } from './fileImport';

const createInitialState = () => ({
  status: 'idle',
  progress: null,
  sourceName: null,
  sourceKind: null,
  result: null,
  error: null,
});

export const useVisualBoardWorker = ({ onResult } = {}) => {
  const [state, setState] = useState(createInitialState);
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map());
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const rejectPendingRequests = useCallback(() => {
    for (const { reject } of pendingRequestsRef.current.values()) {
      reject(new Error('The local analysis worker was reset.'));
    }
    pendingRequestsRef.current.clear();
  }, []);

  const startWorker = useCallback(() => {
    const worker = new Worker(new URL('./visualBoard.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      const message = event.data;
      if (message.type === 'progress') {
        setState(current => ({ ...current, progress: message.progress }));
      } else if (message.type === 'result') {
        setState({
          status: 'ready',
          progress: null,
          sourceName: message.sourceName,
          sourceKind: message.sourceKind,
          result: message.result,
          error: null,
        });
        onResultRef.current?.(message.result);
      } else if (message.type === 'error') {
        setState(current => ({ ...current, status: 'error', progress: null, error: message.message }));
      } else if (message.type === 'message-detail' || message.type === 'fields-result' || message.type === 'fields-count-result' || message.type === 'field-hints-result' || message.type === 'dataset-copy-result') {
        const pending = pendingRequestsRef.current.get(message.requestId);
        if (pending) {
          pending.resolve(message);
          pendingRequestsRef.current.delete(message.requestId);
        }
      } else if (message.type === 'request-error') {
        const pending = pendingRequestsRef.current.get(message.requestId);
        if (pending) {
          pending.reject(new Error(message.message));
          pendingRequestsRef.current.delete(message.requestId);
        }
      }
    };
    worker.onerror = () => {
      setState(current => ({
        ...current,
        status: 'error',
        progress: null,
        error: 'The browser could not complete the local analysis.',
      }));
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    const worker = startWorker();
    return () => {
      worker.terminate();
      workerRef.current = null;
      rejectPendingRequests();
    };
  }, [rejectPendingRequests, startWorker]);

  const resetWorker = useCallback(() => {
    workerRef.current?.terminate();
    rejectPendingRequests();
    return startWorker();
  }, [rejectPendingRequests, startWorker]);

  const parseFiles = useCallback(fileList => {
    const selection = prepareLocalLogFiles(fileList);
    if (!selection.files.length && !selection.error) return false;
    if (selection.error) {
      setState(current => ({
        ...current,
        status: 'error',
        error: selection.error,
      }));
      return false;
    }

    const worker = resetWorker();
    setState({ status: 'processing', progress: null, sourceName: selection.sourceName, sourceKind: 'file', result: null, error: null });
    worker.postMessage({
      type: 'parse-files',
      files: selection.files,
      sourceName: selection.sourceName,
    });
    return true;
  }, [resetWorker]);

  const parseFile = useCallback(file => parseFiles(file ? [file] : []), [parseFiles]);

  const parseText = useCallback((text, sourceName = 'Pasted log') => {
    if (!String(text || '').trim()) {
      setState(current => ({ ...current, status: 'error', error: 'Paste at least one FIX message or log line.' }));
      return false;
    }
    const worker = resetWorker();
    setState({ status: 'processing', progress: null, sourceName, sourceKind: 'text', result: null, error: null });
    worker.postMessage({ type: 'parse-text', text, sourceName });
    return true;
  }, [resetWorker]);

  const cancel = useCallback(() => {
    resetWorker();
    setState(createInitialState());
  }, [resetWorker]);

  const clear = useCallback(() => {
    resetWorker();
    setState(createInitialState());
  }, [resetWorker]);

  const request = useCallback(payload => new Promise((resolve, reject) => {
    const requestId = ++requestIdRef.current;
    pendingRequestsRef.current.set(requestId, { resolve, reject });
    workerRef.current?.postMessage({ ...payload, requestId });
  }), []);

  const getMessage = useCallback(id => request({ type: 'get-message', id }), [request]);
  const queryFields = useCallback(tags => request({ type: 'query-fields', tags: tags.map(String) }), [request]);
  const countFields = useCallback((filters, messageIds = null) => request({
    type: 'count-fields',
    filters,
    messageIds,
  }), [request]);
  const getFieldHints = useCallback((tag, messageIds = null) => request({
    type: 'field-hints',
    tag,
    messageIds,
  }), [request]);
  const copyDataset = useCallback((format, tags, messageIds = null) => request({
    type: 'copy-dataset',
    format,
    tags,
    messageIds,
  }), [request]);

  return {
    ...state,
    parseFiles,
    parseFile,
    parseText,
    cancel,
    clear,
    getMessage,
    queryFields,
    countFields,
    getFieldHints,
    copyDataset,
  };
};
