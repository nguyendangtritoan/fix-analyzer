import React, { useMemo } from 'react';
import TagBadge from '../ui/TagBadge';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { groupify, flattenForDiff } from '../../utils/parsers';

const DiffView = ({ data1, data2, tags, enums, groups }) => {
  // 1. Groupify both
  const tree1 = useMemo(() => groupify(data1, groups), [data1, groups]);
  const tree2 = useMemo(() => groupify(data2, groups), [data2, groups]);

  // 2. Flatten to path-based keys for alignment
  const flat1 = useMemo(() => flattenForDiff(tree1), [tree1]);
  const flat2 = useMemo(() => flattenForDiff(tree2), [tree2]);

  // 3. Align keys using Lookahead Heuristic
  const map1 = useMemo(() => flat1.reduce((acc, item) => ({ ...acc, [item.key]: item }), {}), [flat1]);
  const map2 = useMemo(() => flat2.reduce((acc, item) => ({ ...acc, [item.key]: item }), {}), [flat2]);
  
  const unifiedList = useMemo(() => {
    const list = [];
    let i = 0, j = 0;
    const len1 = flat1.length;
    const len2 = flat2.length;
    
    while(i < len1 || j < len2) {
       const k1 = i < len1 ? flat1[i].key : null;
       const k2 = j < len2 ? flat2[j].key : null;
       
       if (k1 === k2) {
          // Perfect match
          list.push(k1);
          i++; j++;
       } else {
          // Mismatch: We need to decide whether to advance I, J, or both.
          // Strategy: Look ahead to see which key allows us to re-sync sooner.
          
          // Find k1's next occurrence in list 2
          let k1_in_2 = -1;
          if (k1) {
             for(let x = j; x < len2; x++) {
                if (flat2[x].key === k1) { k1_in_2 = x; break; }
             }
          }
          
          // Find k2's next occurrence in list 1
          let k2_in_1 = -1;
          if (k2) {
             for(let y = i; y < len1; y++) {
                if (flat1[y].key === k2) { k2_in_1 = y; break; }
             }
          }

          if (k1_in_2 === -1 && k2_in_1 === -1) {
             // Neither exists in the other list (Both are unique/modified).
             // Consuming k1 first (arbitrary choice, but consistent).
             if (k1) { list.push(k1); i++; }
             else if (k2) { list.push(k2); j++; }
          } else if (k1_in_2 === -1) {
             // k1 is unique to List 1 (Deletion)
             list.push(k1);
             i++;
          } else if (k2_in_1 === -1) {
             // k2 is unique to List 2 (Insertion)
             list.push(k2);
             j++;
          } else {
             // Both exist later. Which is closer?
             const dist1 = k1_in_2 - j; // Cost to skip in List 2 to find k1
             const dist2 = k2_in_1 - i; // Cost to skip in List 1 to find k2
             
             if (dist1 < dist2) {
                // k1 is closer in List 2. This implies k2 is an insertion in List 2.
                // Consume k2 to catch up.
                list.push(k2);
                j++;
             } else {
                // k2 is closer in List 1. This implies k1 is a deletion in List 1.
                // Consume k1 to catch up.
                list.push(k1);
                i++;
             }
          }
       }
    }
    return list;
  }, [flat1, flat2]);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800 text-slate-100">
          <tr>
            <th className="px-4 py-3 text-left w-20">Tag</th>
            <th className="px-4 py-3 text-left w-48">Field</th>
            <th className="px-4 py-3 text-left w-1/3 border-r border-slate-600">Message 1</th>
            <th className="px-4 py-3 text-left w-1/3">Message 2</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {unifiedList.map((key, idx) => {
             // Fallback for duplicates in unifiedList (shouldn't happen with new logic, but safe for React keys)
             const uniqueKey = `${key}_${idx}`;
             const item1 = map1[key];
             const item2 = map2[key];
             const tag = item1?.tag || item2?.tag;
             const depth = item1?.depth || item2?.depth || 0;
             const isHeader = item1?.isHeader || item2?.isHeader;

             const v1 = item1?.value;
             const v2 = item2?.value;
             const isDiff = v1 !== v2;
             const isMissing = v1 === undefined || v2 === undefined;
             
             let rowClass = "hover:bg-slate-50";
             if (isDiff) rowClass = "bg-yellow-50 hover:bg-yellow-100";
             if (isMissing) rowClass = "bg-red-50 hover:bg-red-100";
             if (isHeader) rowClass = "bg-slate-100 font-bold text-slate-700";

             const padding = { paddingLeft: `${depth * 20 + 16}px` };

             return (
               <tr key={uniqueKey} className={rowClass}>
                 <td className="px-4 py-2 align-top" style={padding}>
                    <TagBadge tag={tag} />
                 </td>
                 <td className="px-4 py-2 align-top text-blue-600 font-medium">
                    {getTagName(tag, tags)} {isHeader && "(Group)"}
                 </td>
                 <td className={`px-4 py-2 font-mono align-top border-r border-gray-200 ${!v1 ? 'italic text-gray-400' : ''}`}>
                    {v1 !== undefined ? <RowValue tag={tag} value={v1} enums={enums} /> : 'MISSING'}
                 </td>
                 <td className={`px-4 py-2 font-mono align-top ${!v2 ? 'italic text-gray-400' : ''}`}>
                    {v2 !== undefined ? <RowValue tag={tag} value={v2} enums={enums} /> : 'MISSING'}
                 </td>
               </tr>
             );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default DiffView;