import React, { useMemo, useState } from 'react';
import { WrapText } from 'lucide-react';
import { compareText } from '../../utils/textDiff';

const TextComparison = ({ left, right }) => {
  const { rows } = useMemo(() => compareText(left.value, right.value), [left.value, right.value]);
  const [wrapLines, setWrapLines] = useState(true);

  const renderCell = (row, side) => {
    const text = row[`${side}Text`];
    const line = row[`${side}Line`];
    const segments = row[`${side}Segments`];
    const isMissing = text === null;
    const color = row.type === 'changed' ? 'bg-blue-50' : row.type === 'removed' && side === 'left'
      ? 'bg-rose-50' : row.type === 'added' && side === 'right' ? 'bg-emerald-50' : 'bg-white';
    const marker = isMissing || row.type === 'equal' ? '' : row.type === 'added' ? '+' : row.type === 'removed' ? '−' : '•';

    return (
      <td className={`p-0 align-top ${side === 'left' ? 'border-r border-slate-300' : ''} ${isMissing ? 'bg-slate-100' : color}`}>
        <div className="flex min-h-7">
          <span aria-hidden="true" className="w-14 shrink-0 select-none border-r border-slate-200/70 px-2 py-1 text-right text-[11px] text-slate-500">
            {line}<span className="ml-1 inline-block w-2">{marker}</span>
          </span>
          <code className={`block min-w-0 flex-1 px-3 py-1 text-xs leading-5 text-slate-800 [tab-size:4] ${wrapLines ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre'}`}>
            {segments.map((segment, index) => (
              <span
                key={index}
                className={segment.changed ? `rounded-sm ${row.type === 'changed' ? 'bg-blue-200 text-blue-950' : side === 'left' ? 'bg-rose-200 text-rose-950' : 'bg-emerald-200 text-emerald-950'}` : undefined}
              >
                {segment.text.replaceAll('\u0001', '␁')}
              </span>
            ))}
          </code>
        </div>
      </td>
    );
  };

  return (
    <div className="overflow-hidden rounded-b-lg">
      <div className="flex justify-end border-b border-slate-200 bg-slate-50 px-4 py-2">
        <button type="button" aria-pressed={wrapLines} onClick={() => setWrapLines(current => !current)} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium ${wrapLines ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-600'}`}><WrapText size={14} />Wrap lines</button>
      </div>

      <div tabIndex={0} role="region" aria-label="Side-by-side text comparison" className="relative max-h-[65vh] overflow-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
        <table className={`w-full border-collapse font-mono ${wrapLines ? 'table-fixed' : ''}`}>
          <thead className="sticky top-0 z-10 bg-slate-800 text-xs text-slate-100">
            <tr>
              <th scope="col" className="w-1/2 border-r border-slate-600 px-4 py-2 text-left font-medium">{left.label}</th>
              <th scope="col" className="w-1/2 px-4 py-2 text-left font-medium">{right.label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {renderCell(row, 'left')}
                {renderCell(row, 'right')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        <span><span className="mr-1 rounded bg-blue-200 px-1 text-blue-950">•</span>Changed text</span>
        <span><span className="mr-1 rounded bg-rose-200 px-1 text-rose-950">−</span>Removed line</span>
        <span><span className="mr-1 rounded bg-emerald-200 px-1 text-emerald-950">+</span>Added line</span>
        <span>Original text · CRLF/LF treated equally · SOH shown as ␁</span>
      </div>
    </div>
  );
};

const TextDiffView = ({ messages }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const left = messages.find(message => message.id === selectedIds[0]) ?? messages[0];
  const right = messages.find(message => message.id === selectedIds[1] && message.id !== left?.id)
    ?? messages.find(message => message.id !== left?.id);
  if (!left || !right) return null;

  const selectMessage = (side, id) => {
    const selected = messages.find(message => String(message.id) === id);
    if (!selected) return;
    if (side === 'left') setSelectedIds([selected.id, selected.id === right.id ? left.id : right.id]);
    else setSelectedIds([selected.id === left.id ? right.id : left.id, selected.id]);
  };

  return (
    <section aria-label="Text diff" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {messages.length > 2 && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        {['left', 'right'].map(side => (
          <label key={side} className="flex items-center gap-2 text-xs font-medium capitalize text-slate-600">
            {side}
            <select aria-label={`${side === 'left' ? 'Left' : 'Right'} comparison text`} value={side === 'left' ? left.id : right.id} onChange={event => selectMessage(side, event.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700">
              {messages.map(message => <option key={message.id} value={message.id}>{message.label}</option>)}
            </select>
          </label>
        ))}
      </div>}
      <TextComparison key={`${left.id}:${right.id}`} left={left} right={right} />
    </section>
  );
};

export default TextDiffView;
