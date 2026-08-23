import { useEffect, useRef } from 'react';

export const useClickOutside = (onOutside, enabled = true) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onOutside?.();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOutside, enabled]);

  return ref;
};
