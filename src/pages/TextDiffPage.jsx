import React, { useState } from 'react';
import { FileDiff, Play, Plus, Trash2, X } from 'lucide-react';
import TextDiffView from '../components/features/TextDiffView';

const createInitialInputs = () => [
  { id: 1, value: '' },
  { id: 2, value: '' },
];

export default function TextDiffPage() {
  const [inputs, setInputs] = useState(createInitialInputs);
  const messages = inputs.map((input, index) => ({ ...input, label: `Text ${index + 1}` }));
  const hasText = inputs.some(input => input.value.length > 0);

  const updateInput = (id, value) => {
    setInputs(current => current.map(input => input.id === id ? { ...input, value } : input));
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
                <label htmlFor={`text-diff-input-${message.id}`} className="text-sm font-bold text-slate-700">{message.label}</label>
                {inputs.length > 2 && (
                  <button type="button" onClick={() => setInputs(current => current.filter(input => input.id !== message.id))} aria-label={`Remove ${message.label}`} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                    <X size={15} />
                  </button>
                )}
              </div>
              <textarea
                id={`text-diff-input-${message.id}`}
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
