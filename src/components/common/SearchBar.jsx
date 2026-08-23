import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '../../utils/helpers';

const SearchBar = forwardRef(function SearchBar({ placeholder, className, containerClassName, onSearch, ...props }, ref) {
  const { t } = useTranslation();

  return (
    <div className={cx('relative group', containerClassName)}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
        search
      </span>
      <input
        ref={ref}
        type="text"
        placeholder={placeholder ?? t('common.searchPlaceholder')}
        onChange={(e) => onSearch?.(e.target.value)}
        className={cx(
          'w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-body-md text-on-surface caret-on-surface placeholder:text-outline/70 focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
          className
        )}
        {...props}
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
