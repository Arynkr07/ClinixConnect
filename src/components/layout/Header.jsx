import { cx } from '../../utils/helpers';

/**
 * Header - shared top app bar.
 * Props:
 *  - title, subtitle
 *  - right: React node (avatar, actions, etc.)
 *  - className
 */
export default function Header({ title, subtitle, right, className, children }) {
  return (
    <header
      className={cx(
        'flex justify-between items-center px-10 py-6 w-full bg-surface dark:bg-surface-dim shadow-sm sticky top-0 z-40',
        className
      )}
    >
      <div>
        {title && (
          <h2 className="font-headline text-headline-lg font-bold text-primary">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-on-surface-variant text-label-md">{subtitle}</p>
        )}
        {children}
      </div>
      {right && <div className="flex items-center gap-6">{right}</div>}
    </header>
  );
}
