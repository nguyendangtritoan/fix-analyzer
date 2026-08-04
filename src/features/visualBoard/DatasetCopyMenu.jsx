import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ClipboardCopy, LoaderCircle, X } from 'lucide-react';
import { writeTextToClipboard } from '../../utils/fixUtils';
import { canCopyDatasetSelection } from './datasetExport';

const OPTIONS = [
  { id: 'original', label: 'Original / raw', description: 'Exact paste or selected source lines' },
  { id: 'pipe', label: 'Pipe delimited', description: 'One normalized FIX message per line' },
  { id: 'soh', label: 'SOH delimited', description: 'Protocol fields with message line breaks' },
  { id: 'pretty', label: 'Pretty / bracketed', description: 'Readable field names and values' },
  { id: 'json', label: 'JSON', description: 'Duplicate-preserving message array' },
];

const DatasetCopyMenu = ({ sourceKind, hasGroupSelection, onCopy }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const rootRef = useRef(null);
  const resetTimerRef = useRef(null);
  const enabled = canCopyDatasetSelection(sourceKind, hasGroupSelection);
  const scopeLabel = hasGroupSelection ? 'group' : 'all';
  const disabledReason = sourceKind === 'file'
    ? 'Select a detected group to copy. Copy all is available only for pasted input.'
    : 'No copyable pasted input is available.';

  useEffect(() => {
    const handleOutsideClick = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) setIsOpen(false);
  }, [enabled]);

  const handleCopy = async format => {
    setStatus('copying');
    setError(null);
    try {
      const response = await onCopy(format);
      const copied = await writeTextToClipboard(response.text);
      if (!copied) throw new Error('The browser did not allow clipboard access.');
      setStatus('copied');
      setIsOpen(false);
      resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 2000);
    } catch (copyError) {
      setStatus('error');
      setError(copyError instanceof Error ? copyError.message : 'The dataset could not be copied.');
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={!enabled || status === 'copying'}
        title={enabled ? `Copy ${scopeLabel} in another format` : disabledReason}
        aria-expanded={isOpen}
        onClick={() => { setIsOpen(current => !current); setError(null); }}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
      >
        {status === 'copying' ? <LoaderCircle className="animate-spin" size={13} /> : status === 'copied' ? <Check size={13} /> : <ClipboardCopy size={13} />}
        {status === 'copying' ? 'Preparing…' : status === 'copied' ? `Copied ${scopeLabel}` : `Copy ${scopeLabel}`}
        <ChevronDown size={12} />
      </button>

      {isOpen && enabled && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="menu">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Copy {scopeLabel} as</p>
          </div>
          <div className="p-1.5">
            {OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => handleCopy(option.id)}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="text-xs font-semibold text-slate-700">{option.label}</span>
                <span className="mt-0.5 text-[10px] text-slate-400">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="absolute right-0 z-30 mt-2 flex w-72 items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-lg">
          <X className="mt-0.5 shrink-0" size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DatasetCopyMenu;
