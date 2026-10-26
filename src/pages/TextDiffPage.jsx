import React, { useRef, useState } from 'react';
import { FileDiff, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import TextDiffView from '../components/features/TextDiffView';

const createInitialInputs = () => [
  { id: 1, value: '' },
  { id: 2, value: '' },
];

const TextName = ({ message, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const buttonRef = useRef(null);
  const finishedRef = useRef(false);

  const finishEditing = (save, restoreFocus = false) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (save) onRename(message.id, draft.trim());
    setEditing(false);
    if (restoreFocus) requestAnimationFrame(() => buttonRef.current?.focus());
  };

  return editing ? (
    <input
      type="text"
      autoFocus
      aria-label={`Name for ${message.defaultLabel}`}
      value={draft}
      placeholder={message.defaultLabel}
      onFocus={event => event.currentTarget.select()}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => finishEditing(true)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          finishEditing(event.key === 'Enter', true);
        }
      }}
      spellCheck={false}
      className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
  ) : (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Rename ${message.label}`}
      title="Rename this text"
      onClick={() => { setDraft(message.name ?? ''); finishedRef.current = false; setEditing(true); }}
      className="group -ml-1 inline-flex min-w-0 max-w-full items-center gap-2 rounded px-1 py-1 text-left text-sm font-bold text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <span className="truncate">{message.label}</span>
      <Pencil size={14} aria-hidden="true" className="shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
};

export default function TextDiffPage() {
  const [inputs, setInputs] = useState(createInitialInputs);
  const messages = inputs.map((input, index) => ({
    ...input,
    defaultLabel: `Text ${index + 1}`,
    label: input.name?.trim() || `Text ${index + 1}`,
  }));
  const hasText = inputs.some(input => input.value.length > 0);

  const updateInput = (id, value) => {
    setInputs(current => current.map(input => input.id === id ? { ...input, value } : input));
  };

  const renameInput = (id, name) => {
    setInputs(current => current.map(input => input.id === id ? { ...input, name } : input));
  };

  const addInput = () => {
    setInputs(current => [...current, { id: Math.max(...current.map(input => input.id)) + 1, value: '' }]);
  };

  const loadExample = () => {
    setInputs([
      { id: 1, value: 'INFO Request started\nrequestId=ORDER-1001\nnotionalAmount=2000000\naction=Buy\nINFO Request sent\nINFO Completed' },
      { id: 2, value: 'INFO Request started\nprovider=SampleBank\nrequestId=ORDER-2002\nnotionalAmount=2500000\naction=Sell\nINFO Completed' },
    ]);
  };

  return (
    <div className="p-6 pb-20 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
              <FileDiff className="text-blue-600" />
              Text diff
            </h1>
            <p className="mt-1 text-slate-500">Compare text, logs, or raw FIX messages side by side.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={loadExample} className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50">
              <Play size={16} className="text-green-600" /> Example
            </button>
            <button type="button" onClick={addInput} className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50">
              <Plus size={16} className="text-blue-600" /> Text
            </button>
            <button type="button" onClick={() => setInputs(createInitialInputs())} className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${inputs.length > 2 ? 'xl:grid-cols-3' : ''}`}>
          {messages.map(message => (
            <div key={message.id} className="space-y-2">
              <div className="flex min-h-8 items-center justify-between gap-3">
                <TextName message={message} onRename={renameInput} />
                {inputs.length > 2 && (
                  <button type="button" onClick={() => setInputs(current => current.filter(input => input.id !== message.id))} aria-label={`Remove ${message.label}`} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                    <X size={15} />
                  </button>
                )}
              </div>
              <textarea
                id={`text-diff-input-${message.id}`}
                aria-label={message.label}
                value={message.value}
                onChange={event => updateInput(message.id, event.target.value)}
                placeholder="Paste text to compare..."
                spellCheck={false}
                className="h-48 w-full resize-y rounded-lg border border-slate-300 bg-white p-4 font-mono text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {hasText ? <TextDiffView messages={messages} /> : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Paste text above to compare, or load the example. Differences appear as you type.
          </div>
        )}
      </div>
    </div>
  );
}
