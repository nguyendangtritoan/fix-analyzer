import React, { useMemo } from 'react';
import TagBadge from '../ui/TagBadge';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { groupify, flattenForDiff } from '../../utils/parsers';
import { getTagHighlightClass } from '../../utils/highlightUtils';

const DiffView = ({ messages = [], tags, enums, groups, groupIndentEnabled = true, highlightedTags, onTagClick }) => {
  const groupedMessages = useMemo(() => (
    messages.map(message => ({
      ...message,
      tree: groupify(message.data, groups),
    }))
  ), [messages, groups]);

  const flatMessages = useMemo(() => (
    groupedMessages.map(message => ({
      ...message,
      flat: flattenForDiff(message.tree),
    }))
  ), [groupedMessages]);

  const mappedMessages = useMemo(() => (
    flatMessages.map(message => ({
      ...message,
      map: new Map(message.flat.map(item => [item.key, item])),
    }))
  ), [flatMessages]);

  const unifiedList = useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    flatMessages.forEach(message => {
      message.flat.forEach(item => {
        if (!seenKeys.has(item.key)) {
          seenKeys.add(item.key);
          list.push(item.key);
        }
      });
    });

    return list;
  }, [flatMessages]);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800 text-slate-100">
          <tr>
            <th className="px-4 py-3 text-left w-20">Tag</th>
            <th className="px-4 py-3 text-left w-48">Field</th>
            {mappedMessages.map((message, index) => (
              <th
                key={message.id}
                className={`px-4 py-3 text-left min-w-[220px] ${index < mappedMessages.length - 1 ? 'border-r border-slate-600' : ''}`}
              >
                {message.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {unifiedList.map((key, idx) => {
             // Fallback for duplicates in unifiedList (shouldn't happen with new logic, but safe for React keys)
             const uniqueKey = `${key}_${idx}`;
             const rowItems = mappedMessages.map(message => message.map.get(key));
             const firstItem = rowItems.find(Boolean);
             const tag = firstItem?.tag;
             const depth = rowItems.find(item => item?.depth !== undefined)?.depth || 0;
             const isHeader = rowItems.some(item => item?.isHeader);

             const values = rowItems.map(item => item?.value);
             const presentValues = values.filter(value => value !== undefined);
             const isDiff = new Set(presentValues).size > 1;
             const isMissing = values.some(value => value === undefined);

             let rowClass = "hover:bg-slate-50";
             if (isDiff) rowClass = "bg-yellow-50 hover:bg-yellow-100";
             if (isMissing) rowClass = "bg-red-50 hover:bg-red-100";
             if (isHeader) rowClass = "bg-slate-100 font-bold text-slate-700";
             const highlightClass = getTagHighlightClass(tag, highlightedTags);
             if (highlightClass) {
                rowClass = isHeader ? `${highlightClass} font-bold text-slate-700` : highlightClass;
             }

             const padding = groupIndentEnabled ? { paddingLeft: `${depth * 20 + 16}px` } : undefined;

             return (
               <tr key={uniqueKey} className={`${rowClass} cursor-pointer transition-colors`} onClick={() => onTagClick?.(tag)}>
                 <td className="px-4 py-2 align-top" style={padding}>
                    <TagBadge tag={tag} />
                 </td>
                 <td className="px-4 py-2 align-top text-blue-600 font-medium">
                    {getTagName(tag, tags)} {isHeader && "(Group)"}
                 </td>
                 {mappedMessages.map((message, messageIndex) => {
                   const value = rowItems[messageIndex]?.value;
                   const isLastMessage = messageIndex === mappedMessages.length - 1;

                   return (
                     <td
                       key={message.id}
                       className={`px-4 py-2 font-mono align-top ${isLastMessage ? '' : 'border-r border-gray-200'} ${value === undefined ? 'italic text-gray-400' : ''}`}
                     >
                       {value !== undefined ? <RowValue tag={tag} value={value} enums={enums} /> : 'MISSING'}
                     </td>
                   );
                 })}
               </tr>
             );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default DiffView;
