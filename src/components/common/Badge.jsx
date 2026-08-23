import { cx } from '../../utils/helpers';

const VARIANT_STYLES = {
  primary: 'bg-primary-fixed text-on-primary-fixed-variant',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-fixed-dim text-tertiary',
  error: 'bg-error-container text-on-error-container',
  success: 'bg-primary-fixed text-on-primary-fixed-variant',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
  warning: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  critical: 'bg-error-container text-on-error-container border border-error/20',
};

export default function Badge({
  children,
  variant = 'neutral',
  icon,
  dot,
  dotColor = 'bg-primary',
  className,
  uppercase = false,
  ...props
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-label-md',
        uppercase && 'uppercase tracking-wider',
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cx('w-2 h-2 rounded-full', dotColor)} />}
      {icon && (
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      )}
      {children}
    </span>
  );
}
