import React from 'react';
import { AlertTriangle, CheckCircle2, CircleOff, FileWarning, Gauge, Unlink } from 'lucide-react';
import { formatInteger } from './formatters';

const DiagnosticCard = ({ icon, label, value, detail, warning }) => {
  const IconComponent = icon;
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <IconComponent size={18} className={warning ? 'text-amber-600' : 'text-emerald-600'} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{formatInteger(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
};

const DiagnosticsPanel = ({ diagnostics, onSelectMessage }) => {
  const warningRows = Object.entries(diagnostics.warningCounts).sort((left, right) => right[1] - left[1]);
  return (
    <div className="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-5">
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DiagnosticCard icon={diagnostics.sequenceGaps.length ? AlertTriangle : CheckCircle2} label="Sequence gaps" value={diagnostics.sequenceGaps.length} detail="Across directional session streams" warning={diagnostics.sequenceGaps.length > 0} />
        <DiagnosticCard icon={FileWarning} label="Rejected messages" value={diagnostics.rejectedMessageCount} detail="Session, market-data, and order rejects" warning={diagnostics.rejectedMessageCount > 0} />
        <DiagnosticCard icon={Unlink} label="Ungrouped" value={diagnostics.ungroupedMessageCount} detail="No eligible correlation identifier" warning={false} />
        <DiagnosticCard icon={Gauge} label="Capture lag >100ms" value={diagnostics.highCaptureLagCount} detail={`${formatInteger(diagnostics.negativeCaptureLagCount)} negative clock deltas`} warning={diagnostics.highCaptureLagCount > 0 || diagnostics.negativeCaptureLagCount > 0} />
      </div>

      <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:flex xl:min-h-0 xl:flex-col">
          <h3 className="flex shrink-0 items-center gap-2 font-bold text-slate-800"><CircleOff size={17} className="text-amber-600" /> Parsing and envelope checks</h3>
          <div className="mt-4 divide-y divide-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1" tabIndex={0} aria-label="Scrollable parsing and envelope diagnostics">
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Skipped non-FIX lines</span><span className="font-mono font-semibold text-slate-700">{formatInteger(diagnostics.skippedLineCount)}</span></div>
            {warningRows.map(([warning, count]) => <div key={warning} className="flex justify-between py-2 text-sm"><span className="text-slate-500">{warning.replaceAll('-', ' ')}</span><span className="font-mono font-semibold text-amber-700">{formatInteger(count)}</span></div>)}
            {!warningRows.length && <div className="flex items-center gap-2 py-4 text-sm text-emerald-700"><CheckCircle2 size={16} /> No FIX envelope warnings detected.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:flex xl:min-h-0 xl:flex-col">
          <h3 className="flex shrink-0 items-center gap-2 font-bold text-slate-800"><AlertTriangle size={17} className="text-red-600" /> Actionable messages</h3>
          <div className="mt-4 space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1" tabIndex={0} aria-label="Scrollable actionable diagnostics">
            {diagnostics.rejectedMessageIds.slice(0, 20).map(id => <button type="button" key={`reject-${id}`} onClick={() => onSelectMessage(id)} className="flex w-full items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-100"><span>Rejected message</span><span className="font-mono">#{id}</span></button>)}
            {diagnostics.unmatchedOrderMessageIds.slice(0, 20).map(id => <button type="button" key={`unmatched-${id}`} onClick={() => onSelectMessage(id)} className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-100"><span>Unmatched order request</span><span className="font-mono">#{id}</span></button>)}
            {!diagnostics.rejectedMessageIds.length && !diagnostics.unmatchedOrderMessageIds.length && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-4 text-sm text-emerald-700"><CheckCircle2 size={16} /> No rejected or unmatched order messages.</div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
