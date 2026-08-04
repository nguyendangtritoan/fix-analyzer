import React, { useRef, useState } from 'react';
import { FileText, LockKeyhole, Play, ShieldCheck, Upload, X } from 'lucide-react';
import { formatInteger } from './formatters';

const EXAMPLE_LOG = ` INFO [30.07.26 15:17:45.235] outgoing FIX.4.3:CLIENT->VENUE:RFQ: 8=FIX.4.3^A9=100^A35=R^A49=CLIENT^A52=20260730-15:17:45.234^A56=VENUE^A131=RFQ-1001^A55=EUR/USD^A10=000^A
 INFO [30.07.26 15:17:45.260] incoming FIX.4.3:CLIENT->VENUE:RFQ: 8=FIX.4.3^A9=100^A35=S^A49=VENUE^A52=20260730-15:17:45.255^A56=CLIENT^A131=RFQ-1001^A117=QUOTE-42^A55=EUR/USD^A132=1.15078^A133=1.15083^A10=000^A
 INFO [30.07.26 15:17:47.902] outgoing FIX.4.3:CLIENT->VENUE:Order: 8=FIX.4.3^A9=100^A35=D^A49=CLIENT^A52=20260730-15:17:47.901^A56=VENUE^A11=ORDER-1001^A117=QUOTE-42^A55=EUR/USD^A54=1^A38=1000^A44=1.15082^A10=000^A
 INFO [30.07.26 15:17:47.974] incoming FIX.4.3:CLIENT->VENUE:Order: 8=FIX.4.3^A9=100^A35=8^A49=VENUE^A52=20260730-15:17:47.969^A56=CLIENT^A11=ORDER-1001^A37=VENUE-9001^A55=EUR/USD^A39=2^A150=2^A10=000^A`;

const ImportPanel = ({ status, progress, error, onFile, onText, onCancel }) => {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const isProcessing = status === 'processing';

  const handleDrop = event => {
    event.preventDefault();
    setIsDragging(false);
    onFile(event.dataTransfer.files?.[0]);
  };

  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="text-blue-600" size={22} />
            Import FIX activity
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Paste exchanged messages, a copied Visual Board export, or select an uncompressed text log. FIX delimiters and copied formats are detected automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <LockKeyhole size={14} />
          No upload · No persistence
        </div>
      </div>

      <div
        className={`mb-5 flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/70'
        }`}
        onDragEnter={event => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mb-3 text-slate-400" size={30} />
        <p className="text-sm font-semibold text-slate-700">Drop an uncompressed .log, .txt, or .fix file</p>
        <p className="mt-1 text-xs text-slate-400">Compressed files are intentionally not accepted.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Choose local file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".log,.txt,.fix,text/plain"
          className="hidden"
          onChange={event => { onFile(event.target.files?.[0]); event.target.value = ''; }}
        />
      </div>

      <div className="relative mb-5">
        <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
        <div className="relative mx-auto w-fit bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">or paste text</div>
      </div>

      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        disabled={isProcessing}
        className="h-52 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        placeholder="Paste FIX log lines or a copied raw, pretty, or JSON export…"
        spellCheck="false"
      />

      {isProcessing && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-blue-800">
            <span>Processing locally…</span>
            <span>{progress ? `${Math.round((progress.fraction || 0) * 100)}% · ${formatInteger(progress.messageCount)} messages` : 'Preparing file'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(4, Math.round((progress?.fraction || 0) * 100))}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <X className="mt-0.5 shrink-0" size={15} />
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="text-emerald-600" size={15} />
          Imported content stays in memory in this browser tab.
        </div>
        <div className="flex gap-2">
          {isProcessing ? (
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setText(EXAMPLE_LOG); onText(EXAMPLE_LOG, 'Built-in example'); }}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Play size={14} className="text-emerald-600" />
                Use example
              </button>
              <button
                type="button"
                onClick={() => onText(text)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Analyze pasted text
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ImportPanel;
