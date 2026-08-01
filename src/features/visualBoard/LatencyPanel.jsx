import React from 'react';
import { Clock3, Gauge, TimerReset } from 'lucide-react';
import DataTable from './DataTable';
import { formatDuration, formatInteger } from './formatters';

const LatencyPanel = ({ latency, onSelectMessage }) => {
  const summary = latency.roundTripSummary;
  const captureColumns = [
    { key: 'messageType', label: 'Type', render: row => <span className="rounded bg-slate-800 px-2 py-1 font-mono font-bold text-white">{row.messageType}</span> },
    { key: 'messageName', label: 'Message' },
    { key: 'direction', label: 'Direction' },
    { key: 'count', label: 'Samples', align: 'right' },
    { key: 'median', label: 'Median', align: 'right', render: row => <span className="font-mono">{formatDuration(row.median)}</span> },
    { key: 'p95', label: 'P95', align: 'right', render: row => <span className="font-mono">{formatDuration(row.p95)}</span> },
    { key: 'p99', label: 'P99', align: 'right', render: row => <span className="font-mono">{formatDuration(row.p99)}</span> },
    { key: 'max', label: 'Max', align: 'right', render: row => <span className="font-mono">{formatDuration(row.max)}</span> },
  ];
  const roundTripColumns = [
    { key: 'transition', label: 'Transition' },
    { key: 'correlationValue', label: 'Correlation ID', render: row => <span className="font-mono text-blue-700">{row.correlationValue}</span> },
    { key: 'durationMs', label: 'Round trip', align: 'right', render: row => <span className="font-mono font-semibold">{formatDuration(row.durationMs)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Gauge className="mb-3 text-blue-600" size={19} /><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Median round trip</p><p className="mt-1 text-2xl font-bold text-slate-800">{formatDuration(summary.median)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Clock3 className="mb-3 text-violet-600" size={19} /><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">P95 round trip</p><p className="mt-1 text-2xl font-bold text-slate-800">{formatDuration(summary.p95)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><TimerReset className="mb-3 text-emerald-600" size={19} /><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Matched responses</p><p className="mt-1 text-2xl font-bold text-slate-800">{formatInteger(summary.count)}</p></div>
      </div>

      <section>
        <div className="mb-3">
          <h3 className="font-bold text-slate-800">Capture lag by message type</h3>
          <p className="mt-1 text-xs text-slate-500">Log timestamp minus FIX SendingTime(52). This measures capture or transport lag, not request-response time.</p>
        </div>
        <DataTable columns={captureColumns} rows={latency.capture} rowKey={row => `${row.direction}-${row.messageType}`} emptyMessage="No messages contain both a log timestamp and SendingTime(52)." />
      </section>

      <section>
        <div className="mb-3">
          <h3 className="font-bold text-slate-800">Matched request-response latency</h3>
          <p className="mt-1 text-xs text-slate-500">Response log timestamp minus request log timestamp, matched through explicit correlation IDs.</p>
        </div>
        <DataTable columns={roundTripColumns} rows={latency.roundTrips} rowKey="requestId" onRowClick={row => onSelectMessage(row.responseId)} emptyMessage="No request-response pairs were detected." />
      </section>
    </div>
  );
};

export default LatencyPanel;
