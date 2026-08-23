import { forwardRef } from 'react';
import { cx } from '../../utils/helpers';

const Input = forwardRef(
  (
    {
      label,
      icon,
      iconPosition = 'left',
      helper,
      error,
      required,
      className,
      wrapperClassName,
      rightAdornment,
      ...props
    },
    ref
  ) => (
    <div className={cx('space-y-2', wrapperClassName)}>
      {label && (
        <label className="block text-label-lg font-semibold text-on-surface ml-1">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative group">
        {icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
            {icon}
          </span>
        )}
        {icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cx(
            'w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg custom-input text-body-md text-on-surface caret-on-surface focus:outline-none placeholder:text-outline/70',
            icon && iconPosition === 'left' && 'pl-12',
            (icon && iconPosition === 'right') || rightAdornment ? 'pr-12' : '',
            !icon && !rightAdornment && 'px-4',
            error && 'border-error',
            className
          )}
          {...props}
        />
        {rightAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightAdornment}</div>
        )}
      </div>
      {error && <p className="text-sm text-error ml-1">{error}</p>}
      {!error && helper && <p className="text-sm text-outline ml-1">{helper}</p>}
    </div>
  )
);

Input.displayName = 'Input';

export default Input;
