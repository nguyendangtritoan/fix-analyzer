import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import TagBadge from '../ui/TagBadge';
import EmptyState from '../ui/EmptyState';
import RowValue from '../ui/RowValue';
import { getTagName } from '../../utils/fixUtils';
import { groupify } from '../../utils/parsers';

// Deterministic colors for group depths to make visual scanning easier
const DEPTH_COLORS = [
  'bg-blue-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-cyan-400',
];

const getDepthColor = (depth) => DEPTH_COLORS[depth % DEPTH_COLORS.length];

const IndentationGuides = ({ depth }) => {
  if (depth <= 0) return null;
  
  return (
    <div className="absolute top-0 bottom-0 left-0 flex pointer-events-none select-none h-full">
      {Array.from({ length: depth }).map((_, i) => (
        <div
          key={i}
          className={`w-[2px] h-full ${getDepthColor(i)} opacity-30`}
          style={{ 
            left: `${(i * 24) + 11}px`, // Center the line within the 24px indentation slot
            position: 'absolute'
          }}
        />
      ))}
    </div>
  );
};

const LeafRow = ({ node, depth, tags, enums }) => (
  <tr className="hover:bg-slate-50 transition-colors border-b border-gray-50/50 relative group">
    <td className="px-4 py-2 whitespace-nowrap relative min-w-[200px]">
      <IndentationGuides depth={depth} />
      <div className="flex items-center relative z-10" style={{ paddingLeft: `${depth * 24}px` }}>
        <div className="w-5 mr-1" /> {/* Spacer to align with Group chevrons */}
        <TagBadge tag={node.tag} />
      </div>
    </td>
    <td className="px-6 py-2 whitespace-nowrap font-medium text-blue-600 text-sm relative">
       {getTagName(node.tag, tags)}
    </td>
    <td className="px-6 py-2 font-mono text-gray-800 break-all text-sm relative">
       <RowValue tag={node.tag} value={node.value} enums={enums} />
    </td>
  </tr>
);

const GroupRow = ({ node, depth, tags, enums }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // The color for THIS group's bar (which will appear in children)
  const groupColorClass = getDepthColor(depth);

  return (
    <>
      <tr 
        className={`cursor-pointer transition-colors border-b border-gray-100 hover:bg-slate-50 relative`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-4 py-2 whitespace-nowrap relative min-w-[200px]">
           <IndentationGuides depth={depth} />
           
           {/* Current Group Header Content */}
           <div className="flex items-center relative z-10" style={{ paddingLeft: `${depth * 24}px` }}>
              <button 
                className={`w-5 h-5 flex items-center justify-center mr-1 rounded hover:bg-slate-200 text-slate-500 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <TagBadge tag={node.tag} />
           </div>

           {/* Active Vertical Bar highlight for the group header itself */}
           <div 
             className={`absolute top-0 bottom-0 w-[3px] ${groupColorClass}`}
             style={{ left: `${(depth * 24) + 11}px` }} 
           />
        </td>
        <td className="px-6 py-2 font-bold text-slate-700 text-sm">
          {getTagName(node.tag, tags)} <span className="text-xs font-normal text-slate-400 ml-1">(Group)</span>
        </td>
        <td className="px-6 py-2 font-mono text-sm text-slate-600">
          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
             {node.value} {parseInt(node.value) === 1 ? 'Instance' : 'Instances'}
          </span>
          {!isExpanded && <span className="ml-2 text-slate-400 italic text-xs">- Collapsed</span>}
        </td>
      </tr>

      {isExpanded && node.instances.map((instanceNodes, index) => (
        <React.Fragment key={`group-${node.tag}-inst-${index}`}>
           {/* Instance Separator / Header */}
           <tr className="bg-slate-50/30">
             <td colSpan={3} className="px-4 py-1 relative">
                <IndentationGuides depth={depth + 1} />
                <div 
                  className="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  style={{ paddingLeft: `${(depth + 1) * 24 + 6}px` }}
                >
                   Instance {index + 1}
                </div>
             </td>
           </tr>
           {/* Render Children of this instance */}
           <NodeRenderer 
             nodes={instanceNodes} 
             depth={depth + 1} 
             tags={tags} 
             enums={enums} 
           />
        </React.Fragment>
      ))}
    </>
  );
};

const NodeRenderer = ({ nodes, depth, tags, enums }) => {
  return nodes.map((node, i) => {
    if (node.isGroup) {
      return (
        <GroupRow 
          key={`${node.tag}-${i}`} 
          node={node} 
          depth={depth} 
          tags={tags} 
          enums={enums} 
        />
      );
    }
    return (
      <LeafRow 
        key={`${node.tag}-${i}`} 
        node={node} 
        depth={depth} 
        tags={tags} 
        enums={enums} 
      />
    );
  });
};

const SingleView = ({ data, tags, enums, groups }) => {
  if (!data || data.length === 0) return <EmptyState />;

  const displayData = useMemo(() => {
    if (groups && Object.keys(groups).length > 0) {
      return groupify(data, groups);
    }
    return data;
  }, [data, groups]);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-800 text-slate-100">
          <tr>
            <th className="px-4 py-3 font-semibold uppercase w-64">Tag</th>
            <th className="px-6 py-3 font-semibold uppercase w-64">Field Name</th>
            <th className="px-6 py-3 font-semibold uppercase">Value</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          <NodeRenderer nodes={displayData} depth={0} tags={tags} enums={enums} />
        </tbody>
      </table>
    </div>
  );
};

export default SingleView;