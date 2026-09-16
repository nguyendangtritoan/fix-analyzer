import React, { useMemo, useRef, useState } from 'react';
import { FilterX, Hash, Layers3, Plus, Search, X } from 'lucide-react';
import { createFieldFilter, hasFieldWildcard, matchesFieldValue } from './fieldFilter';
import { getTagHints } from './fieldHints';
import { getFieldInvestigationLabel } from './fieldInvestigation';
import { formatInteger } from './formatters';

const CountCard = ({ label, value, detail }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{detail}</p>
  </div>
);

const HINT_ROW_HEIGHT = 36;
const HINT_VIEWPORT_HEIGHT = 288;
const HINT_OVERSCAN = 4;

const VirtualHintList = ({ items, getKey, renderItem, ariaLabel }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const height = Math.min(HINT_VIEWPORT_HEIGHT, items.length * HINT_ROW_HEIGHT);
  const visibleCount = Math.ceil(height / HINT_ROW_HEIGHT);
  const start = Math.max(0, Math.floor(scrollTop / HINT_ROW_HEIGHT) - HINT_OVERSCAN);
  const end = Math.min(items.length, start + visibleCount + (HINT_OVERSCAN * 2));

  return (
    <div
      className="overflow-auto overscroll-contain"
      style={{ height }}
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
      role="listbox"
      aria-label={ariaLabel}
    >
      <div className="relative" style={{ height: items.length * HINT_ROW_HEIGHT }}>
        {items.slice(start, end).map((item, visibleIndex) => (
          <div
            key={getKey(item)}
            className="absolute left-0 right-0"
            style={{ height: HINT_ROW_HEIGHT, top: (start + visibleIndex) * HINT_ROW_HEIGHT }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
};

const FieldInvestigationPanel = ({
  records,
  investigations,
  activeInvestigationId,
  onSelectInvestigation,
  onAddInvestigation,
  onCloseInvestigation,
  onChange,
  tagNames,
  availableTags,
  enums,
  onRequestValueHints,
  scopeLabel,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [tagHintsOpen, setTagHintsOpen] = useState(false);
  const [valueHintsOpen, setValueHintsOpen] = useState(false);
  const [valueHints, setValueHints] = useState([]);
  const [valueHintsLoading, setValueHintsLoading] = useState(false);
  const hintRequestRef = useRef(0);
  const activeInvestigation = investigations.find(item => item.id === activeInvestigationId) || investigations[0];
  const filters = activeInvestigation.filters;
  const summary = activeInvestigation.summary;
  const ready = !filters.length || (!activeInvestigation.loading && Boolean(summary));
  const visibleSummary = ready ? summary : null;
  const candidate = createFieldFilter(tagInput, valueInput);
  const tagHints = useMemo(
    () => getTagHints(tagNames, tagInput, availableTags),
    [availableTags, tagInput, tagNames],
  );
  const visibleValueHints = useMemo(() => {
    return valueHints.filter(hint => matchesFieldValue(hint.value, valueInput));
  }, [valueHints, valueInput]);

  const requestValueHints = tag => {
    const requestNumber = ++hintRequestRef.current;
    if (!/^\d+$/.test(tag)) {
      setValueHints([]);
      setValueHintsLoading(false);
      return;
    }
    setValueHintsLoading(true);
    onRequestValueHints(tag).then(response => {
      if (hintRequestRef.current !== requestNumber) return;
      setValueHints(response.hints || []);
    }).catch(() => {
      if (hintRequestRef.current !== requestNumber) return;
      setValueHints([]);
    }).finally(() => {
      if (hintRequestRef.current === requestNumber) setValueHintsLoading(false);
    });
  };

  const resetDraft = () => {
    hintRequestRef.current += 1;
    setTagInput('');
    setValueInput('');
    setValueHints([]);
    setValueHintsLoading(false);
    setTagHintsOpen(false);
    setValueHintsOpen(false);
  };

  const selectInvestigation = id => {
    resetDraft();
    onSelectInvestigation(id);
  };

  const selectTagHint = tag => {
    setTagInput(tag);
    setTagHintsOpen(false);
    setValueInput('');
    setValueHintsOpen(true);
    requestValueHints(tag);
  };

  const addFilter = () => {
    if (!candidate) return;
    const duplicate = filters.some(filter => (
      filter.tag === candidate.tag && filter.value.toLowerCase() === candidate.value.toLowerCase()
    ));
    if (!duplicate) onChange(activeInvestigation.id, [...filters, candidate]);
    resetDraft();
  };

  return (
    <div className="h-full overflow-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800"><Hash size={17} className="text-violet-600" /> Field counts</h2>
            <p className="mt-1 text-xs text-slate-500">Create independent comparison tabs. Counts use the current group scope and never change Flow.</p>
          </div>
          {filters.length > 0 && (
            <button type="button" onClick={() => onChange(activeInvestigation.id, [])} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <FilterX size={13} /> Clear active filters
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4" role="tablist" aria-label="Field count comparisons">
          {investigations.map((investigation, index) => {
            const selected = investigation.id === activeInvestigation.id;
            const label = getFieldInvestigationLabel(investigation.filters, index + 1);
            const count = investigation.filters.length ? investigation.summary?.matchedCount : records.length;
            return (
              <div key={investigation.id} className={`flex items-center rounded-lg border ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <button type="button" role="tab" aria-selected={selected} onClick={() => selectInvestigation(investigation.id)} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold ${selected ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}>
                  <span className="max-w-40 truncate">{label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] ${selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{investigation.loading ? '…' : count === undefined ? '—' : formatInteger(count)}</span>
                </button>
                {investigations.length > 1 && <button type="button" onClick={() => onCloseInvestigation(investigation.id)} className="mr-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Close ${label}`}><X size={11} /></button>}
              </div>
            );
          })}
          <button type="button" onClick={() => { resetDraft(); onAddInvestigation(); }} className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
            <Plus size={12} /> New comparison
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-4">
          <div className="relative">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-400">
              <Hash className="ml-2.5 text-slate-400" size={13} />
              <input
                value={tagInput}
                onChange={event => {
                  const value = event.target.value;
                  setTagInput(value);
                  setTagHintsOpen(true);
                  setValueInput('');
                  setValueHintsOpen(/^\d+$/.test(value));
                  requestValueHints(value);
                }}
                onFocus={() => setTagHintsOpen(true)}
                onBlur={() => setTagHintsOpen(false)}
                className="w-44 px-2 py-2 text-xs outline-none"
                placeholder="Tag or field name"
                aria-label="Count filter tag"
                autoComplete="off"
              />
            </div>
            {tagHintsOpen && tagHints.length > 0 && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" onMouseDown={event => event.preventDefault()}>
                <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-400">{formatInteger(tagHints.length)} current tags</p>
                <VirtualHintList
                  key={`tags:${tagInput}`}
                  items={tagHints}
                  getKey={hint => hint.tag}
                  ariaLabel="Current FIX tags"
                  renderItem={hint => (
                    <button type="button" onClick={() => selectTagHint(hint.tag)} className="flex h-full w-full items-center justify-between gap-3 px-3 text-left text-xs hover:bg-blue-50">
                      <span className="font-mono font-bold text-blue-700">{hint.tag}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-600">{hint.name}</span>
                    </button>
                  )}
                />
              </div>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-400">
              <Search className="ml-2.5 text-slate-400" size={13} />
              <input
                value={valueInput}
                onChange={event => { setValueInput(event.target.value); setValueHintsOpen(true); }}
                onFocus={() => { setTagHintsOpen(false); setValueHintsOpen(true); }}
                onBlur={() => setValueHintsOpen(false)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && candidate) addFilter();
                }}
                className="w-64 px-2 py-2 text-xs outline-none"
                placeholder="Value or wildcard, e.g. USD/*"
                aria-label="Count filter value"
                autoComplete="off"
              />
            </div>
            {valueHintsOpen && /^\d+$/.test(tagInput) && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-96 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" onMouseDown={event => event.preventDefault()}>
                {valueHintsLoading && <p className="px-3 py-2 text-xs text-slate-400">Reading values locally…</p>}
                {!valueHintsLoading && <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-400">{formatInteger(visibleValueHints.length)} matching values in current scope</p>}
                {!valueHintsLoading && visibleValueHints.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">No current values match this input.</p>}
                {!valueHintsLoading && visibleValueHints.length > 0 && (
                  <VirtualHintList
                    key={`values:${tagInput}:${valueInput}`}
                    items={visibleValueHints}
                    getKey={hint => hint.value}
                    ariaLabel={`Current values for tag ${tagInput}`}
                    renderItem={hint => (
                      <button type="button" onClick={() => { setValueInput(hint.value); setValueHintsOpen(false); }} className="flex h-full w-full items-center gap-3 px-3 text-left text-xs hover:bg-blue-50">
                        <span className="max-w-48 truncate font-mono font-bold text-slate-700" title={hint.value}>{hint.value}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-400">{enums?.[tagInput]?.[hint.value] || ''}</span>
                        <span className="shrink-0 font-mono text-[10px] text-blue-600">{formatInteger(hint.messageCount)} msg</span>
                      </button>
                    )}
                  />
                )}
              </div>
            )}
          </div>

          <button type="button" onClick={addFilter} disabled={!candidate} className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            <Plus size={12} /> Add filter
          </button>
          <span className="self-center text-[10px] text-slate-400">Use * for any characters. Blank values count field presence. Filters inside one comparison use AND.</span>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CountCard label="Messages in scope" value={formatInteger(records.length)} detail={scopeLabel} />
        <CountCard label="Active filters" value={formatInteger(filters.length)} detail="Independent from other comparison tabs" />
        <CountCard label="Final matches" value={filters.length ? (visibleSummary ? formatInteger(visibleSummary.matchedCount) : '…') : formatInteger(records.length)} detail={filters.length ? 'Matches every filter in this comparison' : 'No field filters applied'} />
      </div>

      <section className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[860px] grid-cols-[64px_minmax(220px,1fr)_150px_150px_110px_44px] items-center gap-3 bg-slate-800 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          <span>Step</span><span>Field condition</span><span>Standalone</span><span>Cumulative</span><span>Of scope</span><span />
        </div>
        {!filters.length && (
          <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center text-slate-400">
            <Layers3 size={34} className="mb-3 opacity-40" />
            <p className="text-sm font-semibold">Add a field filter to this comparison.</p>
            <p className="mt-1 text-xs">For example, use one tab for 35=R and another for 35=AG.</p>
          </div>
        )}
        {filters.length > 0 && !ready && (
          <div className="flex min-h-52 items-center justify-center p-8 text-sm font-medium text-slate-400">{activeInvestigation.loading ? 'Counting requested fields locally…' : 'Field counts are not available.'}</div>
        )}
        {filters.length > 0 && ready && visibleSummary.rows.map((row, index) => {
          const filter = filters[index];
          const percentage = summary.totalCount ? (row.cumulativeCount / summary.totalCount) * 100 : 0;
          return (
            <div key={`${filter.tag}:${filter.value}:${index}`} className="grid min-w-[860px] grid-cols-[64px_minmax(220px,1fr)_150px_150px_110px_44px] items-center gap-3 border-t border-slate-100 px-4 py-4 text-xs first:border-t-0">
              <span className="font-mono font-bold text-slate-400">{index + 1}</span>
              <span className="min-w-0"><span className="rounded bg-violet-50 px-2 py-1 font-mono font-bold text-violet-700">{filter.tag}</span><span className="ml-2 text-slate-600">{filter.value ? `${hasFieldWildcard(filter.value) ? 'matches' : 'contains'} “${filter.value}”` : 'exists'}</span></span>
              <span className="font-mono font-semibold text-slate-700">{formatInteger(row.individualCount)}</span>
              <span className="font-mono font-semibold text-blue-700">{formatInteger(row.cumulativeCount)}</span>
              <span className="font-mono text-slate-500">{percentage.toFixed(1)}%</span>
              <button type="button" onClick={() => onChange(activeInvestigation.id, filters.filter((_, filterIndex) => filterIndex !== index))} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove count filter ${filter.tag}`}><X size={13} /></button>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default FieldInvestigationPanel;
