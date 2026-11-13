import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CornerDownRight } from 'lucide-react';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { getTagHighlightClass } from '../../utils/highlightUtils';
import './SingleView.css';

const GROUP_COLORS = ['#fcd34d', '#6ee7b7', '#c4b5fd', '#67e8f9', '#fda4af', '#fdba74'];
const SESSION_TAGS = new Set([8, 9, 35, 34, 49, 50, 52, 56, 57, 43, 97, 122, 115, 116, 128, 129, 142, 143, 144, 145, 10]);

const getRowClass = (node, highlightedTags, instanceStart, onTagClick, capture) => {
  const highlight = getTagHighlightClass(node.tag, highlightedTags);
  return [
    highlight ? `${highlight} is-highlighted` : '',
    !node.isGroup && SESSION_TAGS.has(node.tag) ? 'fix-session-row' : '',
    node.isGroup ? 'fix-group-row' : '',
    instanceStart ? 'fix-instance-start' : '',
    onTagClick ? 'fix-clickable-row' : '',
    capture ? 'fix-capture-row' : '',
    capture?.range && node.rowIndex >= capture.range[0] && node.rowIndex <= capture.range[1] ? 'fix-capture-selected' : '',
  ].filter(Boolean).join(' ');
};

const TagCell = ({ tag, highlightedTags, onTagClick, capture, rowIndex }) => (
  <td className="fix-tag-cell">
    {capture ? (
      <button
        type="button"
        className="fix-tag-button"
        aria-label={`Select row ${rowIndex + 1}, tag ${tag}`}
        aria-pressed={capture.range ? rowIndex >= capture.range[0] && rowIndex <= capture.range[1] : false}
        onClick={event => { event.stopPropagation(); capture.onSelect(rowIndex); }}
      >{tag}</button>
    ) : onTagClick ? (
      <button
        type="button"
        className="fix-tag-button"
        aria-label={`Highlight tag ${tag}`}
        aria-pressed={highlightedTags?.some(item => item.tag === tag) || false}
        onClick={event => {
          event.stopPropagation();
          onTagClick(tag);
        }}
      >
        {tag}
      </button>
    ) : tag}
  </td>
);

const FieldName = ({ node, depth, tags, groupIndentEnabled, children, instanceLabel }) => (
  <td className="fix-name-cell">
    <div className="fix-field-name" style={{ paddingLeft: groupIndentEnabled ? depth * 12 : 0 }}>
      {instanceLabel && <span className="sr-only">{instanceLabel}. </span>}
      {children || (depth > 0 && groupIndentEnabled && <CornerDownRight size={12} aria-hidden="true" />)}
      <span>{getTagName(node.tag, tags)}</span>
    </div>
  </td>
);

const LeafRow = ({ node, depth, color, tags, enums, groupIndentEnabled, highlightedTags, onTagClick, highlightedValueTags, onValueClick, instanceStart, instanceLabel, capture }) => (
  <tr
    className={getRowClass(node, highlightedTags, instanceStart, onTagClick, capture)}
    data-row-index={node.rowIndex}
    style={color ? { '--fix-group-color': color } : undefined}
    onClick={() => capture ? capture.onSelect(node.rowIndex) : onTagClick?.(node.tag)}
  >
    <TagCell tag={node.tag} highlightedTags={highlightedTags} onTagClick={onTagClick} capture={capture} rowIndex={node.rowIndex} />
    <FieldName node={node} depth={depth} tags={tags} groupIndentEnabled={groupIndentEnabled} instanceLabel={instanceLabel} />
    <td className="fix-value-cell">
      <RowValue tag={node.tag} value={node.value} enums={enums} compact highlighted={highlightedValueTags.includes(node.tag)} onValueClick={onValueClick} />
    </td>
  </tr>
);

