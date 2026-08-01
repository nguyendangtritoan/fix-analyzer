export const paginateItems = (items, requestedPage, requestedPageSize) => {
  const pageSize = Math.max(1, Math.floor(Number(requestedPageSize)) || 1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(Number(requestedPage)) || 1));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);

  return {
    items: items.slice(startIndex, endIndex),
    page,
    pageCount,
    start: items.length ? startIndex + 1 : 0,
    end: endIndex,
  };
};
