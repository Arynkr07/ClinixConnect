import { cx } from '../../utils/helpers';

export default function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  description,
  action,
  className,
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-outline">{icon}</span>
      </div>
      <h3 className="font-headline text-headline-md font-bold text-on-surface mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-on-surface-variant text-body-md max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
