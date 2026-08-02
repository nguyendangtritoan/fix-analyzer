import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Braces, Clock3, Copy, FileCode2, Link2, X } from 'lucide-react';
import CopyDropdown from '../../components/features/CopyDropdown';
import SingleView from '../../components/features/SingleView';
import { useFixDictionary } from '../../context/useFixDictionary';
import { TAG_HIGHLIGHT_STYLES } from '../../utils/highlightUtils';
import { getBoardCorrelationIds } from './correlation';
import { formatDuration, formatTimestamp } from './formatters';
import { getMessageTypeName } from './logAnalysis';

const MessageDrawer = ({ record, getMessage, onClose, onNavigate, canGoPrevious, canGoNext }) => {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('pretty');
  const [highlightedTags, setHighlightedTags] = useState([]);
  const dictionaryContext = useFixDictionary();
  const dictionary = record?.dictionaryVersion
    ? dictionaryContext.getDictionary(record.dictionaryVersion)
    : dictionaryContext;

  useEffect(() => {
    if (!record) return undefined;
    let active = true;
    getMessage(record.id)
      .then(message => {
        if (!active) return;
        setDetail(message);
        setError(null);
      })
      .catch(() => {
        if (active) setError('This message is no longer available in local worker memory.');
      });
    return () => { active = false; };
  }, [getMessage, record]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowUp' && canGoPrevious) onNavigate(-1);
      if (event.key === 'ArrowDown' && canGoNext) onNavigate(1);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canGoNext, canGoPrevious, onClose, onNavigate]);

  useEffect(() => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  if (!record) return null;

  const isLoading = detail?.id !== record.id;
  const pairs = isLoading ? [] : detail?.pairs || [];
  const raw = isLoading ? '' : detail?.raw || '';
  const correlationIds = getBoardCorrelationIds(record);
  const messageName = getMessageTypeName(record.messageType);

  const toggleHighlight = tag => {
    setHighlightedTags(current => {
      if (current.some(item => item.tag === tag)) return current.filter(item => item.tag !== tag);
      const used = new Set(current.map(item => item.colorIndex));
      const freeIndex = TAG_HIGHLIGHT_STYLES.findIndex((_, index) => !used.has(index));
      return [...current, { tag, colorIndex: freeIndex < 0 ? current.length % TAG_HIGHLIGHT_STYLES.length : freeIndex }];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Message ${record.id} details`}>
      <button type="button" aria-label="Close message details" className="absolute inset-0 bg-slate-950/35" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-800 px-2.5 py-1 font-mono text-sm font-bold text-white">{record.messageType}</span>
                <h2 className="truncate text-lg font-bold text-slate-800">{messageName}</h2>
                <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${record.direction === 'incoming' ? 'bg-emerald-50 text-emerald-700' : record.direction === 'outgoing' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{record.direction}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">{formatTimestamp(record.eventTimestampMs)} UTC · line {record.lineNumber}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={19} /></button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Path</p><p className="mt-1 truncate text-xs font-semibold text-slate-700" title={`${record.from} → ${record.to}`}>{record.from} → {record.to}</p></div>
            <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Capture lag</p><p className="mt-1 flex items-center gap-1 font-mono text-xs font-semibold text-slate-700"><Clock3 size={11} /> {formatDuration(record.captureLagMs)}</p></div>
            <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Round trip</p><p className="mt-1 font-mono text-xs font-semibold text-slate-700">{formatDuration(record.roundTripMs)}</p></div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setTab('pretty')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === 'pretty' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><Braces size={13} /> Pretty</button>
              <button type="button" onClick={() => setTab('raw')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === 'raw' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><FileCode2 size={13} /> Raw</button>
            </div>
            <div className="flex items-center gap-2">
              <CopyDropdown data={pairs} tags={dictionary.tags} />
              <button type="button" disabled={!canGoPrevious} onClick={() => onNavigate(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label="Previous visible message"><ArrowLeft size={14} /></button>
              <button type="button" disabled={!canGoNext} onClick={() => onNavigate(1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label="Next visible message"><ArrowRight size={14} /></button>
            </div>
          </div>

          {correlationIds.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Link2 size={13} className="text-violet-500" />
              {correlationIds.map(identifier => <span key={`${identifier.tag}-${identifier.value}`} className="rounded bg-violet-50 px-2 py-1 font-mono text-[10px] font-semibold text-violet-700" title={`This ${identifier.name} contributes to automatic grouping.`}>{identifier.name}({identifier.tag})={identifier.value}</span>)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto overscroll-contain p-5">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {isLoading && !error && <div className="flex h-48 items-center justify-center text-sm text-slate-400">Reading message from local worker memory…</div>}
          {!isLoading && tab === 'pretty' && (
            <SingleView
              data={pairs}
              tags={dictionary.tags}
              enums={dictionary.enums}
              groups={dictionary.groups}
              groupIndentEnabled
              highlightedTags={highlightedTags}
              onTagClick={toggleHighlight}
            />
          )}
          {!isLoading && tab === 'raw' && (
            <div className="relative">
              <button type="button" onClick={() => navigator.clipboard?.writeText(raw)} className="absolute right-3 top-3 flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white"><Copy size={11} /> Copy raw</button>
              <pre className="whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-5 pr-24 font-mono text-xs leading-6 text-slate-100">{raw.replaceAll('\u0001', '|')}</pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default MessageDrawer;
