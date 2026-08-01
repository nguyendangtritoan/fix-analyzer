import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3, Inbox, MoveRight } from 'lucide-react';
import { getBoardCorrelationIds } from './correlation';
import { formatDuration, formatInteger, formatTimeOnly } from './formatters';
import { getMessageTypeName } from './logAnalysis';

const ROW_HEIGHT = 70;
const OVERSCAN = 10;

const getLatency = (record, previousRecord, mode) => {
  if (mode === 'roundtrip') return record.roundTripMs;
  if (mode === 'gap') {
    if (!previousRecord || !Number.isFinite(record.eventTimestampMs) || !Number.isFinite(previousRecord.eventTimestampMs)) return null;
    return record.eventTimestampMs - previousRecord.eventTimestampMs;
  }
  return record.captureLagMs;
};

const SequenceBoard = ({ records, selectedId, onSelect, latencyMode, fieldTag, fieldValues }) => {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(640);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => setViewportHeight(entries[0]?.contentRect.height || 640));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(records.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
    return { start, end };
  }, [records.length, scrollTop, viewportHeight]);

  const visibleRecords = records.slice(visibleRange.start, visibleRange.end);

  if (!records.length) {
    return (
      <div className="flex h-[640px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
        <Inbox size={38} className="mb-3 opacity-40" />
        <p className="text-sm font-semibold">No messages match the active filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[112px_78px_minmax(300px,1fr)_110px_minmax(170px,0.7fr)] items-center gap-3 border-b border-slate-200 bg-slate-800 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
        <span>Timestamp UTC</span><span>Type</span><span>Message path</span><span>Latency</span><span>{fieldTag ? `Field ${fieldTag}` : 'Correlation IDs'}</span>
      </div>
      <div ref={scrollRef} onScroll={event => setScrollTop(event.currentTarget.scrollTop)} className="relative h-[640px] overflow-auto" tabIndex="0" aria-label={`Sequence of ${formatInteger(records.length)} FIX messages`}>
        <div style={{ height: `${records.length * ROW_HEIGHT}px`, position: 'relative' }}>
          {visibleRecords.map((record, offset) => {
            const index = visibleRange.start + offset;
            const previous = index > 0 ? records[index - 1] : null;
            const latency = getLatency(record, previous, latencyMode);
            const fieldValue = fieldTag ? fieldValues.get(record.id) : null;
            const correlationIds = getBoardCorrelationIds(record);
            const messageName = getMessageTypeName(record.messageType);
            const selected = selectedId === record.id;

            return (
              <button
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
                className={`absolute left-0 grid w-full grid-cols-[112px_78px_minmax(300px,1fr)_110px_minmax(170px,0.7fr)] items-center gap-3 border-b px-4 text-left transition-colors ${selected ? 'border-blue-200 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}
                style={{ height: `${ROW_HEIGHT}px`, transform: `translateY(${index * ROW_HEIGHT}px)` }}
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
                <span className="min-w-0">
                  {fieldTag ? (
                    <span className="block truncate font-mono text-xs text-blue-700" title={fieldValue}>{fieldValue ?? '—'}</span>
                  ) : correlationIds.length ? (
                    <span className="flex min-w-0 flex-wrap gap-1">
                      {correlationIds.slice(0, 2).map(identifier => <span key={`${identifier.tag}-${identifier.value}`} className="max-w-[150px] truncate rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-violet-700" title={`${identifier.name}(${identifier.tag})=${identifier.value}`}>{identifier.tag}={identifier.value}</span>)}
                    </span>
                  ) : <span className="text-xs text-slate-300">—</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SequenceBoard;
