import React from 'react';
import { getHumanValue } from '../../utils/fixUtils';

const RowValue = ({ tag, value, enums }) => {
  const { val, desc } = getHumanValue(tag, value, enums);
  return (
    <span>
      {val} {desc && <span className="text-gray-400 text-xs ml-1">({desc})</span>}
    </span>
  );
};
export default RowValue;