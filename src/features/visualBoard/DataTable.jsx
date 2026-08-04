import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

const compareValues = (left, right) => {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return 1;
  if (right === null || right === undefined || right === '') return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true });
};

const DataTable = ({ columns, rows, rowKey = 'id', onRowClick, emptyMessage = 'No rows available.', fitContainer = false, scrollLabel }) => {
  const [sort, setSort] = useState({ key: columns[0]?.key, direction: 'asc' });
  const sortedRows = useMemo(() => {
    const column = columns.find(item => item.key === sort.key);
    if (!column) return rows;
    const nextRows = [...rows];
    nextRows.sort((left, right) => {
      const leftValue = column.sortValue ? column.sortValue(left) : left[column.key];
      const rightValue = column.sortValue ? column.sortValue(right) : right[column.key];
      return compareValues(leftValue, rightValue) * (sort.direction === 'asc' ? 1 : -1);
    });
    return nextRows;
  }, [columns, rows, sort]);

  const handleSort = key => setSort(current => (
    current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
  ));

  return (
    <div
      className={`overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-sm [contain:layout_paint] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${fitContainer ? 'xl:min-h-0 xl:flex-1' : ''}`}
      tabIndex={fitContainer ? 0 : undefined}
      aria-label={scrollLabel}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-slate-800 text-slate-200">
          <tr>
            {columns.map(column => (
              <th key={column.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
                <button type="button" onClick={() => handleSort(column.key)} className={`inline-flex items-center gap-1 hover:text-white ${column.align === 'right' ? 'justify-end' : ''}`}>
                  {column.label}
                  {sort.key === column.key ? (sort.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ChevronsUpDown size={11} className="opacity-40" />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedRows.map((row, index) => (
            <tr
              key={typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey] ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50'}
            >
              {columns.map(column => (
                <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-slate-600 ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {!sortedRows.length && <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400">{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
