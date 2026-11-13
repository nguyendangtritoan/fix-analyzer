import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Minimize2, WrapText } from 'lucide-react';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { compareFixMessages } from '../../utils/fixDiff';
import { buildTextDiffSections } from '../../utils/textDiffFolding';
import { getTagHighlightClass } from '../../utils/highlightUtils';
import './DiffView.css';

const DiffView = ({ messages = [], tags, enums, groups, groupIndentEnabled = true, highlightedTags, onTagClick, highlightedValueTags = [], onValueClick }) => {
  const rows = useMemo(() => compareFixMessages(messages, groups), [messages, groups]);
  const [wrapLines, setWrapLines] = useState(true);
  const [collapseUnchanged, setCollapseUnchanged] = useState(false);
  const [expansions, setExpansions] = useState(null);
  const sections = useMemo(() => collapseUnchanged ? buildTextDiffSections(rows) : [], [rows, collapseUnchanged]);

  const toggleExpansion = key => {
    setExpansions(current => {
      const keys = new Set(current?.rows === rows ? current.keys : []);
      if (keys.has(key)) keys.delete(key);
      else keys.add(key);
      return { rows, keys };
    });
  };

  const renderCell = (cell, message, index) => {
    const { item, type, segments } = cell;
    const marker = type === 'added' ? '+' : type === 'removed' ? '−' : type === 'changed' ? '•' : '';
    const highlightClass = item ? getTagHighlightClass(item.tag, highlightedTags) : '';
    return (
      <td key={message.id} data-diff-type={type} className={`fix-diff-cell ${index ? 'fix-diff-divider' : ''} ${highlightClass || `fix-diff-${type}`}`}>
        {!item ? <span className="sr-only">Not present in {message.label}</span> : (
          <div className={`fix-diff-field ${item.isHeader || item.isInstanceHeader ? 'fix-diff-group' : ''}`} onClick={() => onTagClick?.(item.tag)}>
            <div className="fix-diff-gutter">
              {onTagClick ? <button type="button" className="fix-diff-tag" aria-label={`Highlight tag ${item.tag} in ${message.label}`} aria-pressed={highlightedTags?.some(entry => entry.tag === item.tag) || false} onClick={event => { event.stopPropagation(); onTagClick(item.tag); }}>{item.tag}</button> : item.tag}
              <span aria-hidden="true" className="fix-diff-marker">{marker}</span>
            </div>
            <div className="fix-diff-line" style={{ paddingLeft: 12 + (groupIndentEnabled ? item.depth * 12 : 0) }}>
              <span className="sr-only">{type === 'equal' ? '' : `${type} field: `}</span>
              <span className="fix-diff-name">{getTagName(item.tag, tags)}{item.isHeader ? ' (Group)' : item.isInstanceHeader ? ' (Instance)' : ''}</span>
              <span className="fix-diff-separator"> = </span>
              <RowValue
                tag={item.tag}
                value={item.value}
                enums={item.isInstanceHeader ? {} : enums}
                highlighted={highlightedValueTags.includes(item.tag)}
                onValueClick={onValueClick}
                valueContent={segments.map((segment, segmentIndex) => <span key={segmentIndex} className={segment.changed ? `fix-diff-edit fix-diff-edit-${type}` : undefined}>{segment.text.replaceAll('\u0001', '␁')}</span>)}
              />
            </div>
          </div>
        )}
      </td>
    );
  };

  const renderRow = row => <tr key={row.key}>{row.cells.map((cell, index) => renderCell(cell, messages[index], index))}</tr>;
  const renderSection = section => {
    if (section.type === 'row') return renderRow(section.row);
    const expanded = expansions?.rows === rows && expansions.keys.has(section.id);
    return <React.Fragment key={section.id}>
      <tr><td colSpan={messages.length} className="fix-diff-fold">
        <button type="button" aria-expanded={Boolean(expanded)} onClick={() => toggleExpansion(section.id)}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? 'Collapse' : 'Show'} {section.rows.length} unchanged rows
        </button>
      </td></tr>
      {expanded && section.rows.map(renderRow)}
    </React.Fragment>;
  };

  return (
    <section className="fix-diff" aria-label="FIX message comparison">
      <div className="fix-diff-toolbar">
        <span>Comparing with <strong>{messages[0]?.label}</strong></span>
        <div className="fix-diff-controls">
          <button type="button" aria-pressed={collapseUnchanged} onClick={() => { setCollapseUnchanged(value => !value); setExpansions(null); }}><Minimize2 size={14} />Collapse unchanged</button>
          <button type="button" aria-pressed={wrapLines} onClick={() => setWrapLines(value => !value)}><WrapText size={14} />Wrap lines</button>
        </div>
      </div>
      <div className="fix-diff-scroll" tabIndex={0} role="region" aria-label="Side-by-side FIX comparison">
        <table className={wrapLines ? 'fix-diff-table fix-diff-wrap' : 'fix-diff-table'} style={{ minWidth: messages.length * 340 }}>
          <thead><tr>{messages.map((message, index) => <th key={message.id} scope="col" style={{ width: `${100 / messages.length}%` }}>
            {message.label}{index === 0 && <span className="fix-diff-reference">Reference</span>}
          </th>)}</tr></thead>
          <tbody>{collapseUnchanged ? sections.map(renderSection) : rows.map(renderRow)}</tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-slate-500">No FIX fields found in these messages.</p>}
      </div>
      <div className="fix-diff-legend">
        <span><span className="fix-diff-edit fix-diff-edit-changed">•</span> Changed value</span>
        <span><span className="fix-diff-edit fix-diff-edit-removed">−</span> Removed field</span>
        <span><span className="fix-diff-edit fix-diff-edit-added">+</span> Added field</span>
        <span>Fields aligned by tag and repeating group</span>
      </div>
    </section>
  );
};

export default DiffView;
