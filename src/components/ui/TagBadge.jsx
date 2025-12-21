import React from 'react';

const TagBadge = ({ tag }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-200 text-gray-800">
    {tag}
  </span>
);
export default TagBadge;
