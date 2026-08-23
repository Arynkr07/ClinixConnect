import { useMemo, useState } from 'react';

/**
 * usePagination - generic client-side pagination.
 * @param {Array} items - full dataset
 * @param {number} perPage - items per page
 */
export const usePagination = (items = [], perPage = 10) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, safePage, perPage]);

  const goToPage = (nextPage) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    setPage(target);
  };

  return {
    page: safePage,
    perPage,
    totalItems: items.length,
    totalPages,
    pageItems,
    goToPage,
    next: () => goToPage(safePage + 1),
    prev: () => goToPage(safePage - 1),
    first: () => goToPage(1),
    last: () => goToPage(totalPages),
  };
};
