import { cx } from '../../utils/helpers';

/**
 * KPIWidget - single headline metric card with trend + sparkline.
 * Props:
 *  - label, value, unit, icon, trend (+/- percentage)
 *  - color: key into the KPI palette
 */
const PALETTES = {
  primary: { bg: 'bg-primary', icon: 'bg-primary-container text-on-primary-container', ring: 'ring-primary/20' },
  secondary: { bg: 'bg-secondary', icon: 'bg-secondary-container text-on-secondary-container', ring: 'ring-secondary/20' },
  tertiary: { bg: 'bg-tertiary', icon: 'bg-tertiary-container text-on-tertiary-container', ring: 'ring-tertiary/20' },
  error: { bg: 'bg-error', icon: 'bg-error-container text-on-error-container', ring: 'ring-error/20' },
};

export default function KPIWidget({
  label,
  value,
  unit,
  icon = 'monitoring',
  trend,
  color = 'primary',
  sublabel,
  className,
}) {
  const palette = PALETTES[color] ?? PALETTES.primary;
  const positive = trend >= 0;

  return (
    <div className={cx('bg-surface-container-lowest rounded-2xl p-6 card-shadow flex flex-col gap-4', className)}>
      <div className="flex justify-between items-center">
        <div className={cx('flex items-center gap-3')}>
          <div className={cx('w-12 h-12 rounded-full flex items-center justify-center', palette.icon)}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <span className="text-on-surface-variant font-medium">{label}</span>
        </div>
        {trend !== undefined && (
          <span
            className={cx(
              'flex items-center gap-1 text-label-md font-bold px-2 py-1 rounded-full',
              positive ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'
            )}
          >
            <span className="material-symbols-outlined text-sm">
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-headline text-headline-2xl font-bold text-on-surface">{value}</span>
        {unit && <span className="text-body-lg text-on-surface-variant">{unit}</span>}
      </div>
      {sublabel && <p className="text-label-sm text-on-surface-variant">{sublabel}</p>}
    </div>
  );
}
