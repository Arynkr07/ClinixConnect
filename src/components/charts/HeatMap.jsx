import { cx } from '../../utils/helpers';

const DEFAULT_COLORS = {
  0: 'bg-surface-container-highest',
  1: 'bg-primary-container',
  2: 'bg-secondary-container',
  3: 'bg-secondary-fixed',
  4: 'bg-primary',
};

/**
 * HeatMap - lightweight grid heat map without extra dependencies.
 * Props:
 *  - rows: array of { label, values: number[] } (values 0-4 intensity)
 *  - weekLabels: labels per column (defaults to S M T W T F S)
 */
export default function HeatMap({ rows, weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], colors = DEFAULT_COLORS, height = 'h-8' }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-1 pl-36">
          {weekLabels.map((day, i) => (
            <div key={i} className={cx('flex-1 text-center text-label-sm text-on-surface-variant font-bold', height)}>
              {day}
            </div>
          ))}
        </div>
        <div className="space-y-1 mt-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-1">
              <div className="w-32 pr-4 text-right text-label-sm font-semibold text-on-surface-variant truncate">
                {row.label}
              </div>
              {row.values.map((val, i) => (
                <div
                  key={i}
                  title={`${row.label} - ${weekLabels[i]}: ${val}`}
                  className={cx('flex-1 rounded-md', height, colors[val] ?? colors[0])}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
