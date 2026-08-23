import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cx } from '../../utils/helpers';

/**
 * Sidebar - shared navigation shell.
 * Props:
 *  - brand: { name, subtitle }
 *  - items: [{ label, to, icon, end }]
 *  - activeColor: 'primary-container' | 'secondary-container'
 *  - footer: React node
 */
export default function Sidebar({
  brand,
  items = [],
  activeClass = 'bg-primary-container text-on-primary-container',
  footer,
  width = 'w-72',
}) {
  const { t } = useTranslation();
  const resolvedBrand = brand || { name: t('app.name'), subtitle: t('nav.brandSubtitle') };

  return (
    <aside
      className={cx(
        'h-screen fixed left-0 top-0 bg-surface-container dark:bg-surface-container shadow-sm z-50 flex flex-col',
        width
      )}
    >
      <div className="h-full p-6 flex flex-col gap-4">
        <div className="mb-6 px-2">
          <h1 className="font-headline text-headline-md font-bold text-primary dark:text-primary-fixed">
            {resolvedBrand.name}
          </h1>
          {resolvedBrand.subtitle && (
            <p className="text-on-surface-variant text-label-md opacity-75">
              {resolvedBrand.subtitle}
            </p>
          )}
        </div>

        <nav className="space-y-2 flex-grow">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out',
                  isActive
                    ? cx(activeClass, 'font-bold')
                    : 'text-on-surface-variant hover:bg-surface-variant hover:translate-x-1'
                )
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </aside>
  );
}
