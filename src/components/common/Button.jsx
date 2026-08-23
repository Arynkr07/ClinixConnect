import { cx } from '../../utils/helpers';

const VARIANTS = {
  primary:
    'bg-primary text-on-primary shadow-md hover:bg-primary-container active:scale-[0.98]',
  secondary:
    'bg-secondary-container text-on-secondary-container shadow-sm hover:brightness-105 active:scale-[0.98]',
  outline:
    'border border-outline text-primary hover:bg-primary-fixed-dim/40 active:scale-[0.98]',
  ghost:
    'text-primary hover:bg-primary-fixed/40 active:scale-[0.98]',
  danger:
    'bg-error text-on-error shadow-md hover:brightness-110 active:scale-[0.98]',
  tertiary:
    'bg-tertiary-container text-on-tertiary-container shadow-md hover:brightness-110 active:scale-[0.98]',
  subtle:
    'bg-surface-container text-on-surface-variant hover:bg-surface-container-high active:scale-[0.98]',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-label-md',
  md: 'px-5 py-2.5 text-label-lg',
  lg: 'px-8 py-3.5 text-label-lg',
  xl: 'px-8 py-4 text-body-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  children,
  className,
  ...props
}) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="w-5 h-5 rounded-full border-2 border-current/30 border-t-current animate-spin"
          aria-label="Loading"
        />
      ) : (
        icon &&
        iconPosition === 'left' && (
          <span className="material-symbols-outlined text-[1.25em]">{icon}</span>
        )
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[1.25em]">{icon}</span>
      )}
    </button>
  );
}
