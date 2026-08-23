import { cx } from '../../utils/helpers';

/**
 * VillageClusters - legend + village cluster cards for surveillance.
 * Props:
 *  - clusters: [{ village, status, cases, population, lastUpdated }]
 */
export default function VillageClusters({ clusters = [], className }) {
  return (
    <div className={cx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {clusters.map((c) => (
        <div
          key={c.village}
          className="bg-surface-container-lowest rounded-2xl p-6 card-shadow flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <h4 className="font-headline text-title-md font-bold text-on-surface">{c.village}</h4>
            <span
              className={cx(
                'text-label-md font-bold px-3 py-1 rounded-full',
                c.status === 'Active' && 'bg-error-container text-on-error-container',
                c.status === 'Elevated' && 'bg-secondary-container text-on-secondary-container',
                c.status === 'Low' && 'bg-primary-container text-on-primary-container'
              )}
            >
              {c.status}
            </span>
          </div>
          <div className="flex justify-between items-center text-body-lg">
            <span className="text-on-surface-variant">Active cases</span>
            <span className="font-headline font-bold text-error">{c.cases}</span>
          </div>
          <p className="text-label-sm text-on-surface-variant">
            Population {(c.population || 0).toLocaleString()} · Last updated {c.lastUpdated || 'Recently'}
          </p>
        </div>
      ))}
    </div>
  );
}
