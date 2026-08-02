import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock3, Inbox, MoveRight } from 'lucide-react';
import { getBoardCorrelationIds } from './correlation';
import { formatDuration, formatInteger, formatTimeOnly } from './formatters';
import { getMessageTypeName } from './logAnalysis';

const ROW_HEIGHT = 70;
const HEADER_HEIGHT = 45;
const OVERSCAN = 10;

const getVisibleRange = (recordCount, scrollTop, viewportHeight) => {
  const bodyScrollTop = Math.max(0, scrollTop - HEADER_HEIGHT);
  const bodyViewportHeight = Math.max(0, viewportHeight - HEADER_HEIGHT);
  const start = Math.max(0, Math.floor(bodyScrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(recordCount, Math.ceil((bodyScrollTop + bodyViewportHeight) / ROW_HEIGHT) + OVERSCAN);
  return { start, end };
};

const getLatency = (record, previousRecord, mode) => {
  if (mode === 'roundtrip') return record.roundTripMs;
  if (mode === 'gap') {
    if (!previousRecord || !Number.isFinite(record.eventTimestampMs) || !Number.isFinite(previousRecord.eventTimestampMs)) return null;
    return record.eventTimestampMs - previousRecord.eventTimestampMs;
  }
  return record.captureLagMs;
};

const SequenceBoard = ({ records, selectedId, onSelect, latencyMode, fieldTags, fieldValues, fillHeight = false }) => {
  const scrollRef = useRef(null);
  const initialVisibleRange = getVisibleRange(records.length, 0, 685);
  const visibleRangeRef = useRef(initialVisibleRange);
  const [visibleRange, setVisibleRange] = useState(initialVisibleRange);

  const hasProjectedFields = fieldTags.length > 0;
  const gridTemplateColumns = hasProjectedFields
    ? `112px 78px minmax(280px, 1fr) 100px repeat(${fieldTags.length}, minmax(200px, 0.6fr))`
    : '112px 78px minmax(300px, 1fr) 110px minmax(170px, 0.7fr)';
  const boardMinWidth = hasProjectedFields ? 640 + (fieldTags.length * 220) : 850;

  const updateVisibleRange = useCallback((scrollTop, viewportHeight) => {
    const nextRange = getVisibleRange(records.length, scrollTop, viewportHeight);
    const currentRange = visibleRangeRef.current;
    if (nextRange.start === currentRange.start && nextRange.end === currentRange.end) return;
    visibleRangeRef.current = nextRange;
    setVisibleRange(nextRange);
  }, [records.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    updateVisibleRange(element.scrollTop, element.clientHeight || 685);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => updateVisibleRange(element.scrollTop, entries[0]?.contentRect.height || 685));
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateVisibleRange]);

  const visibleRecords = records.slice(visibleRange.start, visibleRange.end);

  if (!records.length) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 ${fillHeight ? 'h-full min-h-0' : 'h-[640px]'}`}>
        <Inbox size={38} className="mb-3 opacity-40" />
        <p className="text-sm font-semibold">No messages match the active filters.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${fillHeight ? 'h-full min-h-0' : ''}`}>
      <div ref={scrollRef} onScroll={event => updateVisibleRange(event.currentTarget.scrollTop, event.currentTarget.clientHeight)} className={`relative overflow-auto overscroll-contain [contain:layout_paint] ${fillHeight ? 'h-full' : 'h-[685px]'}`} tabIndex="0" aria-label={`Sequence of ${formatInteger(records.length)} FIX messages`}>
        <div
          className="sticky top-0 z-20 grid items-center gap-3 border-b border-slate-200 bg-slate-800 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-300"
          style={{ gridTemplateColumns, height: `${HEADER_HEIGHT}px`, minWidth: `${boardMinWidth}px` }}
        >
          <span>Timestamp UTC</span><span>Type</span><span>Message path</span><span>Latency</span>
          {hasProjectedFields
            ? fieldTags.map(tag => <span key={tag}>{tag}</span>)
            : <span>Correlation IDs</span>}
        </div>
        <div style={{ height: `${records.length * ROW_HEIGHT}px`, minWidth: `${boardMinWidth}px`, position: 'relative' }}>
          {visibleRecords.map((record, offset) => {
            const index = visibleRange.start + offset;
            const previous = index > 0 ? records[index - 1] : null;
            const latency = getLatency(record, previous, latencyMode);
            const projectedValues = hasProjectedFields ? fieldValues.get(record.id) : null;
            const correlationIds = getBoardCorrelationIds(record);
            const messageName = getMessageTypeName(record.messageType);
            const selected = selectedId === record.id;

            return (
              <button
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
                className={`absolute left-0 grid w-full items-center gap-3 border-b px-4 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${selected ? 'border-blue-200 bg-blue-50' : 'border-slate-100'}`}
                style={{ gridTemplateColumns, height: `${ROW_HEIGHT}px`, top: `${index * ROW_HEIGHT}px` }}
              >
                <span className="font-mono text-[11px] text-slate-500">{formatTimeOnly(record.eventTimestampMs)}</span>
                <span>
                  <span className="inline-flex min-w-9 justify-center rounded bg-slate-800 px-2 py-1 font-mono text-xs font-bold text-white">{record.messageType}</span>
                  <span className="mt-1 block truncate text-[9px] text-slate-400" title={messageName}>{messageName}</span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="max-w-[180px] truncate" title={record.from}>{record.from}</span>
                    <ArrowRight size={15} className={record.direction === 'incoming' ? 'text-emerald-500' : record.direction === 'outgoing' ? 'text-blue-500' : 'text-slate-400'} />
                    <span className="max-w-[180px] truncate" title={record.to}>{record.to}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${record.direction === 'incoming' ? 'bg-emerald-50 text-emerald-700' : record.direction === 'outgoing' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{record.direction}</span>
                    <span className="truncate" title={record.session}>{record.session.split(':').slice(-1)[0]}</span>
                  </span>
                </span>
                <span className={`flex items-center gap-1.5 font-mono text-xs font-semibold ${Number.isFinite(latency) && latency > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                  {latencyMode === 'gap' ? <MoveRight size={13} /> : <Clock3 size={13} />}{formatDuration(latency)}
                </span>
                {hasProjectedFields ? fieldTags.map(tag => {
                  const occurrences = projectedValues?.[tag] || [];
                  return (
                    <span key={tag} className={`flex max-h-[62px] min-w-0 flex-wrap content-center gap-1 py-1 ${occurrences.length > 4 ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}>
                      {occurrences.length
                        ? occurrences.map((value, occurrenceIndex) => (
                          <span key={`${tag}-${occurrenceIndex}-${value}`} className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[9px] leading-none text-blue-700" title={`${tag}=${value}`}>{value}</span>
                        ))
                        : <span className="text-xs text-slate-300">—</span>}
                    </span>
                  );
                }) : (
                  <span className="min-w-0">
                    {correlationIds.length ? (
                      <span className="flex min-w-0 flex-wrap gap-1">
                        {correlationIds.slice(0, 2).map(identifier => <span key={`${identifier.tag}-${identifier.value}`} className="max-w-[150px] truncate rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-violet-700" title={`${identifier.name}(${identifier.tag})=${identifier.value}`}>{identifier.tag}={identifier.value}</span>)}
                      </span>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SequenceBoard;
