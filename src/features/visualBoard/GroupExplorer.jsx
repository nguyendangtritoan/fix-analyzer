import React, { useMemo, useState } from 'react';
import { Boxes, ChevronLeft, ChevronRight, Search, Unlink } from 'lucide-react';
import { formatDuration, formatInteger } from './formatters';
import { paginateItems } from './pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TYPE_LABELS = {
  'rfq-order': 'RFQ / Order',
  rfq: 'RFQ',
  order: 'Order',
  'market-data': 'Market data',
  session: 'Session',
  correlation: 'Correlation',
};

const TYPE_TONES = {
  'rfq-order': 'bg-violet-100 text-violet-700',
  rfq: 'bg-purple-100 text-purple-700',
  order: 'bg-blue-100 text-blue-700',
  'market-data': 'bg-emerald-100 text-emerald-700',
  session: 'bg-slate-200 text-slate-600',
  correlation: 'bg-amber-100 text-amber-700',
};

const GroupExplorer = ({ groups, selectedGroupId, onSelect, messageCount, ungroupedCount }) => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const availableTypes = useMemo(() => [...new Set(groups.map(group => group.type))], [groups]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter(group => (
      (type === 'all' || group.type === type)
      && (!query || group.label.toLowerCase().includes(query) || group.correlations.some(item => item.value.toLowerCase().includes(query)))
    ));
  }, [groups, search, type]);
  const pagination = useMemo(() => paginateItems(filtered, page, pageSize), [filtered, page, pageSize]);

  return (
    <aside className="flex min-h-[680px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Boxes size={16} className="text-blue-600" /> Detected groups</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{formatInteger(groups.length)}</span>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
          <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400" placeholder="Search IDs or groups" />
        </div>
        <select value={type} onChange={event => { setType(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 outline-none focus:border-blue-400">
          <option value="all">All group types</option>
          {availableTypes.map(value => <option key={value} value={value}>{TYPE_LABELS[value] || value}</option>)}
        </select>
      </div>

      <div className="border-b border-slate-100 p-2">
        <button type="button" onClick={() => onSelect('all')} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold ${selectedGroupId === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <span>All messages</span><span>{formatInteger(messageCount)}</span>
        </button>
        <button type="button" onClick={() => onSelect('ungrouped')} className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold ${selectedGroupId === 'ungrouped' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <span className="flex items-center gap-2"><Unlink size={13} /> Ungrouped</span><span>{formatInteger(ungroupedCount)}</span>
        </button>
      </div>

      <div className="flex-1 p-2">
        {pagination.items.map(group => {
          const selected = selectedGroupId === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              className={`mb-1.5 w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selected ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TYPE_TONES[group.type] || TYPE_TONES.correlation}`}>{TYPE_LABELS[group.type] || group.type}</span>
                  <p className="mt-1.5 truncate text-xs font-semibold text-slate-700" title={group.label}>{group.label}</p>
                </div>
                <ChevronRight size={14} className={selected ? 'mt-1 text-blue-600' : 'mt-1 text-slate-300'} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>{formatInteger(group.messageCount)} messages</span>
                <span>{formatDuration(group.durationMs)}</span>
              </div>
            </button>
          );
        })}
        {!filtered.length && <p className="p-5 text-center text-xs text-slate-400">No groups match these filters.</p>}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
          <span>
            {filtered.length
              ? `${formatInteger(pagination.start)}–${formatInteger(pagination.end)} of ${formatInteger(filtered.length)}`
              : '0 groups'}
          </span>
          <label className="flex items-center gap-1.5">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-600 outline-none focus:border-blue-400"
              aria-label="Groups per page"
            >
              {PAGE_SIZE_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={12} /> Previous
          </button>
          <span className="text-[10px] font-semibold text-slate-500">
            Page {formatInteger(pagination.page)} of {formatInteger(pagination.pageCount)}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pagination.pageCount, pagination.page + 1))}
            disabled={pagination.page === pagination.pageCount}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default GroupExplorer;
