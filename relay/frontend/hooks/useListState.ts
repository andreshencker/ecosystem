'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ListState {
  page: number;
  pageSize: number;
  search: string;
  /** Debounced version of search — safe to use in query params. */
  debouncedSearch: string;
  filters: Record<string, string>;
  hasActiveFilters: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (value: string) => void;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
}

interface UseListStateOptions {
  defaultPageSize?: number;
  /** Debounce delay in ms (default 400). */
  debounce?: number;
}

/**
 * Manages all state a list page needs: pagination, search, filters.
 *
 * - `search` is the raw input value (bind to the search field)
 * - `debouncedSearch` is delayed by `debounce` ms — use this in query params to
 *   avoid firing an API request on every keystroke
 * - `setSearch` / `setFilter` automatically reset page to 0
 * - `clearFilters` resets search, all filters, and page to 0
 *
 * Usage:
 *   const list = useListState({ defaultPageSize: 25 });
 *   const { data } = useUsers({ page: list.page + 1, limit: list.pageSize, search: list.debouncedSearch });
 *   return (
 *     <SearchToolbar
 *       search={list.search}
 *       onSearchChange={list.setSearch}
 *       hasActiveFilters={list.hasActiveFilters}
 *       onClearFilters={list.clearFilters}
 *     />
 *   );
 */
export function useListState({
  defaultPageSize = 25,
  debounce = 400,
}: UseListStateOptions = {}): ListState {
  const [page, setPageRaw] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearchRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Debounce search for API calls
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), debounce);
    return () => clearTimeout(id);
  }, [search, debounce]);

  const setPage = useCallback((p: number) => setPageRaw(p), []);

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPageRaw(0);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(0);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchRaw('');
    setDebouncedSearch('');
    setFilters({});
    setPageRaw(0);
  }, []);

  const hasActiveFilters =
    Boolean(search) || Object.values(filters).some((v) => Boolean(v));

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    filters,
    hasActiveFilters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    clearFilters,
  };
}
