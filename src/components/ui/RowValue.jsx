import React from 'react';
import { getHumanValue } from '../../utils/fixUtils';
import './RowValue.css';

const RowValue = ({ tag, value, enums, compact = false, highlighted = false, onValueClick }) => {
  const { val, desc } = getHumanValue(tag, value, enums);
  const isCurrency = compact && (tag === 15 || (tag === 55 && /^[A-Z]{3}\/[A-Z]{3}$/.test(value)));
  const content = compact
    ? (desc ? <>{desc.replaceAll('_', ' ')} <span className="fix-raw-value">({val})</span></> : val)
    : <>
      {val} {desc && <span className="text-gray-400 text-xs ml-1">({desc})</span>}
    </>;
  const colorClass = highlighted ? 'fix-value-highlight' : isCurrency ? 'fix-currency-value' : '';

  if (!onValueClick) return <span className={colorClass || undefined}>{content}</span>;

  return (
    <button
      type="button"
      className={`fix-value-button ${colorClass}`}
      aria-label={`Highlight values for tag ${tag}: ${value}`}
      aria-pressed={highlighted}
      title={`${highlighted ? 'Remove' : 'Add'} purple highlight for tag ${tag} values`}
      onClick={event => {
        event.stopPropagation();
        // Selecting text for copying should not change either kind of highlight.
        if (event.detail > 0 && window.getSelection()?.toString()) return;
        onValueClick(tag);
      }}
    >
      {content}
    </button>
  );
};
export default RowValue;
