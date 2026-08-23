import { cx } from '../../utils/helpers';

const BORDER_LEFT = {
  primary: 'border-l-primary',
  secondary: 'border-l-secondary',
  tertiary: 'border-l-tertiary',
  error: 'border-l-error',
  success: 'border-l-primary',
};

export default function Card({
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  padding = 'p-6',
  hover = false,
  borderLeft,
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cx(
        'bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20',
        hover && 'transition-transform hover:-translate-y-1',
        borderLeft && `border-l-4 ${BORDER_LEFT[borderLeft] ?? 'border-l-primary'}`,
        className
      )}
      {...props}
    >
      {(title || headerRight) && (
        <div className="flex justify-between items-center gap-4 px-6 pt-5">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="material-symbols-outlined text-primary">{icon}</span>
            )}
            <div>
              {title && <h3 className="font-headline text-headline-sm font-bold text-on-surface">{title}</h3>}
              {subtitle && <p className="text-sm text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          {headerRight}
        </div>
      )}
      <div className={cx(padding, (title || headerRight) && 'pt-4')}>{children}</div>
      {footer && <div className="border-t border-outline-variant px-6 py-3">{footer}</div>}
    </div>
  );
}
