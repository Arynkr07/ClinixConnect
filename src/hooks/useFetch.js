import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useFetch - data fetching hook with loading / error state.
 * @param {Function} fetcher - async function returning data
 * @param {Array} deps - dependencies to trigger refetch
 * @param {Object} options - { enabled, initialData }
 */
export const useFetch = (fetcher, deps = [], options = {}) => {
  const { enabled = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  return { data, loading, error, setData, refetch };
};
