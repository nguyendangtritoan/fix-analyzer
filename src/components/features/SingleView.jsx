import React, { useState, useMemo } from 'react';
import { Camera } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { groupify } from '../../utils/parsers';
import { indexMessageRows } from '../../utils/messageCapture';
import FixMessagePanel from './FixMessagePanel';
import MessageCapture from './MessageCapture';

const SingleView = ({ data, tags, enums, groups, ...props }) => {
  const [capture, setCapture] = useState(null);
  const { nodes, rows } = useMemo(() => {
    const displayData = !data?.length ? [] : groups && Object.keys(groups).length > 0 ? groupify(data, groups) : data;
    return indexMessageRows(displayData);
  }, [data, groups]);

  if (!data?.length) return <EmptyState />;

  const messageType = data.find(field => field.tag === 35)?.value;
  const messageName = enums?.[35]?.[messageType];
  const title = messageName
    ? messageName.replace(/([a-z\d])([A-Z])/g, '$1 $2').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
    : messageType ? `Message ${messageType}` : 'FIX Message';

  return (
    <>
      <FixMessagePanel
        {...props} nodes={nodes} title={title} tags={tags} enums={enums}
        action={<button type="button" className="fix-capture-open" onClick={() => setCapture({
          nodes, rows, title, tags, enums,
          groupIndentEnabled: props.groupIndentEnabled,
          highlightedTags: props.highlightedTags,
          highlightedValueTags: props.highlightedValueTags,
        })}><Camera size={14} aria-hidden="true" /> Capture image</button>}
      />
      {capture && <MessageCapture {...capture} onClose={() => setCapture(null)} />}
    </>
  );
};

export default SingleView;
