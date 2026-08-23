import { cx } from '../../utils/helpers';

export default function Table({ columns = [], data = [], rowKey, onRowClick, emptyState }) {
  if (!data.length) {
    return emptyState ?? null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-primary text-on-primary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cx(
                  'px-6 py-4 font-headline font-semibold',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.width && `w-[${col.width}]`
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-on-surface">
          {data.map((row, index) => (
            <tr
              key={rowKey ? row[rowKey] : index}
              onClick={() => onRowClick?.(row)}
              className={cx(
                'border-b border-outline-variant hover:bg-surface-container-low transition-colors',
                index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cx(
                    'px-6 py-4',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.render ? col.render(row, row[rowKey]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
