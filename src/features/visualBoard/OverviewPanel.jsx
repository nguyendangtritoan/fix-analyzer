import React from 'react';
import { Activity, Clock3, Layers3, MessagesSquare, Route, Server } from 'lucide-react';
import { formatDuration, formatInteger, formatTimestamp } from './formatters';
import { getMessageTypeName } from './logAnalysis';

const StatCard = ({ icon, label, value, detail, tone = 'blue' }) => {
  const IconComponent = icon;
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {detail && <p className="mt-1 truncate text-xs text-slate-500" title={detail}>{detail}</p>}
        </div>
        <span className={`rounded-lg p-2 ${tones[tone] || tones.blue}`}><IconComponent size={18} /></span>
      </div>
    </div>
  );
};

const OverviewPanel = ({ result }) => {
  const { summary, groups, diagnostics, latency } = result;
  const typeEntries = Object.entries(summary.messageTypeCounts).sort((left, right) => right[1] - left[1]);
  const maxTypeCount = Math.max(1, ...typeEntries.map(([, count]) => count));
  const sessions = Object.entries(summary.sessionCounts).sort((left, right) => right[1] - left[1]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MessagesSquare} label="Messages" value={formatInteger(summary.messageCount)} detail={`${formatInteger(summary.directionCounts.incoming)} incoming · ${formatInteger(summary.directionCounts.outgoing)} outgoing`} />
        <StatCard icon={Layers3} label="Detected groups" value={formatInteger(groups.length)} detail={`${formatInteger(diagnostics.ungroupedMessageCount)} ungrouped`} tone="violet" />
        <StatCard icon={Server} label="Sessions" value={formatInteger(Object.keys(summary.sessionCounts).length)} detail={Object.keys(summary.versionCounts).join(', ')} tone="emerald" />
        <StatCard icon={Clock3} label="Time span" value={formatDuration(summary.durationMs)} detail={`${formatTimestamp(summary.startTimestampMs)} UTC`} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800"><Activity size={17} className="text-blue-600" /> Message types</h3>
            <span className="text-xs text-slate-400">{typeEntries.length} types</span>
          </div>
          <div className="space-y-3">
            {typeEntries.map(([type, count]) => {
              const name = getMessageTypeName(type);
              return (
                <div key={type} className="grid grid-cols-[42px_1fr_auto] items-center gap-3">
                  <span className="rounded bg-slate-800 px-2 py-1 text-center font-mono text-xs font-bold text-white">{type}</span>
                  <div>
                    <div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-600">{name}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(1, (count / maxTypeCount) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-600">{formatInteger(count)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800"><Route size={17} className="text-violet-600" /> Session streams</h3>
            <span className="text-xs text-slate-400">Capture lag median</span>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {sessions.map(([session, count]) => (
              <div key={session} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="truncate text-xs font-semibold text-slate-700" title={session}>{session}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatInteger(count)} messages</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capture samples</p><p className="mt-1 font-mono text-sm font-semibold text-slate-700">{formatInteger(latency.capture.reduce((total, row) => total + row.count, 0))}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Round trips</p><p className="mt-1 font-mono text-sm font-semibold text-slate-700">{formatInteger(latency.roundTrips.length)}</p></div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OverviewPanel;
