import React from 'react';
import DataTable from './DataTable';
import { formatTimestamp } from './formatters';

const PricesPanel = ({ rows, onSelectMessage }) => {
  const columns = [
    { key: 'timestampMs', label: 'Latest timestamp', render: row => <span className="font-mono text-[11px]">{formatTimestamp(row.timestampMs)}</span> },
    { key: 'kind', label: 'Source' },
    { key: 'symbol', label: 'Symbol', render: row => <span className="font-semibold text-slate-800">{row.symbol || '—'}</span> },
    { key: 'correlationId', label: 'Request / Quote ID', render: row => <span className="font-mono text-blue-700">{row.correlationId || '—'}</span> },
    { key: 'bidPrice', label: 'Bid', align: 'right', render: row => <span className="font-mono text-emerald-700">{row.bidPrice ?? '—'}</span> },
    { key: 'bidSize', label: 'Bid size', align: 'right', render: row => <span className="font-mono">{row.bidSize ?? '—'}</span> },
    { key: 'offerPrice', label: 'Offer', align: 'right', render: row => <span className="font-mono text-red-700">{row.offerPrice ?? '—'}</span> },
    { key: 'offerSize', label: 'Offer size', align: 'right', render: row => <span className="font-mono">{row.offerSize ?? '—'}</span> },
    { key: 'spread', label: 'Spread', align: 'right', render: row => <span className="font-mono">{Number.isFinite(row.spread) ? row.spread.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') : '—'}</span> },
  ];

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="mb-3 shrink-0">
        <h3 className="font-bold text-slate-800">Latest quotes and market-data prices</h3>
        <p className="mt-1 text-xs text-slate-500">One latest row per session-scoped request or quote ID. Click a row to inspect its source message.</p>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={row => `${row.kind}-${row.session}-${row.correlationId}-${row.symbol}`} onRowClick={row => onSelectMessage(row.messageId)} emptyMessage="No Quote(S) or MarketDataSnapshot(W) prices were found." fitContainer scrollLabel="Scrollable quotes and prices table" />
    </div>
  );
};

export default PricesPanel;