const GroupRow = ({ node, depth, colorIndex, tags, enums, groupIndentEnabled, highlightedTags, onTagClick, highlightedValueTags, onValueClick, instanceStart, instanceLabel, capture, range, forceExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const expanded = forceExpanded || isExpanded;
  const showRow = !range || (node.rowIndex >= range[0] && node.rowIndex <= range[1]);
  const name = getTagName(node.tag, tags);
  const color = GROUP_COLORS[colorIndex % GROUP_COLORS.length];

  return (
    <>
      {showRow && <tr
        className={getRowClass(node, highlightedTags, instanceStart, onTagClick, capture)}
        data-row-index={node.rowIndex}
        style={{ '--fix-group-color': color }}
        onClick={() => capture ? capture.onSelect(node.rowIndex) : onTagClick?.(node.tag)}
      >
        <TagCell tag={node.tag} highlightedTags={highlightedTags} onTagClick={onTagClick} capture={capture} rowIndex={node.rowIndex} />
        <FieldName node={node} depth={depth} tags={tags} groupIndentEnabled={groupIndentEnabled} instanceLabel={instanceLabel}>
          {forceExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <button
            type="button"
            className="fix-group-toggle"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name}`}
            aria-expanded={isExpanded}
            onClick={event => {
              event.stopPropagation();
              setIsExpanded(expanded => !expanded);
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>}
        </FieldName>
        <td className="fix-value-cell">
          <RowValue tag={node.tag} value={node.value} enums={enums} compact highlighted={highlightedValueTags.includes(node.tag)} onValueClick={onValueClick} />
          {!expanded && <span className="fix-raw-value"> (collapsed)</span>}
        </td>
      </tr>}
      {expanded && node.instances.map((instanceNodes, index) => (
        <NodeRenderer
          key={`group-${node.tag}-inst-${index}`}
          nodes={instanceNodes}
          depth={depth + 1}
          colorIndex={colorIndex}
          tags={tags}
          enums={enums}
          groupIndentEnabled={groupIndentEnabled}
          highlightedTags={highlightedTags}
          onTagClick={onTagClick}
          highlightedValueTags={highlightedValueTags}
          onValueClick={onValueClick}
          instanceStart={index > 0}
          instanceLabel={`Instance ${index + 1} of ${name}`}
          capture={capture}
          range={range}
          forceExpanded={forceExpanded}
        />
      ))}
    </>
  );
};

const NodeRenderer = ({ nodes, depth, colorIndex = -1, instanceStart, instanceLabel, range, ...props }) => {
  let groupIndex = colorIndex;
  return nodes.map((node, index) => {
    const rowProps = {
      ...props,
      range,
      node,
      depth,
      instanceStart: index === 0 && instanceStart,
      instanceLabel: index === 0 ? instanceLabel : undefined,
    };
    if (node.isGroup) {
      groupIndex += 1;
      return <GroupRow key={`${node.tag}-${index}`} {...rowProps} colorIndex={groupIndex} />;
    }
    if (range && (node.rowIndex < range[0] || node.rowIndex > range[1])) return null;
    return <LeafRow key={`${node.tag}-${index}`} {...rowProps} color={depth > 0 ? GROUP_COLORS[colorIndex % GROUP_COLORS.length] : undefined} />;
  });
};

const FixMessagePanel = ({ nodes, title, tags, enums, groupIndentEnabled = true, highlightedTags, onTagClick, highlightedValueTags = [], onValueClick, capture, range, forceExpanded = false, action, panelRef }) => {
  return (
    <div className="fix-message-panel" ref={panelRef}>
      <div className="fix-message-heading">
        <h4 className="fix-message-title">{title}</h4>
        {action}
      </div>
      <div className="fix-message-scroll" role="region" aria-label={`${title} fields`} tabIndex={0}>
        <table className="fix-message-table" aria-label={`${title} FIX message`}>
          <colgroup>
            <col className="fix-tag-column" />
            <col className="fix-name-column" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="fix-tag-cell">Tag</th>
              <th scope="col">Field Name</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            <NodeRenderer nodes={nodes} depth={0} tags={tags} enums={enums} groupIndentEnabled={groupIndentEnabled} highlightedTags={highlightedTags} onTagClick={onTagClick} highlightedValueTags={highlightedValueTags} onValueClick={onValueClick} capture={capture} range={range} forceExpanded={forceExpanded} />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FixMessagePanel;
