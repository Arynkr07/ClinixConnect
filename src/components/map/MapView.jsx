import { cx } from '../../utils/helpers';

const LEVEL_STYLES = {
  low: 'bg-success text-on-success-container',
  medium: 'bg-warning text-on-warning-container',
  high: 'bg-error text-on-error-container',
};

/**
 * MapView - static village/geographic overview with cluster pins.
 * The prototypes draw an illustrative geographic map; we render a
 * stylised grid with positioned cluster pins so it stays dependency-free.
 * Props:
 *  - clusters: [{ id, label, level, lat: 0-100, lng: 0-100, cases }]
 */
export default function MapView({ clusters = [], title = 'Geographic overview' }) {
  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-outline-variant bg-map-terrain">
      <div className="absolute inset-0 map-grid" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-on-surface-variant/50 font-headline tracking-widest uppercase text-label-md">
          {title}
        </span>
      </div>

      {clusters.map((cluster) => (
        <div
          key={cluster.id}
          className="absolute -translate-x-1/2 -translate-y-full group cursor-pointer"
          style={{ left: `${cluster.lng}%`, top: `${cluster.lat}%` }}
        >
          <div
            className={cx(
              'w-4 h-4 rounded-full ring-4 ring-white shadow-lg animate-pulse-slow',
              LEVEL_STYLES[cluster.level] ?? LEVEL_STYLES.medium
            )}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-6 whitespace-nowrap bg-surface-container-lowest text-on-surface text-label-md font-bold px-3 py-1.5 rounded-lg shadow-elevation1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            {cluster.label} · {cluster.cases} cases
          </div>
        </div>
      ))}
    </div>
  );
}
