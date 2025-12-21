import React, { useMemo } from 'react';
import TagBadge from '../ui/TagBadge';
import EmptyState from '../ui/EmptyState';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { groupify } from '../../utils/parsers';

const SingleView = ({ data, tags, enums, groups }) => {
  if (!data || data.length === 0) return <EmptyState />;

  const groupedData = useMemo(() => groupify(data, groups), [data, groups]);

  const renderNodes = (nodes, depth = 0) => {
    return nodes.map((node, idx) => {
       if (node.isGroup) {
          return (
             <React.Fragment key={`${node.tag}-${idx}-group`}>
                <tr className="bg-slate-50">
                   <td className="px-6 py-2" style={{ paddingLeft: `${depth * 20 + 24}px` }}>
                      <TagBadge tag={node.tag} />
                   </td>
                   <td className="px-6 py-2 font-bold text-slate-700">
                      {getTagName(node.tag, tags)} (Group)
                   </td>
                   <td className="px-6 py-2 font-mono">{node.value} instances</td>
                </tr>
                {node.instances.map((inst, instIdx) => (
                   <React.Fragment key={`${node.tag}-${idx}-inst-${instIdx}`}>
                      <tr className="bg-slate-100/50">
                         <td colSpan={3} className="px-6 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ paddingLeft: `${(depth + 1) * 20 + 24}px` }}>
                            Instance {instIdx + 1}
                         </td>
                      </tr>
                      {renderNodes(inst, depth + 1)}
                   </React.Fragment>
                ))}
             </React.Fragment>
          );
       } else {
          return (
             <tr key={`${node.tag}-${idx}`} className="hover:bg-slate-50 transition-colors border-b border-gray-50">
                <td className="px-6 py-2 whitespace-nowrap" style={{ paddingLeft: `${depth * 20 + 24}px` }}>
                   <TagBadge tag={node.tag} />
                </td>
                <td className="px-6 py-2 whitespace-nowrap font-medium text-blue-600">
                   {getTagName(node.tag, tags)}
                </td>
                <td className="px-6 py-2 font-mono text-gray-800 break-all">
                   <RowValue tag={node.tag} value={node.value} enums={enums} />
                </td>
             </tr>
          );
       }
    });
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800 text-slate-100">
          <tr>
            <th className="px-6 py-3 text-left font-semibold uppercase w-48">Tag</th>
            <th className="px-6 py-3 text-left font-semibold uppercase w-64">Field Name</th>
            <th className="px-6 py-3 text-left font-semibold uppercase">Value</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {renderNodes(groupedData)}
        </tbody>
      </table>
    </div>
  );
};
export default SingleView;
