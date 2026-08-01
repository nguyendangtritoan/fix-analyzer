import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  FileSearch,
  LayoutDashboard,
  ListTree,
  LockKeyhole,
  RefreshCw,
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
};

const VisualBoardPage = () => {
  const { autoDetectBeginString } = useFixDictionary();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [fieldTag, setFieldTag] = useState('');
  const [fieldValues, setFieldValues] = useState(new Map());
  const [fieldLoading, setFieldLoading] = useState(false);

  const handleResult = useCallback(result => {
    const versions = Object.keys(result.summary.versionCounts).filter(version => version.startsWith('FIX.'));
    if (versions.length === 1) autoDetectBeginString(versions[0]);
    setActiveTab('overview');
    setSelectedGroupId('all');
    setSelectedRecordId(null);
    setFilters(INITIAL_FILTERS);
    setFieldTag('');
    setFieldValues(new Map());
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

  const handleFieldApply = async tag => {
    if (!tag) {
      setFieldTag('');
      setFieldValues(new Map());
      return;
    }
    setFieldLoading(true);
    try {
      const response = await worker.queryField(tag);
      setFieldTag(String(tag));
      setFieldValues(new Map(response.values));
    } finally {
      setFieldLoading(false);
    }
  };

  const handleClear = () => {
    worker.clear();
    setSelectedRecordId(null);
    setSelectedGroupId('all');
    setFieldTag('');
    setFieldValues(new Map());
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
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600"><BarChart3 size={14} /> Multi-message workspace</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">Visual Board</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Explore exchanged FIX messages as correlated lifecycles, latency measurements, market prices, orders, and protocol diagnostics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" title="No imported content is transmitted or persisted by the application">
            <LockKeyhole size={14} /> Browser memory only
          </div>
          {result && (
            <button type="button" onClick={handleClear} className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
              <Trash2 size={14} /> Clear data
            </button>
          )}
        </div>
      </div>

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
                <div className="space-y-3">
                  <BoardToolbar
                    filters={filters}
                    onFiltersChange={setFilters}
                    messageTypes={Object.keys(result.summary.messageTypeCounts).sort()}
                    fieldTag={fieldTag}
                    onFieldApply={handleFieldApply}
                    fieldLoading={fieldLoading}
                  />
                  <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span>{formatInteger(filteredRecords.length)} of {formatInteger(result.summary.messageCount)} messages visible</span>
                    <span>{filters.latencyMode === 'capture' ? 'log timestamp − SendingTime(52)' : filters.latencyMode === 'roundtrip' ? 'matched response − request' : 'current − previous visible message'}</span>
                  </div>
                  <SequenceBoard records={filteredRecords} selectedId={selectedRecordId} onSelect={setSelectedRecordId} latencyMode={filters.latencyMode} fieldTag={fieldTag} fieldValues={fieldValues} />
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
