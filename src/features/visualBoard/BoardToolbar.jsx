import React, { useState } from 'react';
import { Clock3, Filter, Search, SlidersHorizontal, Tag, X } from 'lucide-react';

const BoardToolbar = ({ filters, onFiltersChange, messageTypes, fieldTag, onFieldApply, fieldLoading }) => {
  const [fieldInput, setFieldInput] = useState(fieldTag || '');

  const update = patch => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
          <input value={filters.search} onChange={event => update({ search: event.target.value })} className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400" placeholder="Search type, session, participant, or ID" />
        </div>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" size={13} />
          <select value={filters.messageType} onChange={event => update({ messageType: event.target.value })} className="rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-7 text-xs text-slate-600 outline-none focus:border-blue-400">
            <option value="all">All message types</option>
            {messageTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <select value={filters.direction} onChange={event => update({ direction: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-400">
          <option value="all">All directions</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
          <option value="unknown">Unknown</option>
        </select>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2" title="Inclusive UTC time-of-day range. A start later than the end spans midnight.">
          <Clock3 className="shrink-0 text-slate-400" size={13} />
          <label className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">From</span>
            <input
              type="time"
              step="0.001"
              value={filters.timeFrom}
              onChange={event => update({ timeFrom: event.target.value })}
              className="w-[112px] py-2 font-mono text-xs text-slate-600 outline-none"
              aria-label="From time UTC"
            />
          </label>
          <span className="text-slate-300">–</span>
          <label className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">To</span>
            <input
              type="time"
              step="0.001"
              value={filters.timeTo}
              onChange={event => update({ timeTo: event.target.value })}
              className="w-[112px] py-2 font-mono text-xs text-slate-600 outline-none"
              aria-label="To time UTC"
            />
          </label>
          {(filters.timeFrom || filters.timeTo) && (
            <button type="button" onClick={() => update({ timeFrom: '', timeTo: '' })} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Clear time range"><X size={13} /></button>
          )}
          <span className="pr-1 text-[9px] font-bold text-slate-400">UTC</span>
        </div>
        <label className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" size={13} />
          <select value={filters.latencyMode} onChange={event => update({ latencyMode: event.target.value })} className="rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-7 text-xs text-slate-600 outline-none focus:border-blue-400">
            <option value="capture">Capture lag</option>
            <option value="roundtrip">Round trip</option>
            <option value="gap">Inter-arrival gap</option>
          </select>
        </label>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
          <Tag className="ml-2.5 text-slate-400" size={13} />
          <input value={fieldInput} onChange={event => setFieldInput(event.target.value.replace(/\D/g, ''))} className="w-20 px-2 py-2 text-xs outline-none" placeholder="Field tag" inputMode="numeric" />
          {fieldTag && <button type="button" onClick={() => { setFieldInput(''); onFieldApply(''); }} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Clear selected field"><X size={13} /></button>}
          <button type="button" onClick={() => onFieldApply(fieldInput)} disabled={!fieldInput || fieldLoading} className="m-1 rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-40">{fieldLoading ? 'Reading…' : 'Show'}</button>
        </div>
      </div>
    </div>
  );
};

export default BoardToolbar;
