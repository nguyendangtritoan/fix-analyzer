import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CircleDollarSign,
  FileSearch,
  LayoutDashboard,
  ListTree,
  Maximize2,
  Minimize2,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useFixDictionary } from '../context/useFixDictionary';
import BoardToolbar from '../features/visualBoard/BoardToolbar';
import DiagnosticsPanel from '../features/visualBoard/DiagnosticsPanel';
import GroupExplorer from '../features/visualBoard/GroupExplorer';
import ImportPanel from '../features/visualBoard/ImportPanel';
import LatencyPanel from '../features/visualBoard/LatencyPanel';
import MessageDrawer from '../features/visualBoard/MessageDrawer';
import OrdersPanel from '../features/visualBoard/OrdersPanel';
import OverviewPanel from '../features/visualBoard/OverviewPanel';
import PricesPanel from '../features/visualBoard/PricesPanel';
import SequenceBoard from '../features/visualBoard/SequenceBoard';
import { formatInteger } from '../features/visualBoard/formatters';
import { getMessageTypeName } from '../features/visualBoard/logAnalysis';
import { isTimestampWithinTimeRange } from '../features/visualBoard/timeRange';
import { useVisualBoardWorker } from '../features/visualBoard/useVisualBoardWorker';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'flow', label: 'Flow', icon: ListTree },
  { id: 'latency', label: 'Latency', icon: Activity },
  { id: 'prices', label: 'Quotes & Prices', icon: CircleDollarSign },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'diagnostics', label: 'Diagnostics', icon: FileSearch },
];

const INITIAL_FILTERS = {
  search: '',
  messageType: 'all',
  direction: 'all',
  latencyMode: 'capture',
  timeFrom: '',
  timeTo: '',
};

