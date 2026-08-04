export const getMessagePathDisplay = record => {
  if (record.direction === 'incoming') {
    return {
      left: record.to,
      right: record.from,
      arrowDirection: 'left',
    };
  }

  return {
    left: record.from,
    right: record.to,
    arrowDirection: 'right',
  };
};
