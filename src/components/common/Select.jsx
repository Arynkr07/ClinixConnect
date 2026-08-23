import { forwardRef } from 'react';
import { cx } from '../../utils/helpers';

const Select = forwardRef(
  ({ label, icon, error, required, options, placeholder, className, children, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-label-lg font-semibold text-on-surface ml-1">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          className={cx(
            'w-full h-14 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface appearance-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer px-4',
            icon && 'pl-12',
            error && 'border-error',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ||
            options?.map((opt) => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
                {opt.label ?? opt}
              </option>
            ))}
        </select>
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          expand_more
        </span>
      </div>
      {error && <p className="text-sm text-error ml-1">{error}</p>}
    </div>
  )
);

Select.displayName = 'Select';

export default Select;
