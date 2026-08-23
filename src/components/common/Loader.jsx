import { cx } from '../../utils/helpers';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

export default function Loader({ size = 'md', label, fullScreen = false, className }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[200] bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <Loader size={size} />
        {label && <p className="text-primary font-bold">{label}</p>}
      </div>
    );
  }

  return (
    <div className={cx('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cx(
          'rounded-full border-primary/20 border-t-primary animate-spin',
          SIZES[size]
        )}
      />
      {label && <p className="text-sm text-on-surface-variant">{label}</p>}
    </div>
  );
}