const VisualBoardPage = () => {
  const { autoDetectBeginString } = useFixDictionary();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [fieldTags, setFieldTags] = useState([]);
  const [fieldValues, setFieldValues] = useState(new Map());
  const [fieldLoading, setFieldLoading] = useState(false);
  const [isFlowFullscreen, setIsFlowFullscreen] = useState(false);

  useEffect(() => {
    if (!isFlowFullscreen) return undefined;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const handleKeyDown = event => {
      if (event.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setIsFlowFullscreen(false);
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(scrollX, scrollY);
    };
  }, [isFlowFullscreen]);

  const handleResult = useCallback(result => {
    const versions = Object.keys(result.summary.versionCounts).filter(version => version.startsWith('FIX.'));
    if (versions.length === 1) autoDetectBeginString(versions[0]);
    setActiveTab('overview');
    setSelectedGroupId('all');
    setSelectedRecordId(null);
    setFilters(INITIAL_FILTERS);
    setFieldTags([]);
    setFieldValues(new Map());
    setIsFlowFullscreen(false);
  }, [autoDetectBeginString]);

  const worker = useVisualBoardWorker({ onResult: handleResult });
  const result = worker.result;

  const recordsById = useMemo(() => new Map((result?.records || []).map(record => [record.id, record])), [result]);
  const selectedRecord = selectedRecordId ? recordsById.get(selectedRecordId) : null;

  const filteredRecords = useMemo(() => {
    if (!result) return [];
    const query = filters.search.trim().toLowerCase();
    return result.records.filter(record => {
      if (selectedGroupId === 'ungrouped' && record.groupId) return false;
      if (selectedGroupId !== 'all' && selectedGroupId !== 'ungrouped' && record.groupId !== selectedGroupId) return false;
      if (filters.messageType !== 'all' && record.messageType !== filters.messageType) return false;
      if (filters.direction !== 'all' && record.direction !== filters.direction) return false;
      if (!isTimestampWithinTimeRange(record.eventTimestampMs, filters.timeFrom, filters.timeTo)) return false;
      if (!query) return true;
      const searchable = [
        record.messageType,
        getMessageTypeName(record.messageType),
        record.session,
        record.from,
        record.to,
        record.fields['11'],
        record.fields['37'],
        record.fields['55'],
        record.fields['117'],
        record.fields['131'],
        record.fields['262'],
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [filters, result, selectedGroupId]);

  const handleGroupSelect = id => {
    setSelectedGroupId(id);
    setActiveTab('flow');
    setSelectedRecordId(null);
  };

  const handleFieldsApply = async tags => {
    if (!tags.length) {
      setFieldTags([]);
      setFieldValues(new Map());
      return;
    }
    setFieldLoading(true);
    try {
      const response = await worker.queryFields(tags);
      setFieldTags(response.tags);
      setFieldValues(new Map(response.values));
    } finally {
      setFieldLoading(false);
    }
  };

  const handleClear = () => {
    worker.clear();
    setSelectedRecordId(null);
    setSelectedGroupId('all');
    setFieldTags([]);
    setFieldValues(new Map());
    setIsFlowFullscreen(false);
  };

  const navigateSelectedRecord = useCallback(direction => {
    if (!selectedRecordId) return;
    const index = filteredRecords.findIndex(record => record.id === selectedRecordId);
    const next = filteredRecords[index + direction];
    if (next) setSelectedRecordId(next.id);
  }, [filteredRecords, selectedRecordId]);

  const selectedVisibleIndex = selectedRecordId ? filteredRecords.findIndex(record => record.id === selectedRecordId) : -1;

  return (
    <div className="p-4 pb-20 sm:p-6">
      {!result ? (
        <ImportPanel
          status={worker.status}
          progress={worker.progress}
          error={worker.error}
          onFile={worker.parseFile}
          onText={worker.parseText}
          onCancel={worker.cancel}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><FileSearch size={15} className="text-blue-600" /><span className="truncate text-sm font-bold text-slate-800" title={worker.sourceName}>{worker.sourceName}</span></div>
              <p className="mt-1 text-xs text-slate-400">{formatInteger(result.summary.messageCount)} messages · {formatInteger(result.groups.length)} groups · processed locally</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Visual Board analysis modes">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                      <Icon size={13} /> {tab.label}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={handleClear} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={13} /> Clear data
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <GroupExplorer
              groups={result.groups}
              selectedGroupId={selectedGroupId}
              onSelect={handleGroupSelect}
              messageCount={result.summary.messageCount}
              ungroupedCount={result.diagnostics.ungroupedMessageCount}
            />

            <section className="min-w-0">
              {activeTab === 'overview' && <OverviewPanel result={result} />}
              {activeTab === 'flow' && (
                <div className={isFlowFullscreen ? 'fixed inset-0 z-[45] flex min-h-0 flex-col gap-3 overflow-hidden bg-slate-50 p-3 sm:p-4' : 'space-y-3'} aria-label={isFlowFullscreen ? 'Full-screen message flow' : undefined}>
                  <BoardToolbar
                    filters={filters}
                    onFiltersChange={setFilters}
                    messageTypes={Object.keys(result.summary.messageTypeCounts).sort()}
                    fieldTags={fieldTags}
                    onFieldsApply={handleFieldsApply}
                    fieldLoading={fieldLoading}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                    <span>{formatInteger(filteredRecords.length)} of {formatInteger(result.summary.messageCount)} messages visible</span>
                    <div className="flex items-center gap-3">
                      <span>{filters.latencyMode === 'capture' ? 'log timestamp − SendingTime(52)' : filters.latencyMode === 'roundtrip' ? 'matched response − request' : 'current − previous visible message'}</span>
                      <button
                        type="button"
                        onClick={() => setIsFlowFullscreen(current => !current)}
                        aria-pressed={isFlowFullscreen}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700"
                      >
                        {isFlowFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        {isFlowFullscreen ? 'Exit full screen' : 'Full screen'}
                      </button>
                    </div>
                  </div>
                  <div className={isFlowFullscreen ? 'min-h-0 flex-1' : undefined}>
                    <SequenceBoard records={filteredRecords} selectedId={selectedRecordId} onSelect={setSelectedRecordId} latencyMode={filters.latencyMode} fieldTags={fieldTags} fieldValues={fieldValues} fillHeight={isFlowFullscreen} />
                  </div>
                </div>
              )}
              {activeTab === 'latency' && <LatencyPanel latency={result.latency} onSelectMessage={setSelectedRecordId} />}
              {activeTab === 'prices' && <PricesPanel rows={result.prices} onSelectMessage={setSelectedRecordId} />}
              {activeTab === 'orders' && <OrdersPanel rows={result.orders} onSelectMessage={setSelectedRecordId} />}
              {activeTab === 'diagnostics' && <DiagnosticsPanel diagnostics={result.diagnostics} onSelectMessage={setSelectedRecordId} />}
            </section>
          </div>
        </div>
      )}

      {selectedRecord && (
        <MessageDrawer
          record={selectedRecord}
          getMessage={worker.getMessage}
          onClose={() => setSelectedRecordId(null)}
          onNavigate={navigateSelectedRecord}
          canGoPrevious={selectedVisibleIndex > 0}
          canGoNext={selectedVisibleIndex >= 0 && selectedVisibleIndex < filteredRecords.length - 1}
        />
      )}
    </div>
  );
};

export default VisualBoardPage;
