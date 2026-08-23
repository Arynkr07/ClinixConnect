import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/helpers';

export default function Modal({
  open = false,
  onClose,
  title,
  icon,
  size = 'md',
  showClose = true,
  children,
  footer,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cx(
          'relative w-full rounded-2xl bg-surface-container-lowest shadow-elevation3 overflow-hidden',
          sizes[size]
        )}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-3">
              {icon && (
                <span className="material-symbols-outlined text-primary">{icon}</span>
              )}
              <h3 className="font-headline text-headline-md font-bold text-primary">
                {title}
              </h3>
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        )}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
