import React from 'react';
import DataTable from './DataTable';
import { formatDuration, formatTimestamp } from './formatters';

const OrdersPanel = ({ rows, onSelectMessage }) => {
  const columns = [
    { key: 'timestampMs', label: 'Timestamp', render: row => <span className="font-mono text-[11px]">{formatTimestamp(row.timestampMs)}</span> },
    { key: 'clOrdId', label: 'ClOrdID(11)', render: row => <span className="font-mono font-semibold text-blue-700">{row.clOrdId}</span> },
    { key: 'orderId', label: 'OrderID(37)', render: row => <span className="font-mono">{row.orderId || '—'}</span> },
    { key: 'symbol', label: 'Symbol', render: row => <span className="font-semibold text-slate-800">{row.symbol || '—'}</span> },
    { key: 'side', label: 'Side' },
    { key: 'quantity', label: 'Quantity', align: 'right', render: row => <span className="font-mono">{row.quantity || '—'}</span> },
    { key: 'price', label: 'Price', align: 'right', render: row => <span className="font-mono">{row.price || '—'}</span> },
    { key: 'status', label: 'Status', render: row => <span className={`rounded px-2 py-1 text-[10px] font-bold ${row.status === 'Rejected' || row.status === 'Unmatched' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.status}</span> },
    { key: 'roundTripMs', label: 'Round trip', align: 'right', render: row => <span className="font-mono font-semibold">{formatDuration(row.roundTripMs)}</span> },
    { key: 'rejectReason', label: 'Reason', render: row => <span className="block max-w-72 truncate" title={row.rejectReason}>{row.rejectReason || '—'}</span> },
  ];

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="mb-3 shrink-0">
        <h3 className="font-bold text-slate-800">Orders and executions</h3>
        <p className="mt-1 text-xs text-slate-500">One row per NewOrderSingle(D), enriched with its correlated ExecutionReport(8) when available.</p>
      </div>
      <DataTable columns={columns} rows={rows} rowKey="requestMessageId" onRowClick={row => onSelectMessage(row.responseMessageId || row.requestMessageId)} emptyMessage="No NewOrderSingle(D) messages were found." fitContainer scrollLabel="Scrollable orders and executions table" />
    </div>
  );
};

export default OrdersPanel;
